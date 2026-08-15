# design-sync — notatki repozytoryjne

Import systemu designu z `frontend/` do claude.ai/design. Pierwszy przebieg:
2026-08-15. Cel: projekt „ML Roadmap Companion", `projectId` w `config.json`.
Wysłano 111 plików, 17/17 komponentów zweryfikowanych.

## Rzecz najważniejsza: to jest aplikacja, nie biblioteka

`package.json` jest `private`, bez `exports`/`main`/`module`, a `dist/` to
zbudowana strona (index.html + assets), nie dist biblioteki. Z tego wynika prawie
każdy kruczek poniżej.

- **Zawsze przekazuj `--entry ./.design-sync/entry.ts`.** Bez tego konwerter
  szuka `node_modules/ml-roadmap-frontend/package.json` i wywala się na ENOENT.
  Z `--entry` wchodzi tryb, w którym `PKG_DIR` wychodzi z przejścia w górę do
  `frontend/package.json`, czyli tam, gdzie trzeba.
- **Nie da się użyć automatycznej syntezy wejścia z `src/`.** Wciągnęłaby
  `main.tsx`, który przy imporcie montuje aplikację i rzuca „Brak #root
  w index.html". `entry.ts` jest pisany ręcznie i wymienia moduły jawnie.
- **`componentSrcMap` wylicza wszystkie 17 komponentów.** To nietypowe (pole jest
  z zasady rzadkie), ale bez zbudowanego drzewa `.d.ts` biblioteki nie ma skąd
  wziąć listy komponentów. Dodając komponent do `src/components/`, dopisz go tu
  **i** do `entry.ts`.

## Kolejność: `build-inputs.mjs` przed każdym buildem konwertera

`node .design-sync/build-inputs.mjs` robi trzy rzeczy, wszystkie do
gitignorowanego `.cache/`:

1. `tsc -p .design-sync/tsconfig.types.json` → drzewo `.d.ts`,
2. mostek `.cache/types/index.d.ts` (przepisuje `entry.ts`, zamieniając alias
   `@/` na ścieżki względne — tsc zostawia alias w `.d.ts` nietknięty),
3. arkusz Tailwinda → `.cache/compiled.css`.

To jest `cfg.buildCmd`, więc sterownik re-syncu odpali go sam.

**Cicha awaria, na którą trzeba uważać:** pole `"types"` w `frontend/package.json`
wskazuje na ten mostek. Jeśli ktoś je usunie, konwerter **dalej wyjdzie z kodem 0**,
tylko każdy `<Nazwa>.d.ts` dostanie pusty kontrakt `[key: string]: unknown` — czyli
agent projektowy straci całe API propsów i nikt tego nie zauważy. Po buildzie
warto zerknąć, czy `ds-bundle/components/general/Button/Button.d.ts` ma
`variant?: "primary" | ...`.

## Tailwind: wysyłamy tylko klasy faktycznie użyte

Arkusz powstaje z `src/styles/theme.css` przez `@tailwindcss/node` i zawiera
wyłącznie klasy znalezione w skanowanych źródłach. Skanowane są `../src`,
`./previews` **oraz osobno `./preview-provider.tsx`** — ten ostatni leży poza
dwoma pierwszymi, a to on maluje ciemne płótno. Kiedyś go brakowało i wszystkie
karty wyszły na białym tle, z niewidocznym tekstem.

Konsekwencja dla `conventions.md`: lista klas w nagłówku jest **zamknięta** i była
weryfikowana grepem po `_ds_bundle.css`. Warianty liczą się osobno — jest
`bg-success/8`, nie ma `bg-success`. Po każdej większej zmianie w komponentach
przewaliduj tę listę.

## `preview-provider.tsx` — trzy rzeczy, z których każda jest konieczna

1. **Konteksty**: `MotionConfig` → `QueryClientProvider` → `MemoryRouter` →
   `HotkeysProvider`. Bez nich `PhaseCard` wywala się na `useQuery`, a `AppShell`
   i `SessionHero` na `useNavigate`.
2. **`skipAnimations`** na `MotionConfig`. Harness robi zrzut zaraz po
   `networkidle`, w połowie animacji wejścia — komponenty wjeżdżające z
   `opacity: 0` (`SessionHero`, `StatCard`, `AllDone`) fotografowały się jako
   puste prostokąty. To oficjalna opcja Motion pod testy wizualne.
3. **Ciemne płótno** na kontenerze, mimo że `theme.css` ustawia je na `<body>`.
   Karta podglądu ma zaszyte `body{background:#fff}`, które tę regułę przykrywa.
   W realnych projektach problem nie występuje — tam działa `@layer base`.

## Podglądy: importuj z `'ml-roadmap-frontend'`, nigdy przez `@/`

Specyfikator `'ml-roadmap-frontend'` jest podmieniany na `window.MLRoadmap`, czyli
na **ten sam** moduł, który siedzi w bundlu. Import przez alias `@/` każe
esbuildowi wbudować **drugą kopię** modułu do samego podglądu — z własnymi
instancjami kontekstów. Tak właśnie `HotkeyCheatsheet` renderował się z pustą
listą skrótów: czytał inny rejestr niż ten, do którego pisał dostawca. Dlatego
`entry.ts` eksportuje też `useHotkeys` i `useHotkeyList` (nazwy na `use*` nie
trafiają na listę kart, więc nie tworzą pustych podglądów).

## Chromium na WSL2 — brakuje `libasound.so.2`

Ani `chrome-headless-shell`, ani pełny chromium nie wystartują. Nie trzeba
`sudo`: biblioteka jest wypakowana lokalnie do `.ds-sync/syslibs/` (gitignorowane,
**do odtworzenia po świeżym klonie**):

```sh
mkdir -p .ds-sync/syslibs && cd .ds-sync/syslibs \
  && apt-get download libasound2t64 && dpkg -x *.deb .
```

Każde polecenie robiące zrzuty (`package-validate.mjs`, `package-capture.mjs`,
`resync.mjs`) uruchamiaj z:

```sh
export LD_LIBRARY_PATH="$PWD/.ds-sync/syslibs/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH"
```

Objaw przy braku: `[RENDER_SKIPPED] … Target page, context or browser has been closed`.

## Drobiazgi harnessu

- Zmiana `cfg.overrides` wymaga **pełnego** `package-build.mjs`; sam
  `preview-rebuild.mjs` odbija się od `[CONFIG_STALE]`.
- Pełny `package-build.mjs` czyści `ds-bundle/_screenshots/`, więc po nim trzeba
  puścić `package-capture.mjs` od nowa. Oceny w `.design-sync/.cache/review/`
  przeżywają — na koniec przebiegu wszystkie 17 raportowało `carried forward`.
- `HotkeyCheatsheet` i `AppShell` mają `cardMode: single` (dialog przez portal /
  pełnoekranowa powłoka), `StatCard` ma `cardMode: column` (rząd czterech
  kafelków nie mieści się w komórce siatki).

## Znane ostrzeżenia renderowania

Brak. Ostatnia walidacja wyszła całkiem czysta (`✓ bundle is complete`, bez
ostrzeżeń), 17/17 kart renderuje się poprawnie. **Każde ostrzeżenie przy
kolejnym syncu jest więc nowe** i trzeba mu się przyjrzeć.

## Ryzyka przy kolejnym syncu

- **`.ds-sync/syslibs` znika po klonie.** Bez niego nie ma żadnej weryfikacji
  wizualnej. Odtwórz zanim uznasz `[RENDER_SKIPPED]` za problem konfiguracji.
- **Pole `"types"` w `package.json` to cichy punkt awarii** (patrz wyżej). Jest to
  jedyna rzecz, którą ten import dopisał do plików aplikacji.
- **`fixtures.ts` to wklejone dane domenowe.** Zmiana `backend/api/schemas.py`
  plus `make api-types` może je rozjechać z typami. Awaria będzie głośna — `tsc`
  w kroku 1 `build-inputs.mjs` przestanie przechodzić.
- **`conventions.md` wymienia konkretne klasy i tokeny.** Przy zmianie palety albo
  usunięciu użycia klasy z repo lista przestaje być prawdziwa, a agent
  projektowy pisze wtedy style, które się nie stosują. Weryfikuj ją grepem po
  `ds-bundle/_ds_bundle.css`, nie „na oko".
- **Barwy faz są zduplikowane** w `src/lib/phases.ts` i w `conventions.md`.
  Dodanie fazy w aplikacji wymaga dopisania jej w nagłówku ręcznie.
- **Kolejny sync idzie ścieżką atomową**, bo projekt nie jest już pusty:
  `resync.mjs --remote` z pobraną kotwicą, upload jednym przejściem na końcu.
  Kasowania bierz dosłownie z `upload.deletePaths` w `.sync-diff.json`, nigdy
  z ręki.
