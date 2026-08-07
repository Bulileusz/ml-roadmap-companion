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
  czasowego). Treść, typ i faza istniejącego pytania są edytowalne w miejscu.
  Zmiana fazy przenosi pytanie między expanderami — to zamierzone.

## Architektura

```
app.py            strona "Roadmap" (streamlit run app.py)
pages/             kolejne strony multipage (Fiszki, Pytania)
db/               połączenie SQLite, schema, dane startowe (seed), bootstrap
repository/       CRUD na tabelach (phases, tasks, flashcards, questions, question_attempts)
services/         logika biznesowa (postęp, spaced repetition, statystyki pytań)
ui/               funkcje renderujące widgety Streamlit
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

**Decyzja architektoniczna:** apka używa natywnego Streamlit multipage —
`app.py` to strona startowa ("Roadmap"), kolejne moduły dochodzą jako
pliki w `pages/`. Współdzielone połączenie z bazą (`init_app()`, cache
`st.cache_resource`) siedzi w `db/bootstrap.py`, żeby każda strona mogła
z niego korzystać bez duplikowania inicjalizacji.

Baza `phases`/`tasks` jest jedynym stałym punktem odniesienia — Moduł 2/3
dodają nowe tabele (np. `flashcards`, `questions`) z nullable FK i
`ON DELETE SET NULL`, bez zmian w istniejącym schemacie.
