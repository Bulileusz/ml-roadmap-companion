# Faza 4 — Projekt domenowy

## Odtwórz tutorial transfer learningu i zmierz go na swojej karcie
Przejdź „PyTorch: Transfer Learning for Computer Vision" od góry do dołu na jego
własnym zbiorze, przepisując kod ręcznie do `01_transfer_tutorial.py`. Uruchom oba
warianty z tutoriala — pełny fine-tuning i zamrożony feature extractor — z
`device='cuda'`, i dopisz pomiar czasu epoki oraz `torch.cuda.max_memory_allocated()`.
Gotowe, gdy skrypt wypisuje best val accuracy dla obu wariantów i tabelkę czas epoki /
szczyt VRAM, a różnica czasu między wariantami jest widoczna gołym okiem.

## Podmień backbone i przejdź na nowe API wag torchvision
Weź skrypt z poprzedniego zadania i podłącz pod niego trzy modele z „torchvision:
modele wytrenowane i transformacje" — `resnet18`, `resnet50` i `efficientnet_b0` —
ładowane przez enumy wag (`ResNet50_Weights.DEFAULT`), z preprocessingiem pobieranym
z `weights.transforms()` zamiast ręcznie pisanej normalizacji. Przy każdym modelu
podnoś batch size aż do `CUDA out of memory` i zanotuj ostatnią wartość, która przeszła.
Gotowe, gdy skrypt wypisuje tabelę model × accuracy × czas epoki × największy batch,
który mieści się w pamięci Twojej karty.

## Przełóż gotowy pipeline na dane o betonie
Pobierz „Concrete Crack Images for Classification (Özgenel, METU)", rozpakuj do
struktury katalogów `Positive/` i `Negative/` i podepnij pod skrypt z poprzedniego
zadania przez `ImageFolder`, zmieniając wyłącznie ścieżkę, liczbę klas i rozmiar
wejścia — pętli treningowej nie ruszaj.
Gotowe, gdy po jednej epoce val accuracy przekracza 0.97, a skrypt zapisuje confusion
matrix i siatkę 16 losowych obrazów testowych z predykcją w tytule.

## Rozstrzygnij kierunek projektu, porównując zbiory jednym skryptem
Przeczytaj „Deep Learning for Crack Detection — przegląd" i przejrzyj „Hugging Face
Datasets" pod kątem alternatyw, a potem napisz `zbadaj_zbiory.py`, który dla „Concrete
Crack (Özgenel)", „SDNET2018", „DeepCrack" i „CrackSeg9k" wypisuje liczbę obrazów,
rozdzielczości, balans klas, obecność masek i strukturę katalogów oraz zapisuje po
jednej siatce przykładów z każdego. Na koniec dopisz w `README.md` projektu trzy zdania:
który zbiór jest główny, który zapasowy i czy stawiasz problem jako klasyfikację czy
segmentację.
Gotowe, gdy skrypt drukuje jedną tabelę porównawczą czterech zbiorów, a na dysku leżą
cztery pliki PNG z przykładami.

## Napisz własny Dataset dla SDNET2018 i zobacz, jak wygląda trudny zbiór
Zamiast `ImageFolder` napisz klasę dziedziczącą po `torch.utils.data.Dataset`, która
sama parsuje strukturę SDNET2018 (decks / pavements / walls, cracked / uncracked),
zwraca obraz, etykietę i metadane oraz przyjmuje transformacje z zewnątrz. Policz
balans klas osobno w każdej z trzech podgrup i wyświetl dziesięć par cracked /
uncracked z tej samej podgrupy.
Gotowe, gdy `len(dataset)` zgadza się z liczbą plików na dysku, skrypt wypisuje udział
klasy pozytywnej dla D, P i W osobno, a `DataLoader` z `num_workers=4` przechodzi całą
epokę bez błędu.

## Podziel dane tak, żeby ten sam mur nie trafił do train i do test
Przeczytaj „scikit-learn: podział danych z grupami i czasem" i zbuduj podział
SDNET2018 przez `StratifiedGroupKFold`, gdzie grupą jest obiekt, z którego pochodzi
kadr (typ konstrukcji plus prefiks nazwy pliku). Wytrenuj ten sam model po jednej
epoce dwa razy: na podziale losowym i na grupowym.
Gotowe, gdy skrypt wypisuje zero grup wspólnych między foldami oraz dwie wartości
accuracy, a różnica między nimi pokazuje, ile obiecywał Ci leak.

## Ustaw punkt odniesienia bez sieci neuronowej
Na tym samym splicie policz trzy baseline'y: klasa większościowa, losowanie zgodne
z rozkładem klas i regresja logistyczna na kilku ręcznych cechach obrazu (średnia
i wariancja jasności, udział pikseli krawędziowych). Oceń je naraz przez accuracy,
precision, recall, F1 i PR-AUC — przy proporcji rzędu 8:1 samo accuracy kłamie.
Gotowe, gdy skrypt drukuje tabelę trzy baseline'y × pięć metryk, zapisuje krzywą
precision-recall, a Ty potrafisz podać z pamięci accuracy samej klasy większościowej.

## SKŁADAJĄCE — dowieź pierwszy model bazowy na SDNET2018 od plików do metryk
Spnij trzy poprzednie zadania w jeden skrypt `train_baseline.py`: własny Dataset,
split grupowy, `resnet18` z wagami ImageNet w wariancie fine-tuning, trening na GPU
i ten sam zestaw metryk co przy baseline'ach. Zapisz wagi najlepszej epoki oraz
predykcje na zbiorze testowym do `preds.csv` (ścieżka, etykieta, prawdopodobieństwo, loss).
Gotowe, gdy `python train_baseline.py --data ... --epochs 5` kończy się plikami
`best.pt` i `preds.csv` oraz tabelą metryk, w której F1 modelu bije wszystkie trzy
baseline'y.

## Przejdź checklistę Karpathy'ego po własnej pętli treningowej
Przeczytaj „Andrej Karpathy: A Recipe for Training Neural Networks" i wykonaj na
`train_baseline.py` cztery kontrole z tekstu: sprawdź loss na starcie (dla dwóch klas
ma wyjść ok. 0.693), przetrenuj celowo jeden batch ośmiu obrazów do zera, wyłącz
augmentację i losowość przez ustawienie seedów, a na koniec wyświetl tensory wchodzące
do sieci tuż przed wywołaniem modelu.
Gotowe, gdy skrypt uruchomiony z flagą `--sanity` wypisuje initial loss, dowozi
accuracy 1.0 na jednym batchu w mniej niż 200 krokach i zapisuje PNG z ośmioma
obrazami odtworzonymi z tensora wejściowego.

## Wepnij MLflow i przestań trzymać wyniki w głowie
Zgodnie z „MLflow — śledzenie eksperymentów" owiń trening w `mlflow.start_run()`
i loguj hiperparametry, metryki per epoka, krzywą PR jako artefakt oraz plik `best.pt`.
Przepuść przez to trzy konfiguracje, które już znasz: dwa różne backbone'y i dwa
learning rate'y.
Gotowe, gdy `mlflow ui` pokazuje co najmniej trzy runy, dają się posortować po F1,
a po wejściu w run widzisz zapisaną krzywą PR i checkpoint.

## Dołóż augmentacje i sprawdź na liczbach, czy pomagają
Zbuduj pipeline z „AlbumentationsX — augmentacja obrazu" dobrany do rys na betonie
(flip, rotate90, `RandomBrightnessContrast`, `ShiftScaleRotate`, delikatny blur i szum —
bez agresywnych przesunięć koloru) i najpierw go obejrzyj: siatka 16 wersji tego samego
zdjęcia. Potem odpal dwa runy MLflow, z augmentacją i bez, przy identycznym seedzie
i tej samej liczbie epok.
Gotowe, gdy masz PNG z siatką augmentacji, dwa porównywalne runy w MLflow, a w
`README.md` jedno zdanie z konkretnymi liczbami, o ile augmentacja podniosła lub
obniżyła F1 na walidacji.

## Zawalcz z niezbalansowaniem trzema sposobami i wybierz jeden
Na tym samym splicie porównaj `WeightedRandomSampler`, `pos_weight` w
`BCEWithLogitsLoss` oraz sam dobór progu decyzyjnego na wyjściu już wytrenowanego
modelu (bez ponownego treningu). Każdy wariant zaloguj jako osobny run w MLflow.
Gotowe, gdy skrypt drukuje tabelę trzy podejścia × precision / recall / F1 / PR-AUC
oraz próg maksymalizujący F1, a Ty umiesz wyjaśnić własnymi słowami, dlaczego zmiana
samego progu nie ruszyła PR-AUC.

## Sprawdź, czy model patrzy na rysę, czy na tło
Zgodnie z „pytorch-grad-cam — na co patrzy model" podepnij `GradCAM` pod ostatni blok
konwolucyjny swojego modelu i wygeneruj mapy dla dwunastu obrazów wybranych po wartości
loss z `preds.csv`: czterech pewnych trafień, czterech false positives i czterech false
negatives.
Gotowe, gdy masz jeden arkusz PNG 3×4 z nałożonymi heatmapami, a pod każdym false
positive dopisane jedno zdanie o tym, co model wziął za rysę (fuga, cień, zaciek,
krawędź kadru).

## SKŁADAJĄCE — zamknij trening w jeden skrypt sterowany configiem
Przepisz dorobek poprzednich zadań w `train.py` czytający `config.yaml` (model,
augmentacje, sampler, lr, liczba epok, seed), z early stopping, zapisem najlepszego
checkpointu, logowaniem do MLflow i mixed precision przez `torch.amp.autocast` oraz
`GradScaler`. Zmierz przy okazji, ile AMP daje na Twojej karcie: czas epoki i szczyt
VRAM z AMP i bez.
Gotowe, gdy dwa różne pliki config przechodzą przez `python train.py --config ...` bez
ani jednej zmiany w kodzie, a w MLflow leży para runów pokazująca różnicę czasu epoki
z AMP i bez.

## Zbierz i zetykietuj własny mini-zbiór ze zdjęć z budowy
Postaw lokalnie „Label Studio — etykietowanie obrazów lokalnie", wrzuć 100–150 własnych
zdjęć betonu (telefon, archiwum z pracy, ewentualnie kadry wycięte z kilku większych
zdjęć), oznacz je binarnie cracked / uncracked i wyeksportuj wynik do JSON. Napisz
skrypt, który zamienia ten eksport na Twoją klasę `Dataset`.
Gotowe, gdy skrypt wczytuje eksport z Label Studio, wypisuje balans klas własnego
zbioru i rysuje siatkę 16 zdjęć z naniesionymi etykietami.

## Zmierz domain shift i dostrój model na własnych zdjęciach
Puść model wytrenowany na SDNET2018 na własnym zbiorze bez żadnego dotrenowania
i zanotuj metryki, a potem dostrój go na 70% własnych zdjęć (niski lr, kilka epok,
zamrożone wczesne warstwy) i przetestuj na pozostałych 30%. Oba przebiegi zaloguj
w MLflow jako osobne runy.
Gotowe, gdy masz tabelę przed / po dla precision, recall i F1 na własnych danych oraz
Grad-CAM dla trzech obrazów, które fine-tuning naprawił.

## Przesiądź się z klasyfikacji na segmentację na DeepCrack
Przerób z „Dive into Deep Learning — rozdział o wizji komputerowej" część o segmentacji
semantycznej i FCN, a potem wytrenuj na zbiorze „DeepCrack" model z „torchvision:
modele wytrenowane i transformacje" (`deeplabv3_resnet50` z głową podmienioną na dwie
klasy), licząc IoU i Dice zamiast accuracy. Maski wczytuj i augmentuj razem z obrazem
przez AlbumentationsX.
Gotowe, gdy skrypt wypisuje IoU na zbiorze testowym i zapisuje sześć trójek obraz /
maska prawdziwa / maska przewidziana ustawionych obok siebie.

## Test końcowy — przejdź od zera do wyniku na zbiorze, którego nie dotykałeś
Weź „CrackSeg9k", którego nie używałeś wcześniej w tej fazie, załóż nowy katalog
i w jeden wieczór napisz od zera kompletny pipeline: wczytanie danych, podział bez
leaku, trening na GPU, metryki właściwe dla wybranego zadania i jeden wykres
diagnostyczny zalogowany do MLflow. Nie otwieraj tutoriali ani własnych skryptów
z tej fazy — dozwolone tylko `help()`, docstringi i `.<TAB>`.
Gotowe, gdy w nowym katalogu leży skrypt napisany od zera, który przechodzi od surowych
plików do zalogowanego runu w MLflow, a liczba momentów, w których musiałeś otworzyć
przeglądarkę albo stary kod, wynosi zero.

---

