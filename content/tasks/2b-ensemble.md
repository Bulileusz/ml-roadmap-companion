# Faza 2b — Ensemble methods

## Odtwórz przykłady lasu losowego z dokumentacji i pokręć liczbą drzew
Przepisz ręcznie do skryptu `01_rf_z_dokumentacji.py` przykłady `RandomForestClassifier` i `RandomForestRegressor` z „scikit-learn: metody zespołowe" (sekcja o lasach zrandomizowanych drzew), podstawiając dowolny wbudowany zbiór z `sklearn.datasets`. Uruchom każdy z nich dla `n_estimators` równego 1, 10 i 200, za każdym razem wypisując score na zbiorze testowym i czas treningu.
Gotowe, gdy skrypt wypisuje sześć par (score, czas), a wynik dla 200 drzew jest lepszy niż dla jednego w obu zadaniach.

## Narysuj, jak drzewo się przeucza, a las nie
Przeczytaj z „An Introduction to Statistical Learning" rozdział 8 sekcje o drzewach i baggingu, a potem wytrenuj `DecisionTreeClassifier` dla `max_depth` od 1 do 20 i `RandomForestClassifier` z tymi samymi głębokościami, zapisując dla każdej wartości błąd treningowy i testowy. Narysuj cztery krzywe na jednym wykresie przez interfejs obiektowy Matplotlib.
Gotowe, gdy wykres jest zapisany do PNG, błąd treningowy drzewa dochodzi do zera, a Ty wskazujesz w komentarzu głębokość, od której krzywa testowa drzewa zaczyna rosnąć, i wartość, przy której krzywa lasu się wypłaszcza.

## Zmierz OOB error i sprawdź, co naprawdę robi max_features
Włącz `oob_score=True` i policz OOB error w funkcji `n_estimators` od 10 do 500, a potem powtórz cały eksperyment dla `max_features` z listy `["sqrt", "log2", 0.5, 1.0]`. Parametry lasu opisuje „scikit-learn: metody zespołowe", a uzasadnienie dekorelacji drzew — rozdział 8 „An Introduction to Statistical Learning".
Gotowe, gdy wykres ma cztery krzywe OOB, skrypt wypisuje liczbę drzew, po której każda z nich przestaje spadać, a Ty tłumaczysz w komentarzu własnymi słowami, dlaczego `max_features=1.0` daje inny przebieg niż `sqrt`.

## Skonfrontuj feature_importances_ z permutation importance
Dołóż do zbioru sztuczną kolumnę o wysokiej kardynalności (losowe ID) i jedną kolumnę czysto losową, wytrenuj las i policz dwa rankingi ważności: `feature_importances_` oraz `permutation_importance` liczone osobno na train i na test, zgodnie z „scikit-learn: permutation importance". Narysuj oba rankingi obok siebie jako poziome słupki.
Gotowe, gdy skrypt drukuje trzy rankingi, kolumna z losowym ID stoi wysoko w importance z impurity i nisko w permutation importance na zbiorze testowym, a Ty zapisałeś w komentarzu, skąd bierze się ta różnica.

## SKŁADAJĄCE — puść las na zbiorze z Fazy 2 i zestaw go z baseline
Weź ten sam zbiór, ten sam podział i ten sam `random_state` co w baseline z Fazy 2, wytrenuj Random Forest z domyślnymi parametrami i policz dokładnie te same metryki co poprzednio. Do skryptu dołóż permutation importance pięciu najważniejszych cech i pomiar czasu treningu.
Gotowe, gdy skrypt wypisuje tabelkę baseline vs Random Forest z metrykami i czasami, zapisuje ją do `wyniki.csv`, a Ty potrafisz podać różnicę metryki z pamięci.

## Zakoduj kategorie na trzy sposoby i zobacz, który wygrywa
Na zbiorze z kolumnami kategorycznymi (np. `titanic` albo dane z pracy) zbuduj trzy warianty wejścia: `OneHotEncoder`, `OrdinalEncoder` i `TargetEncoder`, korzystając z „scikit-learn: kodowanie zmiennych kategorycznych". Wytrenuj na każdym wariancie ten sam las i porównaj metrykę oraz liczbę kolumn po transformacji.
Gotowe, gdy skrypt wypisuje trzy trójki (nazwa enkodera, liczba kolumn, metryka) i nie wywala się na kategorii, która występuje tylko w zbiorze testowym — bo ustawiłeś `handle_unknown`.

## Zamknij preprocessing w Pipeline i pokaż różnicę wobec wycieku
Zbuduj `ColumnTransformer` z imputacją i skalowaniem dla kolumn liczbowych oraz kodowaniem dla kategorycznych, a potem wepnij go w `Pipeline` razem z modelem; materiał: „scikit-learn: feature engineering dla danych tabelarycznych". Policz cross-validation dwa razy: raz z transformacjami wykonanymi na całych danych przed podziałem, raz z tymi samymi transformacjami wewnątrz pipeline w `cross_val_score`.
Gotowe, gdy skrypt wypisuje obie wartości wraz z różnicą, cały model trenuje się jednym wywołaniem `fit(X_train, y_train)`, a w kodzie poza pipeline nie ma ani jednego `fit_transform` na pełnych danych.

## Dorzuć własne cechy i sprawdź, czy którakolwiek pomaga
Z „scikit-learn: feature engineering dla danych tabelarycznych" weź `PolynomialFeatures`, `KBinsDiscretizer` i `SplineTransformer` i dołóż co najmniej pięć nowych cech: dwie interakcje, jedno binowanie, jedną cechę cykliczną lub splajn i jedną wyliczoną z wiedzy domenowej. Porównaj cross-validation tego samego pipeline przed i po dołożeniu cech.
Gotowe, gdy skrypt wypisuje obie metryki oraz permutation importance nowych cech i wskazuje z imienia co najmniej jedną cechę, która nie wniosła nic.

## SKŁADAJĄCE — zamknij przygotowanie danych w moduł `cechy.py`
Napisz moduł z funkcją `zbuduj_pipeline(kolumny_num, kolumny_kat, model)`, która zwraca gotowy `Pipeline` z imputacją, kodowaniem kategorii i transformacjami cech z trzech poprzednich zadań, oraz `main`, który wczytuje CSV, uruchamia cross-validation lasu i drukuje wynik. Funkcje mają nie modyfikować wejściowej ramki i nie zawierać nazw kolumn na sztywno — typy kolumn wykrywaj przez `select_dtypes`.
Gotowe, gdy `python cechy.py dane.csv` działa na dwóch różnych plikach bez zmiany w kodzie, a wynik na zbiorze z Fazy 2 jest nie gorszy niż w zadaniu składającym z Random Forest.

## Zbuduj boosting ręcznie na resztach i porównaj z gotowym
Na podstawie opisu boostingu z rozdziału 8 „An Introduction to Statistical Learning" napisz pętlę, która trenuje po kolei 200 płytkich drzew (`max_depth=2`) na resztach dotychczasowej predykcji i sumuje je z `learning_rate=0.1`, zapisując błąd testowy po każdej iteracji. Zestaw swoją krzywą z `GradientBoostingRegressor` i `HistGradientBoostingRegressor` z „scikit-learn: metody zespołowe".
Gotowe, gdy wykres pokazuje trzy krzywe błędu w funkcji liczby drzew, Twoja implementacja leży blisko `GradientBoostingRegressor`, a skrypt wypisuje czasy treningu, z których widać przewagę wariantu histogramowego.

## Wytrenuj pierwszy model XGBoost i zatrzymaj go early stoppingiem
Zainstaluj `xgboost` i przejdź wprowadzający przykład z „XGBoost: dokumentacja i wprowadzenie", trenując model na swoim zbiorze z `eval_set`, `eval_metric` i early stoppingiem, a potem wyciągnij `evals_result()` i narysuj krzywe błędu dla train i valid. Uruchom to samo raz jeszcze z `learning_rate` dziesięć razy mniejszym.
Gotowe, gdy wykres pokazuje moment rozjazdu obu krzywych, a skrypt wypisuje `best_iteration` i wynik najlepszej iteracji dla obu wartości `learning_rate`.

## Zmierz, ile daje GPU w XGBoost
Uruchom ten sam model cztery razy — `device="cpu"` i `device="cuda"` przy `tree_method="hist"`, dla `n_estimators` 500 i 2000 — mierząc czas treningu i podglądając `nvidia-smi` w trakcie. Ustawienia sprzętowe opisuje „XGBoost: dokumentacja i wprowadzenie".
Gotowe, gdy skrypt drukuje tabelkę cztery przebiegi × czas × metryka, metryki CPU i GPU zgadzają się co do trzeciego miejsca po przecinku, a Ty odczytujesz z tabelki stosunek przyspieszenia osobno dla 500 i 2000 drzew.

## Przekręć hiperparametry XGBoosta pojedynczo i zobacz, który boli
Zrób sweep one-factor-at-a-time: dla każdego z parametrów `learning_rate`, `max_depth`, `min_child_weight`, `subsample`, `colsample_bytree` i `reg_lambda` przelicz po pięć wartości, trzymając resztę na domyślnych, i zapisuj metrykę walidacyjną oraz `best_iteration`. Znaczenie parametrów sprawdzaj w „XGBoost: dokumentacja i wprowadzenie", nie zgadując.
Gotowe, gdy masz siatkę 2×3 wykresów metryki w funkcji wartości parametru, a skrypt wypisuje trzy parametry o największym rozrzucie wyniku wraz z liczbami.

## SKŁADAJĄCE — spakuj cechy i XGBoosta w jeden trenowalny skrypt
Napisz `trenuj.py`, który bierze pipeline z `cechy.py`, wstawia w niego XGBoosta z parametrami dobranymi ręcznie w poprzednim zadaniu, liczy cross-validation z metrykami per fold i zapisuje wytrenowany model przez `joblib`. Skrypt ma przyjmować ścieżkę do danych i ścieżkę wyjściową modelu jako argumenty.
Gotowe, gdy `python trenuj.py dane.csv model.joblib` drukuje średnią i odchylenie metryki po foldach, zapisuje plik modelu, a wczytany z dysku model zwraca na zbiorze testowym predykcje identyczne z tymi sprzed zapisu.

## Przeszukaj siatkę GridSearchCV i policz jej koszt
Na podstawie „scikit-learn: strojenie hiperparametrów" owiń cały pipeline w `GridSearchCV` z siatką 3×3×3 (parametry adresowane przez `nazwa_kroku__parametr`), `cv=5`, `scoring` dopasowanym do zadania i `n_jobs=-1`. Wypisz `best_params_`, `best_score_` i pięć najlepszych wierszy z `cv_results_` wraz z `std_test_score`.
Gotowe, gdy skrypt drukuje te pięć wierszy, łączny czas przeszukiwania oraz liczbę wytrenowanych modeli policzoną ręcznie i zestawioną z `len(cv_results_["params"])` — obie liczby muszą się zgadzać.

## Zderz RandomizedSearchCV z GridSearchCV na tym samym budżecie
Zamień dyskretną siatkę na rozkłady (`loguniform` dla `learning_rate` i `reg_lambda`, `randint` dla `max_depth`) i uruchom `RandomizedSearchCV` dwa razy: z `n_iter` równym liczbie punktów poprzedniej siatki i z połową tej liczby. Sekcja o randomized search jest w „scikit-learn: strojenie hiperparametrów".
Gotowe, gdy skrypt wypisuje trzy wiersze (grid, random pełny budżet, random pół budżetu) z najlepszym wynikiem i czasem, a Ty przed uruchomieniem zapisałeś w komentarzu, który wariant wygra, i sprawdziłeś, czy trafiłeś.

## Zbierz wszystkie modele fazy w jedną tabelę porównawczą
Na jednym zbiorze, jednym podziale i jednym `random_state` przelicz baseline z Fazy 2, Random Forest, HistGradientBoosting i strojonego XGBoosta tą samą procedurą cross-validation, zapisując metrykę, odchylenie po foldach, czas treningu i czas predykcji. Wynik zapisz jako plik Markdown z tabelą i wykres słupkowy z errorbarami.
Gotowe, gdy powstaje `porownanie.md` z tabelą czterech modeli i wykresem, a Ty odpowiadasz w nim jednym zdaniem, czy przewaga boostingu nad lasem przekracza rozrzut między foldami.

## Test końcowy — zbuduj model zespołowy na nieznanym zbiorze tabelarycznym
Weź zbiór tabelaryczny, którego nie otwierałeś w tej fazie (dane z pracy albo wbudowany zbiór z seaborn lub `sklearn.datasets`) i w jeden wieczór przejdź od surowego pliku do finalnego modelu: preprocessing w pipeline, baseline, las, boosting, jedno przeszukanie hiperparametrów i permutation importance. Wolno importować własny `cechy.py`; zamknięte mają być dokumentacja scikit-learn i XGBoosta oraz wcześniejsze skrypty — dozwolone tylko `?`, `help()` i uzupełnianie w notebooku.
Gotowe, gdy jeden notebook wypisuje tabelę czterech modeli, wykres ważności cech i pięć wniosków w komórce Markdown, model finalny bije baseline na tym samym podziale, a liczba momentów, w których otworzyłeś przeglądarkę, wynosi zero.

---

