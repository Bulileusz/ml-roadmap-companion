# Faza 2b — pytania sprawdzające

## Dlaczego uśrednienie stu bardzo podobnych do siebie drzew prawie nie zmniejsza wariancji? Co Random Forest z tym robi?

## Random Forest redukuje głównie wariancję, boosting głównie obciążenie. Jak ta różnica wpływa na to, który wybierzesz przy małym, zaszumionym zbiorze?

## Feature importance wskazuje jako najważniejsze ID klienta. Co poszło nie tak i jak to zweryfikujesz?

## Obniżasz `learning_rate` z 0,3 do 0,03 i wyniki się pogarszają. Co prawdopodobnie przeoczyłeś?

## [code] Porównaj Random Forest i gradient boosting na tym samym zbiorze, mierząc jakość i czas treningu. Który wygrywa i jakim kosztem?

## Dlaczego target encoding trzeba liczyć wewnątrz foldów walidacji, a one-hot nie?

## Masz 30 hiperparametrów do przeszukania. Uzasadnij wybór między GridSearchCV a RandomizedSearchCV liczbami, nie intuicją.

## Dlaczego drzewa nie potrzebują skalowania, a KNN i regresja logistyczna tak? Odpowiedz przez pryzmat tego, co każdy z tych modeli liczy.

## XGBoost bije twój baseline z Fazy 2 o 0,4 punktu procentowego. Czy to wystarczający powód, żeby go wdrożyć? Co jeszcze rozważysz?
