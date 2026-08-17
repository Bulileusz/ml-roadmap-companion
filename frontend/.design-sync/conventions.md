# ml-roadmap-companion — konwencje

Ciemny motyw **„oś"** do codziennej nauki ML. Dwie zasady nadrzędne:

1. **Kolor niesie znaczenie.** Płótno jest neutralne i ciemne, a jedyną rzeczą,
   która świeci, jest treść i postęp.
2. **Hierarchię niesie typografia i włosowa kreska, nie ramka i cień.** Jedna
   wąska kolumna treści (720 px) zamiast siatki kafelków, oś czasu zamiast
   paneli obok siebie.

Wcześniejszy kierunek — „premium edu" z siatką kart, cieniami i pierścieniami
postępu — został świadomie zastąpiony. Tokeny głębi (`shadow-raise`,
`rounded-card`) zostały w arkuszu, bo dalej niosą **pojedynczą** powierzchnię:
dialog, wyróżniony blok. Nie są sposobem układania strony. Projektując nowy
ekran: gęsta lista, kreska zamiast ramki, kolor fazy jako lewa krawędź albo
kropka.

## Ciemne płótno jest wymagane

Arkusz ustawia `background-color: var(--color-canvas)` i `color: var(--color-ink)`
na `<body>` w `@layer base`. Każdy komponent zakłada to tło — na jasnym tle
`text-ink` (prawie biel) znika. Budując cokolwiek własnego, maluj powierzchnie
tokenami, nie domyślnym tłem przeglądarki.

## Konteksty: kiedy potrzebny jest `DesignPreviewProvider`

Dwa komponenty czytają kontekst i **bez owinięcia rzucają błędem albo renderują
się pusto**:

| Komponent | Czego wymaga |
|---|---|
| `AppShell` | routera (`NavLink`, `useNavigate`), rejestru skrótów oraz klienta TanStack Query — renderuje `UnlockToast`, który odpytuje o osiągnięcia |
| `HotkeyCheatsheet` | rejestru skrótów — bez niego renderuje pusty dialog |

Reszta (`Card`, `Button`, `Badge`, `Chip`, `ProgressBar`, `AnimatedNumber`,
`EmptyState`, `AllDone`, `Skeleton`, `Kbd`, `StreakFlame`, `LevelBar`) to czyste
komponenty prezentacyjne — biorą wszystko przez props i działają bez owinięcia.

`DesignPreviewProvider` (eksport bundla) dostarcza wszystkie konteksty naraz:
`MotionConfig` → `QueryClientProvider` → `MemoryRouter` → `HotkeysProvider`.

```jsx
<DesignPreviewProvider>
  <AppShell />
</DesignPreviewProvider>
```

Uwaga: router jest pamięciowy, a cache zapytań pusty. Skróty do
`HotkeyCheatsheet` rejestruje się hookiem `useHotkeys` (też eksport bundla).

## Idiom stylowania: Tailwind v4 na tokenach `@theme`

Bez CSS modules i bez styled-components. Układ własny piszesz klasami Tailwinda,
a kolory i kształty bierzesz z tokenów systemu.

**Klasy dostępne w wysłanym arkuszu** (to pełna lista — patrz ostrzeżenie niżej):

| Rodzina | Klasy |
|---|---|
| Powierzchnie | `bg-canvas` `bg-surface` `bg-raised` `bg-line-strong` `bg-info` `bg-success/8` |
| Tekst | `text-ink` `text-ink-muted` `text-ink-faint` `text-success` `text-danger` `text-canvas` |
| Kreski | `border-line` `border-line-strong` `border-success/25` `border-danger/30` |
| Typografia | `font-display` (Plus Jakarta Sans — nagłówki i liczby) `font-sans` (Inter — treść) `font-mono` (JetBrains Mono — tylko kod) |
| Kształt i głębia | `rounded-card` `rounded-control` `shadow-raise` `shadow-lift` |
| Własne | `phase-wash` (radialna poświata w barwie fazy) `tabular` (cyfry o stałej szerokości) |

**Ostrzeżenie — to nie jest pełny Tailwind.** Arkusz zawiera wyłącznie klasy
faktycznie użyte w tym repo, i to dokładnie w użytych wariantach: jest
`bg-success/8`, ale nie ma `bg-success`. `text-info`, `text-warn`, `text-ember`
i `bg-danger` **nie mają reguł** i nie zadziałają. Dla wszystkiego spoza tabeli
używaj zmiennej CSS, która zawsze jest zdefiniowana:

```jsx
<span style={{ color: 'var(--color-ember)' }}>seria</span>
```

Zdefiniowane tokeny koloru: `--color-canvas` `--color-surface` `--color-raised`
`--color-line` `--color-line-strong` `--color-ink` `--color-ink-muted`
`--color-ink-faint` `--color-success` `--color-danger` `--color-warn`
`--color-info` `--color-ember` `--color-ember-bright`. Do tego `--font-display`
`--font-sans` `--font-mono` oraz `--radius-card` `--radius-control`.

## Barwa fazy: `--phase`, nigdy klasa per faza

Każda faza roadmapy ma własną barwę. Nie ma i nie może być klasy Tailwinda per
faza (fazy pochodzą z bazy). Ustawiasz zmienną `--phase` na rodzicu, a `Badge`,
`ProgressBar` i `phase-wash` biorą ją domyślnie:

```jsx
<div style={{ '--phase': '#a855f7' }} className="border-line border-b py-4">
  <div className="flex items-baseline gap-3">
    <span className="h-2 w-2 rounded-full" style={{ background: 'var(--phase)' }} />
    <p className="font-display text-ink font-bold">Uczenie nadzorowane</p>
    <span className="text-ink-faint tabular ml-auto text-sm">3 z 6</span>
  </div>
  <ProgressBar pct={58} className="mt-3" />
</div>
```

Paleta faz: `0` `#22d3ee`, `1` `#6366f1`, `2` `#a855f7`, `2b` `#ec4899`,
`3` `#fb923c`, `4` `#34d399`.

**Ciepłe barwy są zarezerwowane dla dorobku** (`--color-ember` — seria, XP),
nigdy dla zwykłej akcji. Akcje są chłodne (`--color-info`).

## Gdzie leży prawda

Zanim zaczniesz stylować, przeczytaj `_ds/<folder>/styles.css` i jego importy
(`_ds_bundle.css` niesie tokeny w `@layer theme` oraz komplet reguł). API każdego
komponentu jest w `components/general/<Nazwa>/<Nazwa>.d.ts`, a opis użycia
w `<Nazwa>.prompt.md`.

## Przykład

Lista faz w idiomie „osi" — kreska zamiast karty, kolor jako krawędź:

```jsx
<DesignPreviewProvider>
  <div className="mx-auto w-full max-w-[45rem] px-6 py-10">
    <h1 className="font-display text-ink mb-8 text-2xl font-extrabold">Mapa</h1>
    {[
      { code: '0', name: 'Python odświeżenie', color: '#22d3ee', done: 4, all: 4 },
      { code: '1', name: 'Matematyka stosowana', color: '#6366f1', done: 1, all: 3 },
      { code: '2', name: 'Klasyczne ML od zera', color: '#a855f7', done: 0, all: 6 },
    ].map((phase) => (
      <div
        key={phase.code}
        style={{ '--phase': phase.color }}
        className="border-line border-l-2 border-b py-4 pl-4"
      >
        <div className="flex items-baseline gap-3">
          <Badge>Faza {phase.code}</Badge>
          <p className="font-display text-ink font-bold">{phase.name}</p>
          <span className="text-ink-faint tabular ml-auto text-sm">
            {phase.done} z {phase.all}
          </span>
        </div>
        <ProgressBar pct={(phase.done / phase.all) * 100} className="mt-3" />
      </div>
    ))}
  </div>
</DesignPreviewProvider>
```
