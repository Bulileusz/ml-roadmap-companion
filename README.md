# ML Roadmap Companion

Lokalna, osobista apka towarzysząca codziennej nauce ML (przebranżowienie
z budownictwa do IT). Jeden użytkownik, bez publikacji, bez auth, dane w SQLite
na dysku.

Monorepo: **`backend/`** — FastAPI nad surowym `sqlite3`, **`frontend/`** —
React 19 + Vite + Tailwind. Do wersji 2.0 apka chodziła na Streamlicie; domena
przeżyła migrację nietknięta, wymieniona została powłoka.

## Uruchomienie

```
make setup      # uv venv + zależności backendu i frontendu
make dev        # uvicorn :8000 + Vite :5173 (do pracy nad kodem)
make run        # build frontu i cała apka na :8000 (do codziennego używania)
```

`make help` wypisuje wszystkie komendy. Baza (`data/roadmap.db`) tworzy się,
migruje i seeduje sama przy pierwszym starcie; obok pojawiają się pliki WAL —
to normalne, są ignorowane przez git.

Zależności Pythona instaluje **uv**, nie pip: to środowisko nie ma ani `pip`,
ani `ensurepip`. Manifest zostaje zwykłym `requirements.txt`, bez `pyproject.toml`.

## Testy

```
make test       # pytest + vitest
make lint       # ruff, tsc, eslint
```

## Moduły

- **Roadmapa** — postęp przez fazy (0, 1, 2, 2b, 3, 4): edytowalne zadania,
  notatki, pierścienie postępu. Każda faza ma własną barwę, która wraca potem
  wszędzie, gdzie o niej mowa.
- **Fiszki** — spaced repetition Leitnera (5 pudełek, interwały 1/2/4/7/14 dni).
- **Bank pytań** — pytania koncepcyjne i kodowe per faza, z odpowiedzią do
  odsłonięcia, pełnym logiem podejść i skumulowanym wskaźnikiem samodzielności.
- **Dziennik** — każde odhaczone zadanie, powtórka, zapoznanie i podejście trafia
  do `activity_log`. Stąd seria dni, heatmapa i historia.
- **Zasoby** — materiały podpięte do faz (książka, kurs, wideo, dokumentacja,
  artykuł) ze statusem przerobienia. Roadmapa mówi **co**, ta strona **z czego**.
- **Tryb nauki** — przebieg zapoznawczy dla nowych fiszek i notatka „moimi
  słowami". Szczegóły niżej.
- **Sesja dnia** — jeden przycisk zamiast pięciu stron do odwiedzenia z pamięci.

## Sesja dnia

Plan układa się sam: do 5 fiszek zapoznawczych → do 20 powtórek → 3 pytania
z fazy, w której faktycznie jesteś → następne zadanie roadmapy jako drogowskaz.
Kolejność odbija to, jak działa nauka: najpierw pierwszy kontakt z materiałem
bez oceniania, potem wyciąganie z pamięci, na końcu pytania wymagające złożenia
kilku rzeczy razem.

Plan jest **wyliczany, nie zapisywany** (`GET /api/session/today`). Każdy krok
odkłada się osobnym endpointem, więc sesja przerwana w połowie nie gubi zrobionej
pracy i nie zostawia stanu do posprzątania — nie ma czego wznawiać.

## Tryb nauki: zapoznanie i własne słowa

Fiszka zaimportowana z `content/` trafia najpierw do **kolejki zapoznawczej**
(`flashcards.learned_at IS NULL`): przód i tył pokazane razem, bez oceniania,
przycisk „rozumiem, dalej". Dopiero potem wchodzi do pudełka 1 i normalnej
rotacji, z terminem nazajutrz — dokładnie jak po udanej powtórce.

Powód: pierwsze spotkanie z kartą, której nigdy nie widziałeś, kończyło się
kliknięciem „nie umiałem", czyli zapisaniem porażki za to, że coś widzisz po raz
pierwszy. Fiszka **dopisana ręcznie** przebieg pomija — właśnie ją napisałeś,
więc widziałeś obie strony.

Kolejka zapoznawcza zastąpiła dawne `NEW_CARDS_PER_DAY` (rozkładanie importu na
dni). Chroniło ono przed lawiną powtórek po wgraniu startera, ale to samo robi
teraz kolejka, i robi to lepiej: karta nie jest wymagalna, dopóki jej nie
poznasz, niezależnie od tego, ile ich wgrałeś. Limit na jedną sesję siedzi
w `services/session.py`.

Pole **„moimi słowami"** (`flashcards.own_note`) jest do wypełnienia po
odsłonięciu tyłu. Wyjaśnienie czegoś samemu sobie utrwala mocniej niż
przeczytanie cudzego opisu. Import z `content/` nigdy tej kolumny nie dotyka.

## XP, poziomy i osiągnięcia

Liczone w całości z `activity_log`, bez ani jednej nowej tabeli
(`backend/services/gamification.py`). XP jest funkcją czystą historii, a nie
licznikiem, który da się rozjechać z rzeczywistością: przywrócenie kopii
zapasowej odtwarza też dorobek, a błąd w formule naprawia się jej poprawieniem,
nie migracją danych.

Odznaczenie zadania odejmuje dokładnie tyle, ile dodało odhaczenie — klikanie
w tę i we tę nie hoduje XP. Podejście do pytania płaci zawsze, z premią wyłącznie
za samodzielność: gdyby „sprawdziłem rozwiązanie" nie dawało nic, opłacałoby się
go unikać, a wtedy wskaźnik samodzielności przestaje cokolwiek mierzyć.

Osiągnięcia też nie mają stanu po stronie serwera — API zwraca aktualny zbiór,
a front porównuje go z zapamiętanym poprzednim i na różnicy odpala celebrację.
Confetti jest racjonowane: domknięta faza, milestone serii, fiszka doprowadzona
do ostatniego pudełka, nowy poziom, zamknięta sesja. Nie po każdej karcie —
akcent użyty wszędzie przestaje cokolwiek znaczyć.

## Materiały do nauki (`content/`)

Fiszki, pytania i materiały trzymane są **w repo**, w katalogu `content/` — plik
Markdown na fazę, nagłówek `##` to przód fiszki (albo treść pytania, albo tytuł
materiału), tekst pod spodem to tył. Aplikacja wczytuje ten katalog przy każdym
starcie, więc fiszka dopisana do pliku — choćby z telefonu, przez webowy edytor
GitHuba — trafia do bazy przy następnym uruchomieniu. Bez restartu robi to
przycisk na stronie **Dane**.

Import jest **addytywny i idempotentny**: każda pozycja jest zapisywana
w ewidencji (`content_imports`), więc nie duplikuje się, nie nadpisuje zmian
zrobionych w aplikacji i **nie wskrzesza pozycji skasowanych w UI**. Kluczem jest
przód fiszki w obrębie fazy — poprawka tyłu w pliku nie trafi do bazy, zmiana
przodu tworzy nową pozycję. Pełny opis formatu: `content/README.md`.

**Aplikacja nie tworzy fiszek — to świadoma decyzja.** W bibliotece można je
edytować, przepiąć do innej fazy i usunąć, ale nowe wchodzą wyłącznie z
`content/`. Dzięki temu treść ma jedno źródło prawdy w gicie, a nie dwa
rozjeżdżające się: pliki i bazę, której nikt nie backupuje.

## Kopie zapasowe

Trzy warstwy, bo historia nauki istnieje w jednej kopii — `data/roadmap.db` nie
jest w gicie i ginie razem z dyskiem.

1. **Migawka dzienna** — przy każdym starcie backendu powstaje
   `data/snapshots/roadmap-snapshot-RRRR-MM-DD.json`, trzymane 14 ostatnich.
   Automatyczna, więc nie wymaga pamiętania o niej.
2. **Eksport ręczny** — strona **Dane** pobiera całą bazę jako jeden JSON.
3. **Kopia przed importem** — wczytanie pliku **zastępuje całą zawartość bazy**,
   więc przed nadpisaniem powstaje `data/roadmap.db.bak-RRRR-MM-DD-HHMMSS` przez
   `sqlite3.Connection.backup()`, a nie kopiowanie pliku: baza chodzi w trybie
   WAL i surowa kopia bez sidecarów potrafi być niespójna.

Import idzie w jednej transakcji — błąd w połowie oznacza pełny rollback.
Identyfikatory wierszy są zachowywane, żeby relacje przetrwały przeniesienie na
inną maszynę. Plik z nowszej wersji schematu jest odrzucany, z podaniem powodu,
**zamiast** pokazania przycisku „nadpisz".

## Architektura

```
backend/
  api/            FastAPI: main (lifespan, SPA), deps, schemas, routers/
  db/             połączenie, schemat, migracje (PRAGMA user_version), seed
  repository/     CRUD na tabelach
  services/       logika: postęp, spaced repetition, sesja, dziennik, XP, backup
  tests/          pytest, w tym tests/api/ na TestClient
frontend/
  src/api/        klient HTTP, typy generowane z OpenAPI, hooki TanStack Query
  src/lib/        tokeny domenowe: kolory faz, odmiana, skróty, ruch, confetti
  src/components/ prymitywy UI i komponenty widoków
  src/routes/     ekrany
  src/styles/     theme.css — jedyne źródło prawdy dla designu
content/          materiały w Markdownie, wczytywane przy starcie
data/             roadmap.db i migawki (nieśledzone w git)
docs/             notatki projektowe
```

**Kontrakt API** ma jedno źródło prawdy: `backend/api/schemas.py`. `make api-types`
przepisuje go na `frontend/src/api/schema.d.ts`, a CI pilnuje, że oba są zgodne —
zmiana pola psuje kompilację frontu od razu, a nie dopiero w przeglądarce.

**Czas:** aplikacja liczy „dziś"/„teraz" wyłącznie czasem lokalnym maszyny
(`services/clock.py`). Daty jadą przez API jako stringi, nie `datetime`:
przepuszczenie ich przez typ z czasem dorobiłoby strefę, której w bazie nie ma.

**Połączenie z bazą** jest jedno na request (`api/deps.py`), a nie współdzielone.
Endpointy są zwykłymi `def`, więc FastAPI puszcza je w threadpoolu, a jedno
`sqlite3.Connection` dzielone między wątkami to zaproszenie do przeplecionych
transakcji, skoro repozytoria commitują same.

**Wzorzec kluczy obcych między modułami:** cross-module, opcjonalny link do
roadmapy (`flashcards.phase_id`, `questions.phase_id`, `resources.phase_id`) jest
nullable z `ON DELETE SET NULL` — usunięcie fazy nie kasuje danych innego modułu,
tylko je odpina. Intra-module, właścicielska relacja rodzic-dziecko
(`question_attempts.question_id`, `tasks.phase_id`) jest `NOT NULL` z
`ON DELETE CASCADE`.

Trzeci typ to **wpis historyczny**: `activity_log.ref_id` celowo *nie* jest
kluczem obcym. Dziennik, który da się wyczyścić kasując zadanie, nie jest
dziennikiem — wpis ma przeżyć usunięcie obiektu, którego dotyczy. Dlatego kolumna
`detail` trzyma zdenormalizowaną migawkę tytułu.

**Rodzaje zdarzeń i statusy** nie mają `CHECK` w schemacie (migracje 5 i 6
zdjęły je z `content_imports` i `activity_log`): listy rosną z każdym modułem
szybciej niż migracje, więc ich miejsce jest przy kodzie, w `repository/`.

## Warstwa designu

Motyw jest ciemny i „premium edu": near-black płótno z lekkim przesunięciem
w niebiesko-fiolet, hojne promienie, warstwowa głębia. Kolor ma **znaczyć** —
każda faza roadmapy ma własną barwę, która wraca na pierścieniu postępu, lewej
krawędzi karty, badge'u i washu pod kartą. Płótno zostaje neutralne, żeby treść
i postęp były jedynymi rzeczami, które świecą.

Wszystkie tokeny siedzą w `frontend/src/styles/theme.css` (`@theme` Tailwinda) —
jedno miejsce, w odróżnieniu od wersji streamlitowej, gdzie wygląd był
nieusuwalnie rozbity na `config.toml` i blok CSS-u. Barwy faz są w
`src/lib/phases.ts` i podawane przez zmienną CSS `--phase`, a nie klasami
Tailwinda per faza: fazy pochodzą z bazy i można dodać nową.

Ruch idzie na sprężynach, nie krzywych czasowych — klik ma odpowiedzieć od razu
i wyhamować. `<MotionConfig reducedMotion="user">` w korzeniu wycisza
transformacje przy `prefers-reduced-motion`, zostawiając przejścia opacity.

## Klawiatura

Całą apkę da się obsłużyć bez myszy; `?` pokazuje ściągawkę czytaną z tego samego
rejestru, z którego działają skróty. `g` + litera to nawigacja (`g d` start,
`g f` fiszki, `g p` pytania…), `s` startuje sesję dnia.
