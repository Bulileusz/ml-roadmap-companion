# Faza 0 — pytania sprawdzające

## Masz tablicę o kształcie (100, 3) i chcesz odjąć od każdej kolumny jej średnią. Jak to zapisać jednym wyrażeniem i dlaczego broadcasting to przepuści?

`a - a.mean(axis=0)`.

`a.mean(axis=0)` przechodzi w dół po wierszach i daje kształt `(3,)` — jedna
średnia na kolumnę. Przy odejmowaniu kształty porównywane są od prawej:
`(100, 3)` kontra `(3,)`. Brakujący wymiar z lewej traktowany jest jak 1, więc
`(3,)` staje się `(1, 3)`, a wymiar o rozmiarze 1 jest rozciągany na 100 wierszy.

Gdybyś chciał odjąć średnią **wiersza**, `a.mean(axis=1)` da kształt `(100,)`
i broadcasting **nie zadziała** — od prawej porównuje 3 z 100. Trzeba wymusić
kształt: `a - a.mean(axis=1, keepdims=True)`, czyli `(100, 1)`.

## Dlaczego `df[df.wiek > 30]["pensja"] = 0` może nie zadziałać, a `df.loc[df.wiek > 30, "pensja"] = 0` zadziała?

To indeksowanie łańcuchowe: `df[df.wiek > 30]` jest osobnym wywołaniem, które
zwraca **nowy obiekt** — Pandas nie gwarantuje, czy będzie to widok, czy kopia.
Przypisanie trafia do tego obiektu pośredniego; jeśli była to kopia, ginie razem
z nią, a oryginalny `df` zostaje nietknięty. Stąd `SettingWithCopyWarning`.

Wersja z `.loc` to **jedna** operacja indeksowania z dwoma osiami (wiersze,
kolumna), więc Pandas wie, że to przypisanie do oryginału, i wykonuje je na
miejscu.

Reguła praktyczna: jeśli przypisujesz, nigdy nie stawiaj dwóch nawiasów
kwadratowych po sobie.

## [code] Wczytaj dowolny CSV i wypisz dla każdej kolumny: typ, liczbę braków i liczbę unikalnych wartości — bez używania `describe()`.

```python
import pandas as pd

df = pd.read_csv("dane.csv")
raport = pd.DataFrame({
    "typ": df.dtypes,
    "braki": df.isna().sum(),
    "braki_%": (df.isna().mean() * 100).round(1),
    "unikalne": df.nunique(),
})
print(raport)
```

Sedno: `df.dtypes`, `df.isna().sum()` i `df.nunique()` zwracają serie
indeksowane nazwami kolumn, więc składają się w ramkę bez żadnej pętli.
`isna().mean()` daje od razu udział braków, bo średnia z wartości logicznych
to ich odsetek.

## Kolumna ma 40% braków. Wymień trzy różne strategie postępowania i powiedz, kiedy każda z nich jest zła.

**Usunąć kolumnę.** Dobre, gdy braki są losowe i kolumna niewiele wnosi. Złe,
gdy sam fakt braku niesie informację — brak wyniku badania często znaczy, że
lekarz go nie zlecił, bo pacjent wyglądał zdrowo.

**Uzupełnić (medianą, modą, modelem).** Dobre przy małym odsetku braków
i losowym mechanizmie. Przy 40% zmyślasz prawie połowę kolumny: rozkład się
sztucznie zaostrza wokół wartości uzupełniającej, a wariancja spada, co zaniża
niepewność modelu.

**Potraktować brak jako osobną kategorię** (albo dodać kolumnę flagi
`było_puste`). Dobre, gdy brak nie jest losowy. Złe dla zmiennych ciągłych, bo
wymusza dyskretyzację, i ryzykowne, gdy przyczyna braku jest inna w zbiorze
treningowym niż na produkcji.

Pytanie przed wyborem jest zawsze to samo: **dlaczego tych danych brakuje**.

## `df.groupby("kraj")["cena"].mean()` zwraca inny wynik niż `df["cena"].mean()` pogrupowana ręcznie po filtrze. Podaj dwa powody, dla których tak może być.

**Braki.** `groupby` domyślnie pomija wiersze z `NaN` w kolumnie klucza — jeśli
część wierszy ma pusty `kraj`, w ogóle nie trafi do żadnej grupy. Twój ręczny
filtr mógł je gdzieś przypisać.

**Średnia ze średnich.** Jeśli porównujesz `groupby(...).mean()` z ogólną
średnią, to nie są te same liczby, chyba że grupy są równoliczne. Średnia
arytmetyczna średnich grupowych ignoruje ich wagi.

Poza tym łatwo o różnicę przez typ kolumny (`cena` wczytana jako tekst daje
inny wynik po konwersji) i przez duplikaty wierszy.

## [code] Napisz tę samą operację dwa razy — pętlą po wierszach i wektorowo — i zmierz różnicę czasu. O ile wyszła i dlaczego akurat tyle?

```python
import numpy as np, time

a = np.random.rand(1_000_000)

start = time.perf_counter()
wynik_petla = [x * 2 + 1 for x in a]
czas_petla = time.perf_counter() - start

start = time.perf_counter()
wynik_wektor = a * 2 + 1
czas_wektor = time.perf_counter() - start

print(f"pętla {czas_petla:.4f}s, wektorowo {czas_wektor:.4f}s, "
      f"przyspieszenie {czas_petla / czas_wektor:.0f}x")
```

Spodziewaj się rzędu 50–200×. Powód: pętla wykonuje interpretowany bajtkod dla
każdego z miliona elementów i dla każdego tworzy pythonowy obiekt `float`.
Wersja wektorowa przekazuje całą tablicę do skompilowanej pętli w C, która
działa na ciągłym bloku pamięci, dobrze wykorzystuje cache procesora i korzysta
z instrukcji wektorowych.

Konkretna liczba zależy od maszyny — istotny jest rząd wielkości, nie wartość.

## Patrzysz na histogram i widzisz dwa garby. Co to może oznaczać i jak sprawdzisz swoją hipotezę?

Najczęściej: **w danych siedzą dwie różne populacje** zmieszane w jednej
kolumnie — dwie grupy pacjentów, dwie linie produkcyjne, dane sprzed i po
zmianie procesu.

Może też być artefaktem: źle dobrana liczba koszyków potrafi rozciąć jeden
rozkład na dwa garby, a wartość zastępcza (`-1`, `0`, `9999` w miejsce braku)
tworzy sztuczny drugi szczyt.

Sprawdzenie: zmień liczbę koszyków i zobacz, czy garby przetrwają. Jeśli tak,
poszukaj zmiennej dzielącej — narysuj histogram z podziałem na kategorie
(`hue` w seabornie) albo boxploty per grupa. Jeśli któraś kategoria rozdziela
garby, hipoteza się broni.

## Dostajesz nieznany zbiór danych. Opisz swoje pierwsze pięć kroków i uzasadnij ich kolejność.

1. **`shape` i `head`** — ile tego jest i jak wygląda wiersz. Bez tego nie wiesz,
   czy pracujesz z 200 wierszami, czy z 20 milionami, i czy nagłówki się wczytały.
2. **`dtypes`** — czy liczby są liczbami. Kolumna liczbowa wczytana jako tekst
   przez jeden przecinek zepsuje każdą kolejną analizę.
3. **Braki** (`isna().sum()`) — decydują, które kolumny w ogóle nadają się do
   użycia, więc muszą być przed liczeniem statystyk.
4. **Rozkłady pojedynczych kolumn** — `describe()` dla liczbowych,
   `value_counts()` dla kategorycznych. Tu wychodzą wartości odstające,
   zastępcze i kategorie z trzema obserwacjami.
5. **Zależności między kolumnami** — korelacje, wykresy rozrzutu — **na końcu**,
   bo korelacja policzona na kolumnie z tekstem albo z `9999` zamiast braku jest
   po prostu nieprawdziwa.

Kolejność nie jest przypadkowa: każdy krok zakłada, że poprzedni nie znalazł
niczego, co unieważnia dalszą pracę.
