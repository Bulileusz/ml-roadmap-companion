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
pierwszym uruchomieniu.

## Moduły

- **Moduł 1 (gotowy)** — tracker postępu przez fazy roadmapy (0, 1, 2,
  2b, 3, 4): edytowalne taski, checkboxy, notatki, paski postępu.
- **Moduł 2 (gotowy)** — fiszki / spaced repetition do pojęć ML (system
  Leitnera, 5 pudełek): widok dzisiejszych powtórek, dodawanie/edycja/
  usuwanie fiszek z UI.
- **Moduł 3 (planowany)** — bank pytań sprawdzających zrozumienie.

## Architektura

```
app.py            strona "Roadmap" (streamlit run app.py)
pages/             kolejne strony multipage (np. Fiszki)
db/               połączenie SQLite, schema, dane startowe (seed), bootstrap
repository/       CRUD na tabelach (phases, tasks, flashcards)
services/         logika biznesowa (postęp, spaced repetition)
ui/               funkcje renderujące widgety Streamlit
data/             plik roadmap.db (nieśledzony w git)
```

**Decyzja architektoniczna:** apka używa natywnego Streamlit multipage —
`app.py` to strona startowa ("Roadmap"), kolejne moduły dochodzą jako
pliki w `pages/`. Współdzielone połączenie z bazą (`init_app()`, cache
`st.cache_resource`) siedzi w `db/bootstrap.py`, żeby każda strona mogła
z niego korzystać bez duplikowania inicjalizacji.

Baza `phases`/`tasks` jest jedynym stałym punktem odniesienia — Moduł 2/3
dodają nowe tabele (np. `flashcards`, `questions`) z nullable FK i
`ON DELETE SET NULL`, bez zmian w istniejącym schemacie.
