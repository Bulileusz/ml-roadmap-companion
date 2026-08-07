# Faza 0 — Python odświeżenie

## Broadcasting w NumPy — jaka jest reguła?
Kształty porównywane są **od prawej strony**. Wymiary pasują, gdy są równe
albo gdy jeden z nich wynosi 1 — wtedy jest "rozciągany". Brakujące wymiary
z lewej traktowane są jak 1.

`(3, 4)` + `(4,)` → OK, wektor rozciąga się na 3 wiersze.
`(3, 4)` + `(3,)` → błąd; potrzebne `(3, 1)`.

## Czym `np.ndarray` różni się od listy Pythona?
Jednorodny typ, ciągły blok pamięci i stały rozmiar elementu — stąd
operacje wektorowe w skompilowanym kodzie C zamiast pętli w Pythonie.
Lista trzyma wskaźniki na dowolne obiekty, więc jest elastyczna, ale
znacznie wolniejsza i cięższa pamięciowo.

## Co oznacza `axis=0`, a co `axis=1`?
`axis` wskazuje oś, **wzdłuż której operacja się porusza** (czyli tę, która
znika z wyniku). Dla tablicy 2D: `axis=0` przechodzi w dół po wierszach i
daje statystykę per kolumna; `axis=1` przechodzi w poprzek kolumn i daje
statystykę per wiersz.

## `.loc` a `.iloc` w Pandas
`.loc` indeksuje **etykietami** (i domyka prawy koniec zakresu:
`df.loc[2:4]` obejmuje 4). `.iloc` indeksuje **pozycjami całkowitymi**
i zachowuje się jak slicing Pythona (`df.iloc[2:4]` nie obejmuje 4).

## Wektoryzacja — dlaczego zamiast pętli?
Pętla po wierszach wykonuje interpretowany bajtkod dla każdego elementu.
Operacja wektorowa przekazuje całą tablicę do skompilowanej pętli w C,
z lepszym wykorzystaniem cache'u. Różnica bywa rzędu 10–100×.

## Kiedy NumPy zwraca widok, a kiedy kopię?
Zwykły slicing (`a[1:3]`) daje **widok** — zapis do niego zmienia oryginał.
Fancy indexing (`a[[0, 2]]`) i indeksowanie maską boolowską dają **kopię**.
Stąd `a[1:3] = 0` modyfikuje `a`, a `a[[0, 2]] = 0`... też, bo to
przypisanie, ale `b = a[[0,2]]; b[:] = 0` już nie.

## Co znaczy `SettingWithCopyWarning`?
Pandas nie wie, czy operujesz na widoku, czy na kopii — zapis może pójść
w próżnię. Zwykle wynika z indeksowania łańcuchowego
(`df[df.x > 0]["y"] = 1`). Poprawnie: jedno wywołanie `.loc`
(`df.loc[df.x > 0, "y"] = 1`).

## Na czym polega split-apply-combine w `groupby`?
**Split** — podział wierszy na grupy po kluczu. **Apply** — policzenie
funkcji w każdej grupie niezależnie. **Combine** — sklejenie wyników
w jeden obiekt. `df.groupby("kraj")["cena"].mean()` to wszystkie trzy kroki.

## `merge` a `concat` w Pandas
`merge` łączy **po wartościach kolumn kluczowych** (jak JOIN w SQL) i ma
warianty inner/left/right/outer. `concat` **skleja** obiekty wzdłuż osi,
dopasowując po indeksie — bez logiki dopasowania po kluczu.

## Jak Pandas traktuje `NaN` przy agregacji?
Domyślnie **pomija** braki: `mean()` liczy średnią z dostępnych wartości,
a nie zwraca `NaN`. `count()` też liczy tylko niepuste. Uwaga: to potrafi
ukryć fakt, że kolumna jest w 90% pusta — sprawdzaj `df.isna().sum()`.

## Co pokazuje boxplot?
Medianę, kwartyle Q1 i Q3 (pudełko = rozstęp międzykwartylowy IQR) oraz
wąsy sięgające zwykle 1,5 × IQR. Punkty poza wąsami to kandydaci na
obserwacje odstające. Dobry do porównania rozkładów między grupami.

## Histogram a wykres gęstości (KDE)
Histogram zlicza obserwacje w koszykach — kształt zależy od liczby i
szerokości koszyków. KDE wygładza rozkład jądrem, dając ciągłą krzywą,
ale wygładzenie może zmyślić strukturę tam, gdzie danych jest mało.

## Od czego zacząć EDA na nieznanym zbiorze?
Kształt (`shape`), typy kolumn (`dtypes`), braki (`isna().sum()`),
statystyki opisowe (`describe()`), liczności dla kolumn kategorycznych
(`value_counts()`), rozkłady kolumn liczbowych i dopiero potem zależności
między nimi. Najpierw zrozum dane, potem rysuj korelacje.
