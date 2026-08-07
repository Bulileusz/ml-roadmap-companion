# Faza 4 — materiały

## [docs] PyTorch: Transfer Learning for Computer Vision
https://pytorch.org/tutorials/beginner/transfer_learning_tutorial.html
Oba warianty na jednym przykładzie: zamrożony trzon jako ekstraktor cech
i fine-tuning całości. Wprost pod sytuację „mam 400 zdjęć".

## [docs] torchvision: modele wytrenowane i transformacje
https://pytorch.org/vision/stable/models.html
Lista dostępnych architektur z wagami oraz — ważne — transformacje wejściowe,
których dany model oczekuje. Użycie innej normalizacji niż ta, na której model
był uczony, cicho psuje wyniki.

## [docs] Albumentations — augmentacja obrazu
https://albumentations.ai/docs/
Biblioteka augmentacji z podglądem efektu każdego przekształcenia. Przejrzyj
katalog transformacji pod kątem tego, które zachowują etykietę w twojej domenie,
a które ją zmieniają.

## [docs] scikit-learn: podział danych z grupami i czasem
https://scikit-learn.org/stable/modules/cross_validation.html#cross-validation-iterators-for-grouped-data
GroupKFold i GroupShuffleSplit — konieczne, gdy masz po kilka zdjęć tego samego
elementu. TimeSeriesSplit, gdy dane mają porządek czasowy.

## [book] Dive into Deep Learning — rozdział o wizji komputerowej
https://d2l.ai/chapter_computer-vision/index.html
Augmentacja, fine-tuning, detekcja obiektów i segmentacja, z kodem.
Do wyboru w zależności od tego, jak zdefiniujesz zadanie domenowe.

## [article] Andrej Karpathy: A Recipe for Training Neural Networks
http://karpathy.github.io/2019/04/25/recipe/
Kolejność działań przy budowie projektu: najpierw obejrzyj dane, potem
baseline, potem dopiero komplikuj. Krótkie, praktyczne, oszczędza tygodnie.

## [docs] Weights & Biases albo MLflow — śledzenie eksperymentów
https://mlflow.org/docs/latest/tracking.html
Do rozważenia, gdy CSV z wynikami przestanie wystarczać. Na start wystarczy
plik — ale warto wiedzieć, dokąd to prowadzi.

## [article] Papers with Code — zbiory danych i baseline'y
https://paperswithcode.com/datasets
Do szukania zbioru domenowego i sprawdzenia, jakie wyniki uchodzą na nim
za dobre. Bez punktu odniesienia trudno ocenić własny model.
