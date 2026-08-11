# Faza 2b — pytania sprawdzające

## Dlaczego uśrednienie stu bardzo podobnych do siebie drzew prawie nie zmniejsza wariancji? Co Random Forest z tym robi?

Uśrednianie zbija wariancję tylko wtedy, gdy błędy składników są **niezależne** —
wtedy się wzajemnie znoszą. Wariancja średniej z `n` niezależnych zmiennych
maleje `n`-krotnie. Ale gdy modele są silnie skorelowane, ich błędy idą w tę samą
stronę: jeśli wszystkie drzewa mylą się na tym samym przypadku, średnia myli się
dokładnie tak samo. W granicy identycznych drzew uśrednienie nie daje nic.

Random Forest wprowadza więc **dwa niezależne źródła losowości**, żeby drzewa
się rozjechały: bootstrapową próbkę obserwacji dla każdego drzewa **oraz** losowy
podzbiór cech rozważany przy każdym podziale. To drugie jest kluczowe — bez niego
wszystkie drzewa wybierałyby u góry tę samą, najsilniejszą cechę i wyszłyby
niemal identyczne.

## Random Forest redukuje głównie wariancję, boosting głównie obciążenie. Jak ta różnica wpływa na to, który wybierzesz przy małym, zaszumionym zbiorze?

Przy małym i zaszumionym zbiorze wybierz **Random Forest**.

Boosting uczy każdy kolejny model na błędach poprzedników. W zaszumionych danych
duża część tych błędów to szum i błędne etykiety — więc boosting konsekwentnie
skupia się na dopasowaniu do szumu. To dokładnie mechanizm przeuczenia, a przy
małej próbce nie ma co go zrównoważyć.

Random Forest uśrednia niezależne drzewa, a uśrednianie z natury tłumi szum.
Do tego daje ocenę OOB, więc przy małym zbiorze nie musisz odkrawać osobnej
części na walidację.

Boosting wygrywa, gdy danych jest dużo, są względnie czyste, a zależności złożone
— i gdy masz czas na staranne strojenie `learning_rate`, liczby drzew i early
stoppingu.

## Feature importance wskazuje jako najważniejsze ID klienta. Co poszło nie tak i jak to zweryfikujesz?

Dwie możliwe przyczyny, obie warte sprawdzenia.

**Wyciek danych.** Identyfikator koreluje z celem, bo został nadany po fakcie —
np. numery przydzielane chronologicznie, a przypadki pozytywne pochodzą
z konkretnego okresu. Model uczy się „wysokie ID = awaria" i na nowych danych
się przewróci.

**Obciążenie samej metryki.** Domyślna ważność liczona ze spadku nieczystości
faworyzuje cechy o **wielu unikalnych wartościach** — a identyfikator ma ich
tyle, ile wierszy. Taka cecha daje mnóstwo możliwych progów podziału, więc
przypadkiem trafi w podziały wyglądające na dobre, nawet gdy jest czystym szumem.

Weryfikacja: policz **permutation importance na zbiorze testowym** — losowe
przetasowanie wartości kolumny i pomiar spadku jakości. Jeśli ID dalej wychodzi
ważne, masz wyciek. Jeśli ważność znika, to był artefakt metryki. Niezależnie od
wyniku: **usuń identyfikator z cech**, on nigdy nie powinien tam być.

## Obniżasz `learning_rate` z 0,3 do 0,03 i wyniki się pogarszają. Co prawdopodobnie przeoczyłeś?

Liczbę drzew. `learning_rate` skaluje wkład każdego kolejnego drzewa — dziesięć
razy mniejszy krok wymaga **mniej więcej dziesięć razy więcej** drzew, żeby
dojść w to samo miejsce. Zostawiając `n_estimators` bez zmian, zatrzymałeś
trening w połowie drogi: model jest niedouczony, nie przeuczony.

Objaw potwierdzający: błąd treningowy **i** testowy są wysokie, a krzywa uczenia
wciąż opada w momencie zatrzymania.

Praktycznie: obniżając `learning_rate`, podnieś `n_estimators` proporcjonalnie
i użyj early stoppingu na zbiorze walidacyjnym, żeby liczba drzew dobrała się
sama zamiast być zgadywana.

## [code] Porównaj Random Forest i gradient boosting na tym samym zbiorze, mierząc jakość i czas treningu. Który wygrywa i jakim kosztem?

```python
import time
from sklearn.datasets import make_classification
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.model_selection import cross_val_score

X, y = make_classification(n_samples=20000, n_features=30, n_informative=10,
                           random_state=0)

for nazwa, model in [
    ("RandomForest", RandomForestClassifier(n_estimators=300, n_jobs=-1, random_state=0)),
    ("HistGradientBoosting", HistGradientBoostingClassifier(random_state=0)),
]:
    start = time.perf_counter()
    wyniki = cross_val_score(model, X, y, cv=5, scoring="roc_auc")
    print(f"{nazwa:22} AUC {wyniki.mean():.4f} ±{wyniki.std():.4f}  "
          f"czas {time.perf_counter() - start:.1f}s")
```

Czego szukać: boosting zwykle wygrywa jakością na danych tabelarycznych, ale
**porównaj różnicę z odchyleniem między foldami**. Jeśli przewaga mieści się
w rozrzucie, to nie jest przewaga. Zwróć uwagę, że las zrównolegla się liniowo
(`n_jobs=-1`), bo drzewa są niezależne, a boosting jest z natury sekwencyjny.

Prawdziwy koszt boostingu to nie czas jednego treningu, tylko **strojenie**:
las z domyślnymi ustawieniami jest zwykle blisko optimum, boosting bez
dostrojenia `learning_rate` i liczby drzew potrafi wypaść gorzej od lasu.

## Dlaczego target encoding trzeba liczyć wewnątrz foldów walidacji, a one-hot nie?

Bo target encoding **korzysta ze zmiennej celu**. Zastępując kategorię średnią
wartością celu w tej kategorii, wpuszczasz do cechy informację o etykietach —
w tym o etykietach wierszy, na których zaraz będziesz oceniać model. W skrajnym
przypadku, gdy kategoria występuje raz, jej zakodowana wartość to po prostu
etykieta tego wiersza, więc model dostaje odpowiedź na wejściu.

One-hot patrzy **wyłącznie na samą kolumnę kategoryczną** — jakie wartości
występują. Nie dotyka `y`, więc nie ma czego przeciekać. (Ostrożność i tak jest
wskazana: kategoria widziana tylko w teście da kolumnę nieznaną modelowi —
to jednak problem zgodności, nie wycieku.)

Praktycznie: target encoding zawsze wewnątrz `Pipeline`, ze wygładzaniem
i liczony na foldach treningowych — w sklearn `TargetEncoder` robi to
wewnętrznie przez walidację krzyżową.

## Masz 30 hiperparametrów do przeszukania. Uzasadnij wybór między GridSearchCV a RandomizedSearchCV liczbami, nie intuicją.

Grid sprawdza **iloczyn** wszystkich wartości. Nawet gdyby każdy z 30
parametrów miał tylko 2 wartości, to 2³⁰ ≈ **miliard** kombinacji, każda
mnożona przez `k` foldów. Przy sekundzie na trening to ponad 30 lat. Grid jest
tu fizycznie niewykonalny.

Randomized losuje ustaloną liczbę kombinacji, więc koszt **ustalasz ty**, nie
wymiarowość siatki — 200 losowań to 200 treningów, niezależnie czy parametrów
jest 5 czy 30.

Argument merytoryczny, nie tylko kosztowy: zwykle **kilka parametrów odpowiada
za prawie cały efekt**, reszta niewiele zmienia. Grid marnuje budżet na
przeszukiwanie nieistotnych wymiarów w drobnej siatce, losowanie próbkuje każdy
istotny parametr w wielu różnych wartościach za ten sam koszt.

Przy 30 parametrach: Randomized na start, potem ewentualnie wąski grid wokół
najlepszego obszaru dla dwóch–trzech parametrów, które okazały się ważne.

## Dlaczego drzewa nie potrzebują skalowania, a KNN i regresja logistyczna tak? Odpowiedz przez pryzmat tego, co każdy z tych modeli liczy.

**Drzewo** zadaje pytania postaci „cecha ≤ próg" i wybiera próg maksymalizujący
czystość podziału. Liczy się wyłącznie **porządek** wartości — które obserwacje
są po której stronie. Pomnożenie kolumny przez 1000 przesuwa próg o tyle samo
i daje identyczne drzewo. Każde monotoniczne przekształcenie jest niewidoczne.

**KNN** liczy **odległości**, czyli sumuje kwadraty różnic po wszystkich cechach.
Kolumna w zakresie 0–100 000 wnosi do tej sumy miliony, kolumna 0–1 wnosi ułamki
— odległość mierzy w praktyce tylko tę pierwszą, choćby była nieistotna.
Skalowanie jest tu obowiązkowe.

**Regresja logistyczna** działa poprawnie bez skalowania w sensie samego
dopasowania, ale: gradient descent zbiega znacznie wolniej, gdy cechy mają
różne rzędy wielkości (funkcja straty tworzy wydłużoną „dolinę"), a **regularyzacja
L1/L2 karze wagi jednakowo** — więc cecha o dużej skali dostaje małą wagę
i jest karana słabiej niż powinna. Ze skalowaniem regularyzacja traktuje cechy
sprawiedliwie.

## XGBoost bije twój baseline z Fazy 2 o 0,4 punktu procentowego. Czy to wystarczający powód, żeby go wdrożyć? Co jeszcze rozważysz?

Sama liczba niczego nie rozstrzyga. Najpierw: **jaki jest rozrzut między
foldami?** Jeśli odchylenie standardowe wynosi ±0,8 pp, to 0,4 pp mieści się
w szumie i przewaga może nie istnieć. Sprawdź to, zanim zaczniesz cokolwiek
rozważać.

Jeśli przewaga jest realna, pozostają koszty: **interpretowalność** (regresja
logistyczna daje współczynniki do obrony przed audytem, XGBoost wymaga SHAP-a),
**utrzymanie** (jedna zależność więcej, strojenie przy każdym odświeżeniu
danych), **czas predykcji** oraz **wrażliwość na przesunięcie rozkładu** —
model o większej pojemności zwykle gorzej znosi zmianę danych w czasie.

I pytanie kontrolne: **czy 0,4 pp cokolwiek zmienia w zastosowaniu?** Jeśli
próg decyzyjny i tak ustawia człowiek, a koszt błędu jest asymetryczny, ta
różnica może być nieodczuwalna.

Domyślnie zostaje baseline. Model złożony musi udowodnić, że jest wart swojego
kosztu — nie odwrotnie.
