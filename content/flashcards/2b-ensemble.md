# Faza 2b — Ensemble methods

## Bagging a boosting — czym się różnią?
**Bagging** uczy modele **równolegle** na losowych próbkach ze zwracaniem
i uśrednia wyniki — redukuje głównie **wariancję**. **Boosting** uczy modele
**sekwencyjnie**, każdy kolejny naprawia błędy poprzedników — redukuje
głównie **obciążenie**, ale łatwiej przeucza.

## Jak działa Random Forest?
Wiele głębokich drzew, każde uczone na bootstrapowej próbce danych, a przy
**każdym podziale** rozważany jest tylko losowy podzbiór cech. Predykcja to
głosowanie lub średnia. Dwa źródła losowości dekorelują drzewa, dzięki czemu
uśrednianie realnie zbija wariancję.

## Po co Random Forest losuje cechy przy podziale?
Bez tego wszystkie drzewa wybierałyby u góry tę samą, najsilniejszą cechę
i byłyby do siebie bardzo podobne. Uśrednianie skorelowanych modeli prawie
nie zmniejsza wariancji — losowanie cech wymusza różnorodność.

## Czym jest OOB (out-of-bag)?
Próbka bootstrapowa pomija średnio ok. 37% obserwacji (granica `1/e`).
Te pominięte obserwacje służą jako zbiór walidacyjny dla danego drzewa,
co daje ocenę modelu **bez osobnego splitu ani cross-walidacji**.

## Dlaczego feature importance z drzew bywa myląca?
Domyślna ważność liczona ze spadku nieczystości jest **obciążona w stronę
cech o wielu unikalnych wartościach** (ciągłych, wysokokardynalnych) i
rozdziela zasługi losowo między cechy skorelowane. Uczciwsza alternatywa:
permutation importance liczona na zbiorze testowym.

## Na czym polega gradient boosting?
Kolejne słabe modele (zwykle płytkie drzewa) uczą się przewidywać
**gradient straty** względem dotychczasowej predykcji — dla błędu
kwadratowego są to po prostu reszty. Każdy model dokłada poprawkę
przemnożoną przez współczynnik uczenia.

## Co robi `learning_rate` w boostingu?
Skaluje wkład każdego kolejnego drzewa. Mała wartość = ostrożne kroki,
lepsza generalizacja, ale potrzeba więcej drzew. Występuje kompromis
z `n_estimators`: obniżając `learning_rate`, podnieś liczbę drzew.

## Dlaczego drzewa nie potrzebują skalowania cech?
Podział ma postać "cecha ≤ próg" i zależy wyłącznie od **porządku**
wartości, a nie od ich skali. Monotoniczne przekształcenie cechy nie zmieni
struktury drzewa. Skalowanie jest konieczne dla metod odległościowych
i gradientowych na wagach.

## `GridSearchCV` a `RandomizedSearchCV`
Grid sprawdza **wszystkie** kombinacje z siatki — pewny, ale koszt rośnie
wykładniczo z liczbą hiperparametrów. Randomized losuje zadaną liczbę
kombinacji z rozkładów; przy wielu parametrach, z których liczy się tylko
kilka, zwykle znajduje porównywalny wynik dużo taniej.

## One-hot a target encoding
**One-hot** tworzy kolumnę na kategorię — bezpieczne, ale przy wysokiej
kardynalności rozdmuchuje wymiar. **Target encoding** zastępuje kategorię
statystyką zmiennej celu — zwięzłe, ale **łatwo o wyciek danych**, więc
musi być liczone wewnątrz foldów walidacji.

## Po co model bazowy (baseline) przed ensemblem?
Żeby wiedzieć, czy skomplikowany model cokolwiek wnosi. Jeśli XGBoost bije
regresję logistyczną o 0,3 punktu procentowego, ale kosztuje interpretowalność
i czas — to nie jest wygrana. Baseline zamienia "wynik" w "wynik względem
czegoś".
