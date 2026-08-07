# Faza 2 — materiały

## [book] An Introduction to Statistical Learning (ISLP, wersja pythonowa)
https://www.statlearning.com/
Darmowy PDF. Pozycja podstawowa dla tej fazy. Rozdział 2 — kompromis
obciążenie–wariancja, 3 — regresja liniowa, 4 — regresja logistyczna i KNN,
5 — walidacja krzyżowa. Ćwiczenia konceptualne na końcu rozdziałów świetnie
nadają się do banku pytań.

## [docs] scikit-learn: User Guide — uczenie nadzorowane
https://scikit-learn.org/stable/supervised_learning.html
Referencja do sprawdzania, co dokładnie robi dany model i jakie ma parametry.
Nie do czytania od deski do deski — do zaglądania przy każdym nowym estymatorze.

## [docs] scikit-learn: metryki i ocena modeli
https://scikit-learn.org/stable/modules/model_evaluation.html
Definicje precision, recall, F1, ROC AUC i średnich (macro/micro/weighted)
w jednym miejscu. Sekcja o wyborze metryki przy niezbalansowanych klasach
jest tu najważniejsza.

## [docs] scikit-learn: walidacja krzyżowa
https://scikit-learn.org/stable/modules/cross_validation.html
Warianty KFold, StratifiedKFold, GroupKFold i TimeSeriesSplit oraz kiedy
którego użyć. Sekcja o wycieku danych przy skalowaniu tłumaczy, po co Pipeline.

## [docs] scikit-learn: Pipeline
https://scikit-learn.org/stable/modules/compose.html
Jak spiąć przekształcenia z modelem tak, żeby cross-walidacja dopasowywała je
wewnątrz foldów. Najprostsze zabezpieczenie przed wyciekiem danych.

## [article] scikit-learn: porównanie klasyfikatorów na jednym zbiorze
https://scikit-learn.org/stable/auto_examples/classification/plot_classifier_comparison.html
Gotowy przykład rysujący granice decyzyjne kilkunastu modeli obok siebie.
Punkt wyjścia pod zadanie z porównaniem KNN, LogReg, drzewa i SVM.

## [video] StatQuest — playlista o uczeniu maszynowym
https://www.youtube.com/@statquest
Krótkie odcinki tłumaczące pojedyncze pojęcia (ROC, regresja logistyczna,
bias-variance) bardzo powoli i obrazowo. Dobre, gdy coś z ISLR nie wchodzi.

## [docs] Google Machine Learning Glossary
https://developers.google.com/machine-learning/glossary
Kilkaset haseł z krótkimi definicjami. Przydatne przekrojowo przez wszystkie
fazy i dobre źródło do pisania własnych fiszek.
