# Faza 2b — materiały

## [book] An Introduction to Statistical Learning — rozdział 8
https://www.statlearning.com/
Drzewa, bagging, Random Forest i boosting w jednym rozdziale, z intuicją
stojącą za każdą metodą. Punkt wyjścia do tej fazy.

## [docs] scikit-learn: metody zespołowe
https://scikit-learn.org/stable/modules/ensemble.html
Random Forest, ExtraTrees, gradient boosting i HistGradientBoosting.
Sekcja o ważności cech zawiera ostrzeżenie o obciążeniu ważności liczonej
ze spadku nieczystości — to jest odpowiedź na pytanie o ID klienta.

## [docs] scikit-learn: permutation importance
https://scikit-learn.org/stable/modules/permutation_importance.html
Uczciwsza alternatywa dla domyślnej ważności cech, wraz z wyjaśnieniem,
dlaczego ta domyślna myli przy cechach o wielu unikalnych wartościach.

## [docs] scikit-learn: strojenie hiperparametrów
https://scikit-learn.org/stable/modules/grid_search.html
GridSearchCV kontra RandomizedSearchCV, w tym uzasadnienie, dlaczego przy
wielu parametrach losowanie bije siatkę przy tym samym budżecie.

## [docs] XGBoost: dokumentacja i wprowadzenie
https://xgboost.readthedocs.io/en/stable/tutorials/model.html
Wyprowadzenie boostingu jako optymalizacji funkcji straty. Dalej sekcja
o parametrach — zwłaszcza zależność learning_rate i n_estimators.

## [article] scikit-learn: kodowanie zmiennych kategorycznych
https://scikit-learn.org/stable/modules/preprocessing.html#encoding-categorical-features
One-hot, ordinal i target encoding wraz z wyjaśnieniem, czemu ten ostatni
musi być liczony wewnątrz foldów walidacji.

## [docs] scikit-learn: feature engineering dla danych tabelarycznych
https://scikit-learn.org/stable/modules/preprocessing.html
Skalowanie, dyskretyzacja, cechy wielomianowe, transformacje nieliniowe.
Do przejrzenia pod kątem tego, co drzewom jest zbędne, a modelom liniowym nie.

## [docs] scikit-learn: partial dependence i ICE plots
https://scikit-learn.org/stable/modules/partial_dependence.html
Permutation importance mówi, **które** cechy są ważne; to mówi, **jak** wpływają
na predykcję. Przy danych z budownictwa kierunek zależności („powyżej jakiej
wilgotności jakość spada") jest użyteczniejszy niż sam ranking słupków.

## [docs] scikit-learn: wybór metryki w walidacji (scoring)
https://scikit-learn.org/stable/modules/model_evaluation.html
Który `scoring` podać do GridSearchCV i dlaczego domyślne `accuracy` bywa
pułapką. Kluczowe przy niezbalansowanych klasach — a wykrywanie wad zawsze
takie jest: model, który mówi „bez wady", ma świetną dokładność i zero wartości.
