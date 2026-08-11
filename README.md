# ML Roadmap Companion

Lokalna, osobista apka Streamlit towarzysząca nauce ML (przebranżowienie
z budownictwa do IT). Bez publikacji, bez auth, dane trzymane lokalnie
w SQLite.

## Uruchomienie

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

Baza danych (`data/roadmap.db`) tworzy się i seeduje automatycznie przy
pierwszym uruchomieniu. Obok pliku bazy pojawiają się pliki pomocnicze
WAL (`roadmap.db-wal`, `roadmap.db-shm`) — to normalne, są ignorowane
przez git.

## Testy

```
pip install -r requirements-dev.txt
python -m pytest
```

## Moduły

- **Moduł 1 (gotowy)** — tracker postępu przez fazy roadmapy (0, 1, 2,
  2b, 3, 4): edytowalne taski, checkboxy, notatki, paski postępu.
- **Moduł 2 (gotowy)** — fiszki / spaced repetition do pojęć ML (system
  Leitnera, 5 pudełek): widok dzisiejszych powtórek, dodawanie/edycja/
  usuwanie fiszek z UI, przepinanie fiszki do innej fazy.
- **Moduł 3 (gotowy)** — bank pytań sprawdzających zrozumienie, per faza:
  oznaczanie "rozwiązałem samodzielnie" / "musiałem sprawdzić", pełny log
  dat podejść (`question_attempts`) i skumulowany wskaźnik: % podejść
  rozwiązanych samodzielnie, liczony ze wszystkich podejść (bez okna
  czasowego). **Każde pytanie ma odpowiedź** — przycisk „💡 Pokaż odpowiedź"
  odsłania ją na żądanie, a kliknięcie „📖 Sprawdziłem" odsłania od razu, bo po
  to się je klika. Treść, typ, faza i odpowiedź są edytowalne w miejscu.
  Zmiana fazy przenosi pytanie między expanderami — to zamierzone.
- **Moduł 4 (gotowy)** — dziennik nauki: każde odhaczenie zadania, powtórka
  fiszki i podejście do pytania trafia do `activity_log`. Strona 📔 Dziennik
  pokazuje aktualną serię dni, rekord, pasek ostatnich 30 dni i historię
  pogrupowaną po dniach; kafelek „Seria dni" jest też na stronie startowej.
  Seria liczy się jako żywa również wtedy, gdy ostatnia aktywność była
  wczoraj — inaczej znikałaby o północy, zanim dzisiejszy dzień nauki się
  zacznie.
- **Moduł 5 (gotowy)** — zasoby: materiały do nauki podpięte do faz
  (książka, kurs, wideo, dokumentacja, artykuł), z linkiem, opisem/rozdziałem
  i statusem przerobienia. Roadmapa mówi **co** zrobić, ta strona **z czego**.
  Startowy zestaw to 44 pozycje — ISLR, Mathematics for ML, User Guide
  scikit-learn, tutoriale PyTorcha, d2l.ai i inne.
- **Moduł 6 (do przemyślenia)** — tryb stricte pod naukę: przebieg
  zapoznawczy dla nowych fiszek i notatki własnymi słowami. Szkic i otwarte
  pytania w `docs/modul-nauki.md`, kodu jeszcze nie ma.

## Materiały do nauki (`content/`)

Fiszki, pytania i materiały trzymane są **w repo**, w katalogu `content/` —
plik Markdown na fazę, nagłówek `##` to przód fiszki (albo treść pytania,
albo tytuł materiału), tekst pod spodem to tył (albo odpowiedź, albo
link i opis). Aplikacja wczytuje ten katalog przy każdym
starcie, więc fiszka dopisana do pliku — choćby z telefonu, przez webowy
edytor GitHuba — trafia do bazy przy następnym uruchomieniu.

Import jest **addytywny i idempotentny**: każda pozycja jest zapisywana
w ewidencji (`content_imports`), więc nie duplikuje się, nie nadpisuje
zmian zrobionych w aplikacji i **nie wskrzesza pozycji skasowanych w UI**.
Kluczem jest przód fiszki w obrębie fazy — poprawka tyłu w pliku nie
trafi do bazy, zmiana przodu tworzy nową pozycję.

Świeżo zaimportowane fiszki wchodzą po `NEW_CARDS_PER_DAY` (domyślnie 10)
na dzień, żeby wgranie większego zestawu nie dało kilkudziesięciu powtórek
pierwszego dnia. Fiszka dodana ręcznie w UI jest wymagalna od razu.

Pełny opis formatu i wskazówki, skąd brać treść: `content/README.md`.

## Kopia zapasowa danych

Strona 💾 **Dane** pozwala pobrać całą bazę jako jeden plik JSON
(`roadmap-export-RRRR-MM-DD.json`) i wczytać ją z powrotem. Import
**zastępuje całą zawartość bazy**, więc przed nadpisaniem apka robi kopię
obok pliku bazy (`data/roadmap.db.bak-RRRR-MM-DD-HHMMSS`) — przez
`sqlite3.Connection.backup()`, a nie kopiowanie pliku, bo baza chodzi
w trybie WAL i surowa kopia bez sidecarów potrafi być niespójna.

Import idzie w jednej transakcji: błąd w połowie oznacza pełny rollback,
więc nieudane wczytanie nigdy nie zostawia bazy w stanie pośrednim.
Identyfikatory wierszy są zachowywane, żeby relacje między tabelami
przetrwały przeniesienie na inną maszynę. Plik z nowszej wersji schematu
jest odrzucany zamiast wczytywany po cichu.

## Architektura

```
app.py            strona "Roadmap" (streamlit run app.py)
pages/             kolejne strony multipage (Fiszki, Pytania, Dziennik, Dane, Zasoby)
db/               połączenie SQLite, schema, dane startowe (seed), bootstrap
repository/       CRUD na tabelach (phases, tasks, flashcards, questions, question_attempts, activity_log, resources)
services/         logika biznesowa (postęp, spaced repetition, statystyki pytań, serie dni, backup)
ui/               funkcje renderujące widgety Streamlit
content/          fiszki, pytania i materiały w Markdownie, wczytywane przy starcie
docs/             notatki projektowe (m.in. szkic modułu nauki)
tests/            testy pytest (logika, repozytoria, migracje, seed)
data/             plik roadmap.db (nieśledzony w git)
```

**Czas:** aplikacja liczy "dziś"/"teraz" wyłącznie czasem lokalnym maszyny
(`services/clock.py`) — zarówno przy zapisie terminów powtórek, jak i przy
pytaniu o fiszki "na dziś". Schemat bazy jest wersjonowany przez
`PRAGMA user_version` (`db/schema.py`, lista `MIGRATIONS`).

**Wzorzec kluczy obcych między modułami:** rozróżniamy dwa typy relacji.
Cross-module, opcjonalny link do Modułu 1 (np. `flashcards.phase_id`,
`questions.phase_id`) jest nullable z `ON DELETE SET NULL` — usunięcie
fazy/taska nie kasuje danych innego modułu, tylko je odpina. Intra-module,
właścicielska relacja rodzic-dziecko (np. `question_attempts.question_id`,
podobnie jak `tasks.phase_id -> phases`) jest `NOT NULL` z
`ON DELETE CASCADE` — usunięcie rodzica to świadoma decyzja skasowania
całego jego zakresu, więc dzieci znikają razem z nim.

Trzeci typ to **wpis historyczny**: `activity_log.ref_id` celowo *nie* jest
kluczem obcym. Dziennik, który da się wyczyścić kasując taska, nie jest
dziennikiem — wpis ma przeżyć usunięcie obiektu, którego dotyczy. Dlatego
kolumna `detail` trzyma zdenormalizowaną migawkę tytułu i wpis pozostaje
czytelny nawet po zniknięciu źródła.

**Decyzja architektoniczna:** apka używa natywnego Streamlit multipage —
`app.py` to strona startowa ("Roadmap"), kolejne moduły dochodzą jako
pliki w `pages/`. Współdzielone połączenie z bazą (`init_app()`, cache
`st.cache_resource`) siedzi w `db/bootstrap.py`, żeby każda strona mogła
z niego korzystać bez duplikowania inicjalizacji.

Baza `phases`/`tasks` jest jedynym stałym punktem odniesienia — Moduł 2/3
dodają nowe tabele (np. `flashcards`, `questions`) z nullable FK i
`ON DELETE SET NULL`, bez zmian w istniejącym schemacie.
