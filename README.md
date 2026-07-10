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
- **Moduł 2 (planowany)** — fiszki / spaced repetition do pojęć ML.
- **Moduł 3 (planowany)** — bank pytań sprawdzających zrozumienie.

## Architektura

```
app.py            entry point (streamlit run app.py)
db/               połączenie SQLite, schema, dane startowe (seed)
repository/       CRUD na tabelach (phases, tasks)
services/         logika biznesowa (liczenie postępu)
ui/               funkcje renderujące widgety Streamlit
data/             plik roadmap.db (nieśledzony w git)
```

**Decyzja architektoniczna:** na razie nie używamy Streamlit multipage
(`pages/`), bo jest tylko jeden moduł. Cała logika biznesowa siedzi
w `db/`, `repository/`, `services/`, `ui/components.py`, a `app.py` jest
tylko cienkim plikiem spinającym — gdy dojdzie Moduł 2, przejście na
multipage sprowadzi się do przeniesienia zawartości `app.py` do
`pages/1_Roadmap.py` i dodania `pages/2_Fiszki.py`, bez przepisywania
logiki.

Baza `phases`/`tasks` jest zaprojektowana tak, by Moduł 2/3 mogły dodać
nowe tabele (np. `flashcards`, `questions`) referencujące te dwie, bez
zmian w istniejącym schemacie.
