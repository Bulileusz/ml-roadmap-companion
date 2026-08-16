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

## [docs] AlbumentationsX — augmentacja obrazu
https://albumentations.ai/docs/
Następca Albumentations: samo `albumentations` nie jest już rozwijane od
połowy 2025, rozwój przeniósł się do AlbumentationsX (licencja AGPL-3.0 albo
komercyjna — dla nauki AGPL wystarcza, przy komercjalizacji sprawdź warunki).
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

## [docs] MLflow — śledzenie eksperymentów
https://mlflow.org/docs/latest/ml/tracking/
Do rozważenia, gdy CSV z wynikami przestanie wystarczać. Na start wystarczy
plik — ale warto wiedzieć, dokąd to prowadzi.

## [docs] Hugging Face Datasets — zbiory i punkty odniesienia
https://huggingface.co/datasets
Papers with Code zostało wygaszone w lipcu 2025 i przekierowuje tutaj; archiwum
danych leży pod organizacją `pwc-archive`. Do szukania zbioru domenowego
i sprawdzenia, jakie wyniki uchodzą za dobre.

## [docs] Label Studio — etykietowanie obrazów lokalnie
https://labelstud.io/guide/
Open source, chodzi na własnej maszynie: klasyfikacja, bounding boxy, maski.
Potrzebne, gdy zaczniesz budować własny zbiór zdjęć betonu. Mocniejsza
alternatywa do segmentacji i wideo: CVAT.

## [docs] pytorch-grad-cam — na co patrzy model
https://github.com/jacobgil/pytorch-grad-cam
Grad-CAM i pochodne dla CNN oraz transformerów wizyjnych. Pokazuje, które
piksele zadecydowały o „rysa / brak rysy" — bez tego wysoka dokładność na
cudzym zbiorze nie mówi nic o tym, czy model patrzy na właściwą rzecz.

## [dataset] Concrete Crack Images for Classification (Özgenel, METU)
https://data.mendeley.com/datasets/5y9wdsg2zt/2
40 000 obrazów 227×227, po połowie z rysami i bez, licencja CC BY 4.0.
Najprostszy możliwy start projektu: czysty i zbalansowany, więc pierwszy model
uczy się na danych, które nie walczą z tobą. Około 230 MB.

## [dataset] SDNET2018
https://digitalcommons.usu.edu/all_datasets/48/
Ponad 56 000 podobrazów 256×256 z mostów, ścian i nawierzchni, rysy od 0,06 mm.
Silnie niezbalansowany i przez to wartościowy: to na nim accuracy przestaje
cokolwiek znaczyć i musisz przejść na precision, recall i F1. Około 1,7 GB.

## [dataset] DeepCrack
https://github.com/yhlleo/DeepCrack
537 obrazów z maskami pikselowymi (300 treningowych, 237 testowych), 544×384.
Wejście w segmentację semantyczną — dopiero gdy klasyfikacja stabilnie działa
i masz maski, bo ich ręczne rysowanie jest drogie.

## [dataset] CrackSeg9k
https://github.com/Dhananjay42/crackseg9k
Około 9 160 obrazów, ujednolicony benchmark segmentacji rys (Harvard Dataverse,
wersja V4). Punkt odniesienia: pozwala porównać własny model z literaturą,
zamiast zgadywać, czy IoU 0,7 to dobrze, czy słabo.

## [docs] scikit-learn: metryki klasyfikacji
https://scikit-learn.org/stable/modules/model_evaluation.html#classification-metrics
`precision_recall_curve`, `average_precision_score`, `classification_report`.
Ta sama strona co w Fazie 2, ale tutaj jest codziennym narzędziem: przy zbiorze
w proporcji 8:1 połowa tej fazy stoi na czytaniu tych trzech rzeczy poprawnie.

## [docs] Metryki segmentacji: IoU i Dice
https://docs.pytorch.org/torcheval/stable/
Przy segmentacji łatwo policzyć IoU źle i tego nie zauważyć — uśrednione po
pikselach zamiast po klasach wygląda świetnie na zbiorze, gdzie 98% obrazu to
tło. Licz per klasa i raportuj obie liczby osobno.

## [article] Deep Learning for Crack Detection — przegląd
https://arxiv.org/abs/2508.10256
Przegląd z 2025: paradygmaty uczenia, generalizacja i zbiory w wykrywaniu rys.
Mówi, jakie wartości metryk uchodzą dziś za dobre i dlaczego model wytrenowany
na jednym zbiorze zwykle słabo radzi sobie na twoich zdjęciach.
