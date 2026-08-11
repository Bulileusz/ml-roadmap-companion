# Faza 2 — pytania sprawdzające

## Twój model ma 99% accuracy na wykrywaniu rzadkiej awarii. Dlaczego to może być bezwartościowy wynik i co sprawdzisz zamiast tego?

Jeśli awarie stanowią 1% przypadków, model odpowiadający **zawsze „brak awarii"**
ma 99% accuracy i zerową wartość — nie wykrywa niczego. Twoje 99% może być
dokładnie tym modelem.

Sprawdź: **macierz pomyłek** (ile awarii faktycznie wychwycił), **recall** dla
klasy awarii (jaki odsetek awarii złapał — tu zwykle najważniejszy, bo
przeoczona awaria kosztuje), **precision** (ile alarmów było prawdziwych) oraz
**ROC AUC** albo lepiej **PR AUC**, która przy silnej nierównowadze klas jest
bardziej wymowna niż ROC.

Pierwszy odruch: porównaj z modelem większościowym. Jeśli go nie bijesz, nie
masz modelu.

## Kiedy świadomie poświęcisz precision na rzecz recall? Podaj konkretny przykład z domeny, którą znasz.

Wtedy, gdy **przeoczenie kosztuje znacznie więcej niż fałszywy alarm**.

Przykład z budownictwa: model wykrywający rysy konstrukcyjne na zdjęciach
elementów żelbetowych. Fałszywy alarm oznacza, że inspektor pójdzie obejrzeć
element, który jest w porządku — koszt to kilkanaście minut. Przeoczona rysa
w elemencie nośnym to ryzyko awarii konstrukcji. Ustawiasz próg nisko, godzisz
się na 30% fałszywych alarmów, byle recall był bliski jedności.

Odwrotnie w filtrze spamu: przeoczony spam to irytacja, ale ważny mail wrzucony
do kosza może kosztować kontrakt — tam priorytetem jest precision.

Wybór progu jest decyzją biznesową o koszcie dwóch rodzajów błędu, nie
parametrem technicznym.

## R² na zbiorze testowym wyszedł ujemny. Co to w ogóle znaczy i jak taki wynik jest możliwy?

R² mierzy, o ile lepszy jest twój model od przewidywania **stałej wartości —
średniej ze zbioru**. Wartość 0 oznacza „dokładnie tak dobry jak średnia".
**Ujemna oznacza gorszy od średniej.**

Na zbiorze treningowym R² z regresji liniowej nie może być ujemny, bo model
minimalizuje właśnie tę sumę kwadratów. Ale na teście — jak najbardziej: model
dopasowany do szumu w treningu wypada na nowych danych gorzej, niż wypadłoby
zwykłe „zawsze zgaduj średnią".

Typowe przyczyny: silne przeuczenie, przesunięcie rozkładu między treningiem
a testem (dane z innego okresu, innej linii produkcyjnej), albo błąd w potoku
— np. skalowanie dopasowane osobno na obu zbiorach.

Ujemne R² to nie dziwactwo statystyczne, tylko komunikat: **twój model szkodzi**.

## Model ma 98% accuracy na treningu i 62% na teście. Nazwij problem i wymień trzy sposoby zaradzenia mu.

To **przeuczenie** (overfitting): model nauczył się szumu i szczegółów zbioru
treningowego zamiast zależności, które przenoszą się na nowe dane. Rozpoznaje
się je po rozjeździe między błędem treningowym a testowym, nie po samej
wartości.

**Uprość model** — mniejsza głębokość drzewa, mniej cech, mocniejsza
regularyzacja (L1/L2). Mniej parametrów to mniej miejsca na zapamiętywanie szumu.

**Dodaj danych** — więcej obserwacji albo augmentacja. Szum jest różny w każdej
próbce, sygnał ten sam, więc przy większym zbiorze trudniej dopasować się do
przypadku.

**Popraw walidację** — cross-walidacja zamiast pojedynczego splitu, early
stopping na zbiorze walidacyjnym. Nie zmniejsza to przeuczenia samo z siebie,
ale pozwala je wykryć i zatrzymać trening w odpowiednim momencie.

Zanim zaczniesz: sprawdź, czy to nie **wyciek danych w drugą stronę** — czasem
rozjazd bierze się z tego, że zbiory testowy i treningowy pochodzą z różnych
rozkładów, a nie z przeuczenia.

## [code] Narysuj granice decyzyjne KNN, regresji logistycznej i drzewa na tym samym zbiorze 2D. Wyjaśnij, skąd bierze się różnica w ich kształcie.

```python
import numpy as np, matplotlib.pyplot as plt
from sklearn.datasets import make_moons
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier

X, y = make_moons(n_samples=300, noise=0.25, random_state=0)
modele = [KNeighborsClassifier(5), LogisticRegression(), DecisionTreeClassifier()]

xx, yy = np.meshgrid(np.linspace(-2, 3, 400), np.linspace(-1.5, 2, 400))
siatka = np.c_[xx.ravel(), yy.ravel()]

fig, axes = plt.subplots(1, 3, figsize=(15, 4))
for ax, model in zip(axes, modele):
    model.fit(X, y)
    ax.contourf(xx, yy, model.predict(siatka).reshape(xx.shape), alpha=0.3)
    ax.scatter(X[:, 0], X[:, 1], c=y, edgecolor="k", s=20)
    ax.set_title(type(model).__name__)
plt.tight_layout(); plt.show()
```

**Skąd różnice** — każdy model ma inną „gramatykę" granicy:

- **Regresja logistyczna** liczy kombinację liniową cech, więc granica to zawsze
  **prosta** (w wyższych wymiarach hiperpłaszczyzna). Na księżycach nie da rady.
- **Drzewo** pyta „cecha ≤ próg", więc każde cięcie jest **prostopadłe do osi** —
  granica wychodzi schodkowa, nigdy skośna.
- **KNN** głosuje wśród sąsiadów, więc granica jest **nieregularną mozaiką**
  ukształtowaną przez lokalne skupiska punktów; przy `k=1` opływa każdy pojedynczy
  punkt, przy dużym `k` wygładza się.

To ćwiczenie pokazuje lepiej niż jakakolwiek metryka, czym te modele się różnią.

## Dlaczego skalowanie cech policzone przed podziałem na train/test to wyciek danych? Co dokładnie przecieka?

Przeciekają **statystyki zbioru testowego**: średnia i odchylenie standardowe
policzone na całości zawierają informację o rozkładzie danych, których model
nie powinien znać.

Skutek jest subtelny, ale realny — twoja ocena na teście jest optymistycznie
obciążona, bo transformacja została dostrojona do danych testowych. Na produkcji,
gdzie przyszłych obserwacji naprawdę nie znasz, model dostanie inaczej
przeskalowane wejście i wypadnie gorzej niż obiecywała walidacja.

Poprawnie: `fit` skalera **wyłącznie na treningu**, `transform` na obu zbiorach.
W praktyce zamknij to w `Pipeline`, żeby cross-walidacja robiła to automatycznie
wewnątrz każdego foldu:

```python
Pipeline([("skaler", StandardScaler()), ("model", LogisticRegression())])
```

Ta sama zasada dotyczy uzupełniania braków, doboru cech i target encodingu —
wszystkiego, co „uczy się" czegoś z danych.

## Zwiększasz k w KNN z 1 do 50. Opisz, jak zmienia się granica decyzyjna i co dzieje się z obciążeniem oraz wariancją.

**k = 1:** granica opływa każdy pojedynczy punkt, łącznie z błędnie oznaczonymi.
Powstają wysepki jednej klasy w środku obszaru drugiej. Błąd treningowy wynosi
zero (najbliższym sąsiadem punktu jest on sam), błąd testowy jest wysoki.

**k rosnące:** granica się wygładza, wysepki znikają, model przestaje reagować
na pojedyncze obserwacje.

**k = 50:** granica jest bardzo gładka, ale zaczyna ignorować prawdziwą lokalną
strukturę — małe, ale realne skupisko jednej klasy zostaje przegłosowane przez
sąsiadów z drugiej.

W języku obciążenia i wariancji: rosnące `k` **zwiększa obciążenie** (model
zakłada, że okolica jest jednorodna na coraz większym obszarze) i **zmniejsza
wariancję** (wynik coraz mniej zależy od konkretnej próbki treningowej). Szukamy
minimum sumy — stąd dobór `k` przez walidację krzyżową.

W skrajności `k` = liczba obserwacji daje zawsze klasę większościową: maksymalne
obciążenie, zerowa wariancja.

## Kiedy walidacja krzyżowa jest lepsza od pojedynczego podziału train/test, a kiedy jest zbędnym kosztem?

**Lepsza**, gdy danych jest mało. Przy 200 obserwacjach pojedynczy podział 80/20
daje 40-elementowy test — wynik zależy wtedy głównie od tego, które 40 wierszy
wylosowałeś, i potrafi się wahać o kilkanaście punktów procentowych. Cross-walidacja
uśrednia po `k` podziałach, więc ocena jest znacznie stabilniejsza. Konieczna
też przy strojeniu hiperparametrów, żeby nie dopasować ich do jednego splitu.

**Zbędna**, gdy danych jest dużo (dziesiątki tysięcy — pojedynczy test jest już
wtedy reprezentatywny), gdy trening jest kosztowny (`k`-krotny koszt sieci
głębokiej rzadko się opłaca) albo gdy dane mają strukturę czasową i i tak
musisz walidować „po czasie", nie losowo.

Dodatkowa uwaga: przy danych zgrupowanych (kilka zdjęć tego samego obiektu)
zwykły `KFold` sam w sobie tworzy wyciek — potrzebny `GroupKFold`.

## Masz dwa modele: prosty z F1 0,81 i złożony z F1 0,84. Jakie pytania zadasz, zanim wybierzesz drugi?

**Czy ta różnica jest realna?** Jaki jest rozrzut między foldami walidacji?
Jeśli odchylenie wynosi ±0,03, to 0,81 i 0,84 są nierozróżnialne i wybierasz
prostszy.

**Ile kosztuje?** Czas treningu, czas predykcji, złożoność wdrożenia,
utrzymanie. Trzy setne punktu rzadko usprawiedliwiają potok, którego nikt poza
tobą nie umie odpalić.

**Czy da się wyjaśnić decyzję?** W wielu domenach — medycyna, kredyty, ocena
bezpieczeństwa konstrukcji — model musi być uzasadnialny. Regresja logistyczna
z odczytywalnymi współczynnikami bywa warta więcej niż lepszy o 3% czarny box.

**Gdzie leżą błędy?** Może prostszy model myli się na przypadkach nieistotnych,
a złożony na krytycznych. Sama zbiorcza metryka tego nie pokaże.

Domyślnie wygrywa prostszy model, chyba że złożony ma **wyraźną** przewagę —
ciężar dowodu leży po jego stronie.

## [code] Zaimplementuj KNN od zera (bez sklearn) i porównaj wyniki z `KNeighborsClassifier` na tym samym zbiorze.

```python
import numpy as np
from collections import Counter
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier

class MojKNN:
    def __init__(self, k=5):
        self.k = k

    def fit(self, X, y):
        # KNN nie ma treningu - zapamiętuje zbiór.
        self.X, self.y = np.asarray(X), np.asarray(y)
        return self

    def predict(self, X):
        wyniki = []
        for punkt in np.asarray(X):
            odleglosci = np.sqrt(((self.X - punkt) ** 2).sum(axis=1))
            najblizsi = self.y[np.argsort(odleglosci)[:self.k]]
            wyniki.append(Counter(najblizsi).most_common(1)[0][0])
        return np.array(wyniki)

X, y = load_iris(return_X_y=True)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0)

moj = MojKNN(5).fit(Xtr, ytr).predict(Xte)
ich = KNeighborsClassifier(5).fit(Xtr, ytr).predict(Xte)
print("zgodność:", (moj == ich).mean(), "| accuracy:", (moj == yte).mean())
```

Zgodność powinna wynieść 1,0. Drobne rozjazdy biorą się z **remisów** —
przy parzystym `k` albo równej liczbie głosów sklearn rozstrzyga inaczej niż
`Counter.most_common`. Zauważ też, że `fit` nic nie liczy, a cały koszt siedzi
w `predict` — odwrotnie niż w większości modeli.

## Wyjaśnij ROC AUC komuś nietechnicznemu, nie używając słów "krzywa" ani "próg".

Wyobraź sobie, że model każdemu przypadkowi wystawia ocenę „jak bardzo podejrzewam,
że to awaria". Bierzemy losowo jedną prawdziwą awarię i losowo jeden sprawny
element i pytamy: **czy model dał awarii wyższą ocenę?**

AUC to odsetek takich par, w których model ustawił je we właściwej kolejności.

0,5 znaczy, że radzi sobie jak rzut monetą — równie często stawia awarię wyżej,
co niżej. 1,0 znaczy, że **każda** awaria dostaje wyższą ocenę niż każdy sprawny
element. 0,8 znaczy, że w ośmiu na dziesięć takich par kolejność jest poprawna.

Zaleta: mierzy samą zdolność rozróżniania, niezależnie od tego, gdzie postawimy
granicę „alarmujemy / nie alarmujemy" — a tę granicę i tak ustala się osobno,
patrząc na koszty pomyłek.

## Twoje wyniki walidacyjne są świetne, a na nowych danych model wysiada. Wymień cztery hipotezy i sposób sprawdzenia każdej.

**Wyciek danych.** Jakaś cecha niesie informację niedostępną w momencie predykcji.
Sprawdzenie: przejrzyj ranking ważności cech — jeśli na górze siedzi identyfikator,
data albo coś wyliczonego po fakcie, masz sprawcę. Odtwórz też potok od zera,
pilnując, żeby każdy `fit` był tylko na treningu.

**Przesunięcie rozkładu.** Nowe dane pochodzą z innego okresu, urządzenia,
populacji. Sprawdzenie: porównaj rozkłady cech (histogramy, testy statystyczne)
między zbiorem treningowym a nowym; wytrenuj klasyfikator odróżniający „stare"
od „nowych" — jeśli mu się to udaje, rozkłady się rozjechały.

**Zły podział walidacyjny.** Zgrupowane albo czasowo powiązane obserwacje trafiły
po obu stronach. Sprawdzenie: powtórz walidację z `GroupKFold` albo podziałem po
czasie i zobacz, czy wynik spadnie do poziomu produkcyjnego. Jeśli tak — masz
odpowiedź.

**Przeuczenie do zbioru walidacyjnego.** Sto podejść do strojenia
hiperparametrów na tym samym zbiorze walidacyjnym sprawia, że wybrałeś model
pasujący do niego przypadkiem. Sprawdzenie: odłóż zbiór, którego nigdy nie
używałeś, i oceń na nim raz.
