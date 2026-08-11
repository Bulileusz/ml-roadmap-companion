# Materiały do nauki

Ten katalog to **źródło prawdy dla treści**: fiszki i pytania trzymane
w gicie, a nie tylko w lokalnym `data/roadmap.db` (który jest nieśledzony,
więc istnieje w jednej kopii i ginie razem z dyskiem).

Aplikacja wczytuje ten katalog **przy każdym starcie**. Dopisujesz fiszkę
do pliku — choćby z telefonu, przez webowy edytor GitHuba — i przy
następnym uruchomieniu jest w bazie.

## Format

Nazwa pliku zaczyna się od **kodu fazy**, przed pierwszym myślnikiem:
`2b-ensemble.md` trafia do fazy `2b`. Kody muszą pokrywać się z tabelą
`phases` (`0`, `1`, `2`, `2b`, `3`, `4`).

### Fiszki — `content/flashcards/`

Nagłówek `##` to **przód**, tekst pod spodem to **tył**:

```markdown
## Co robi parametr k w KNN?
Małe k → granica poszarpana, model łapie szum.
Duże k → granica gładka, model uśrednia zbyt szeroko.
```

Tył może mieć wiele akapitów, listy i kod — cokolwiek do następnego `##`.

### Pytania — `content/questions/`

Nagłówek `##` to treść pytania, tekst pod spodem to **odpowiedź / wyjaśnienie**.
Opcjonalny tag `[code]` albo `[concept]` na początku ustawia typ (domyślnie
`concept`):

```markdown
## Dlaczego accuracy bywa myląca przy rzadkiej klasie?
Przy 1% przypadków pozytywnych model odpowiadający zawsze "nie" ma 99%
accuracy i zerową wartość. Patrz na recall, precision i PR AUC.

## [code] Zaimplementuj KNN od zera i porównaj z sklearn.
Rozjazdy biorą się z remisów przy parzystym k.
```

Odpowiedź jest opcjonalna — pytanie bez treści pod spodem jest w porządku,
tylko przycisk „💡 Pokaż odpowiedź" się nie pojawi, dopóki jej nie dopiszesz
(w pliku albo w aplikacji przez ✏️ Edytuj).

## Zasady importu

Import jest **addytywny i jednokierunkowy**. Konkretnie:

- **Nie duplikuje.** Każda pozycja jest zapisywana w ewidencji
  (`content_imports`) i drugi raz nie wjedzie.
- **Nie wskrzesza.** Fiszkę skasowaną w aplikacji import zostawia
  skasowaną — ewidencja pamięta, że już kiedyś była.
- **Nie nadpisuje.** Kluczem jest przód fiszki (albo treść pytania).
  Poprawka **tyłu** w pliku nie trafi do bazy, bo klucz się nie zmienił.
  Zmiana **przodu** tworzy nową pozycję, starą skasuj w aplikacji.
- **Wypełnia puste.** Jedyny wyjątek od reguły wyżej: jeśli pytanie istnieje,
  a jego odpowiedź jest **pusta**, import ją uzupełni. Odpowiedzi, którą
  napisałeś sam w aplikacji, nie ruszy. Import wypełnia luki, nigdy nie
  zastępuje twojej treści.

Praktyczny wniosek: **przód pisz w pliku, tył dopracowuj w aplikacji** —
albo, jeśli wolisz trzymać wszystko w gicie, zmieniaj tył w pliku i kasuj
starą fiszkę w UI, żeby wjechała na nowo.

Klucz ignoruje różnice w białych znakach i wielkości liter, a **nie**
zawiera nazwy pliku — przeniesienie fiszki między plikami nie robi z niej
nowej pozycji.

## Nowe fiszki są wymagalne od razu

Zaimportowana fiszka ląduje w pudełku 1 z terminem powtórki na dziś, tak
samo jak dodana ręcznie. Po wgraniu większej partii licznik „na dziś"
skoczy — nic się nie stanie, jeśli przerobisz tylko część, zaległe
pozostają wymagalne.

## Skąd brać treść

Najlepsze fiszki to własne. Materiał, z którego warto je pisać:

| Faza | Źródło |
|---|---|
| 1 | *Mathematics for Machine Learning* (Deisenroth, Faisal, Ong) — darmowy PDF |
| 2 | *An Introduction to Statistical Learning* — darmowy PDF, ćwiczenia konceptualne wprost pod bank pytań |
| 2, 2b | User Guide scikit-learn |
| 3 | tutoriale PyTorcha, *Dive into Deep Learning* (d2l.ai) |
| wszystkie | Google Machine Learning Glossary |

Startowy zestaw w tym katalogu pokrywa tytuły zadań z roadmapy i jest
pomyślany jako punkt wyjścia, nie komplet.
