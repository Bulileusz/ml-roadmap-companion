# Faza 3 — PyTorch, pierwsza sieć

## Przepisz Quickstart z „Learn the Basics" i pokręć nim
Przepisz **ręcznie** (bez kopiuj-wklej) cały Quickstart z „PyTorch: Learn the Basics" do jednego
skryptu `01_quickstart.py`, zmieniając w nim tylko `device` na `'cuda'`. Potem uruchom go drugi
raz z dwiema zmianami: inną liczbą epok i innym rozmiarem warstwy ukrytej.
Gotowe, gdy skrypt trenuje do końca na GPU i wypisuje accuracy testowe po każdej epoce dla obu
wersji, a obie końcowe liczby masz zapisane w komentarzu na górze pliku.

## Przewiduj kształty tensorów, zanim uruchomisz kod
Na podstawie sekcji „Tensors" z „PyTorch: Learn the Basics" napisz skrypt, który tworzy
`torch.arange(24).reshape(2, 3, 4)` i wykonuje na nim dwanaście operacji: `view`, `reshape`,
`permute`, `transpose`, `squeeze`, `unsqueeze`, indeksowanie, `cat`, `stack`, dodawanie
z broadcastingiem oraz dwie, które **muszą** rzucić wyjątek. Przy każdej wpisz w komentarzu
przewidywany kształt przed uruchomieniem, a wyjątki łap i wypisuj komunikat.
Gotowe, gdy skrypt drukuje dwanaście linii (kształt albo złapany błąd), a Twoje przewidywania
zgadzają się co najmniej 10/12.

## Odtwórz przykłady z „A Gentle Introduction to torch.autograd"
Przejdź dokumentację od góry do dołu, przepisując każdy przykład do skryptu, a potem dopisz
własne sprawdzenia: wywołaj `backward()` dwa razy bez zerowania gradientu, potem to samo
z `zero_grad()`, policz coś wewnątrz `torch.no_grad()` i porównaj z `.detach()`.
Gotowe, gdy skrypt wypisuje wartość `.grad` po pierwszym i drugim `backward()` (widać, że
gradienty się sumują), zero po wyzerowaniu, oraz `requires_grad=False` dla wyniku spod
`no_grad`.

## Policz gradient na kartce i skonfrontuj z autogradem
Obejrzyj pierwszy film z „Neural Networks: Zero to Hero" (Karpathy, micrograd) do momentu
ręcznego liczenia pochodnych, a potem weź trzy własne funkcje dwóch zmiennych (np.
`f = sin(a*b) + a**2`), wyprowadź ich pochodne cząstkowe ręcznie i zaimplementuj jako zwykłe
funkcje Pythona. Do kompletu policz gradient numerycznie ilorazem różnicowym z `eps=1e-4`.
Gotowe, gdy skrypt drukuje dla każdej funkcji trzy kolumny — gradient ręczny, autograd,
numeryczny — a maksymalna różnica między nimi jest mniejsza niż `1e-4`.

## Napisz pętlę treningową bez `nn` i bez `optim`
Wygeneruj syntetyczne dane z `y = 2.5*x1 - 1.3*x2 + 0.7 + szum` (wzorem rozdziału o regresji
liniowej „from scratch" z „Dive into Deep Learning"), zainicjuj `w` i `b` z `requires_grad=True`
i napisz całą pętlę ręcznie: forward jako mnożenie macierzy, MSE jako `((y_hat - y)**2).mean()`,
`backward()`, update parametrów pod `torch.no_grad()` i `grad.zero_()` na koniec iteracji.
Gotowe, gdy odzyskane `w` i `b` różnią się od prawdziwych o mniej niż 0.05, a zapisany PNG
z krzywą loss vs epoka opada.

## Zamień ręczne kawałki pętli na `nn.Linear`, `nn.MSELoss` i `torch.optim`
Skopiuj skrypt z poprzedniego zadania i podmień trzy rzeczy: forward na `nn.Linear`, stratę na
`nn.MSELoss`, update na `torch.optim.SGD` z `step()`/`zero_grad()` — parametry warstwy ustaw
ręcznie przez `layer.weight.copy_()` na te same wartości startowe co poprzednio. Materiały:
„PyTorch: torch.nn — warstwy i funkcje straty" oraz „PyTorch: optimizery". Na koniec podmień
`SGD` na `Adam` i uruchom trzeci raz.
Gotowe, gdy wersja ręczna i wersja z `optim.SGD` dają ten sam loss do czwartego miejsca po
przecinku w każdej z pierwszych dziesięciu epok, a skrypt drukuje trzy krzywe (ręczna, SGD,
Adam) na jednym wykresie.

## SKŁADAJĄCE — przenieś regresję z Fazy 2 do PyTorcha i porównaj ze scikit-learn
Weź zbiór i model liniowy z Fazy 2: wczytaj przez Pandas, zestandaryzuj cechy, zrób ten sam
podział train/val co wtedy, przekonwertuj na tensory przez `torch.from_numpy(...).float()`
i wytrenuj `nn.Linear` na GPU. Obok policz to samo przez `LinearRegression`/`Ridge` ze
scikit-learn i zestaw wyniki.
Gotowe, gdy skrypt wypisuje tabelkę z metryką walidacyjną obu implementacji oraz maksymalną
różnicę współczynników, a metryki różnią się o mniej niż 1%.

## Zamknij model w klasę `nn.Module` i policz jego parametry ręcznie
Napisz klasę `MLP(nn.Module)` przyjmującą listę rozmiarów warstw ukrytych, budującą
`nn.Sequential` z `nn.Linear`, `nn.ReLU` i opcjonalnym `nn.Dropout` — sekcja „Build the Neural
Network" z „PyTorch: Learn the Basics" plus „PyTorch: torch.nn". Dla trzech różnych konfiguracji
wypisz `print(model)` i tabelkę z `named_parameters()`: nazwa, kształt, `numel()`, a sumę
przelicz ręcznie z wymiarów warstw.
Gotowe, gdy dla wszystkich trzech konfiguracji Twój ręczny rachunek zgadza się co do jednego
z `sum(p.numel() for p in model.parameters())`.

## Zbuduj własny `Dataset` i przepuść dane przez `DataLoader`
Napisz klasę dziedziczącą po `torch.utils.data.Dataset` (`__len__`, `__getitem__`) na danych
tabelarycznych z Fazy 2, opakuj ją w `DataLoader` z `batch_size`, `shuffle=True`, `num_workers`
i `pin_memory=True`, a podział zrób przez `random_split` — materiał „PyTorch: Dataset
i DataLoader". Przejdź dwie epoki pętlą po loaderze, logując kształty batchy i pierwsze indeksy
z każdej epoki.
Gotowe, gdy skrypt wypisuje liczbę batchy, kształt pierwszego i ostatniego (widać niepełny
ostatni) oraz dwie różne kolejności indeksów dla dwóch epok przy `shuffle=True`.

## Wytrenuj pierwszy MLP na problemie z Fazy 2/2b
Spinaj klasę `MLP` z zadania o `nn.Module` z `DataLoaderem` z poprzedniego zadania: pełna pętla
z `model.train()` / `model.eval()`, walidacja pod `torch.no_grad()`, strata właściwa dla zadania
(`CrossEntropyLoss` albo `MSELoss`), `Adam`, wszystko na `device='cuda'`. Zbieraj loss i metrykę
per epoka dla train i val.
Gotowe, gdy skrypt zapisuje PNG z czterema krzywymi (loss i metryka × train i val) i wypisuje na
końcu metrykę walidacyjną MLP obok metryki modelu z Fazy 2 w jednej linii.

## Zamroź losowość i zmierz rozrzut wyniku
Dopisz funkcję `ustaw_seed(s)` ustawiającą `torch.manual_seed`, `random.seed`, `np.random.seed`,
`torch.use_deterministic_algorithms(True)` oraz `generator` i `worker_init_fn` w `DataLoaderze` —
wszystko według „PyTorch: Reproducibility". Uruchom trening pięć razy z tym samym seedem i pięć
razy z pięcioma różnymi.
Gotowe, gdy pięć uruchomień z tym samym seedem daje metrykę identyczną do szóstego miejsca po
przecinku, a skrypt wypisuje średnią i odchylenie standardowe dla pięciu różnych seedów.

## Znajdź learning rate eksperymentem, nie zgadywaniem
Uruchom ten sam MLP dla `lr` z `[1e-1, 1e-2, 1e-3, 1e-4, 1e-5]` przy zamrożonym seedzie i dorzuć
jeden przebieg z `lr=10`, żeby zobaczyć rozbieżność i `NaN`. Objawy za dużego i za małego kroku
opisuje rozdział o optymalizacji w „Dive into Deep Learning".
Gotowe, gdy masz jeden PNG z sześcioma podpisanymi krzywymi walidacyjnymi i wydrukowaną tabelkę
`lr` → najlepsza metryka → epoka, w której ją osiągnął, a przebieg z `lr=10` ma w tabelce `NaN`.

## SKŁADAJĄCE — przetestuj pojemność sieci i zatrzymaj trening w porę
Przetrenuj cztery architektury na tym samym zbiorze i splicie — od jednej warstwy 8 neuronów do
trzech po 256 — każdą z early stopping (`patience` epok bez poprawy) i zapisem najlepszego
`state_dict` do osobnego pliku `.pt`. Dorzuć piąty przebieg: największa architektura plus
`weight_decay` albo `dropout`, żeby zobaczyć różnicę w rozjeździe krzywych.
Gotowe, gdy w katalogu leży pięć plików `.pt`, wykres pokazuje epokę, od której val loss rośnie
mimo spadku train loss, a skrypt wczytuje najlepszy checkpoint i odtwarza jego metrykę
walidacyjną do czwartego miejsca po przecinku.

## Zmierz, co naprawdę daje karta, i znajdź granicę VRAM
Rozdmuchaj MLP do trzech warstw po 2048 neuronów i puść tę samą pętlę treningową raz
z `device='cpu'`, raz z `device='cuda'`, dla batchy `[32, 128, 512, 2048, 8192, ...]`. Czas mierz
po `torch.cuda.synchronize()`, pamięć przez `torch.cuda.max_memory_allocated()` i równolegle
podglądaj `nvidia-smi`. Zwiększaj batch, aż poleci `CUDA out of memory`.
Gotowe, gdy masz wydrukowaną tabelkę urządzenie × batch size × czas epoki × szczyt pamięci
i wiesz, przy którym batchu Twoja karta mówi „dość".

## Włącz mixed precision i sprawdź, czy warto
Do tej samej pętli dołóż `torch.autocast('cuda', dtype=torch.float16)` i `torch.amp.GradScaler`
według „PyTorch: Automatic Mixed Precision (torch.amp)", a potem powtórz pomiar czasu i pamięci
z poprzedniego zadania dla fp32 i AMP przy dwóch największych batchach, które się mieszczą.
Gotowe, gdy skrypt drukuje sześć liczb (czas epoki, szczyt pamięci, metryka walidacyjna — dla
fp32 i dla AMP), a różnica metryk mieści się w odchyleniu wyliczonym w zadaniu o rozrzucie
seedów.

## SKŁADAJĄCE — postaw model liniowy, ensemble i MLP obok siebie w jednej tabeli
Napisz `porownanie.py`, który na tym samym splicie i tych samych pięciu seedach trenuje trzy
modele: liniowy z Fazy 2, ensemble z Fazy 2b i najlepszy MLP z zadania o pojemności sieci —
i dla każdego mierzy tę samą metrykę, czas treningu oraz liczbę parametrów. Wynik pokaż jako
tabelę i wykres słupkowy z wąsami odchylenia.
Gotowe, gdy jedno uruchomienie skryptu drukuje tabelę trzy modele × metryka ± std × czas,
zapisuje PNG, i potrafisz z tabelki odczytać, czy różnica między najlepszym a drugim modelem
przekracza rozrzut między seedami.

## Zbuduj pierwszą sieć konwolucyjną i sprawdź kształty po każdej warstwie
Przeczytaj rozdział o CNN w „Dive into Deep Learning" i zaimplementuj sieć typu LeNet na
CIFAR-10 pobranym lokalnie przez `torchvision.datasets`; przed uruchomieniem policz **ręcznie**
kształt tensora po każdym `Conv2d` i `MaxPool2d`, a w `forward` wstaw tymczasowe `print(x.shape)`.
Trenuj na GPU z AMP i porównaj wynik z MLP o zbliżonej liczbie parametrów na tym samym zbiorze.
Gotowe, gdy wydrukowane kształty zgadzają się z Twoim ręcznym rachunkiem dla wszystkich warstw,
a tabelka na końcu pokazuje accuracy CNN i MLP — z przewagą CNN o kilkanaście punktów
procentowych.

## Test końcowy — napisz cały pipeline od zera, bez zaglądania w poprzednie skrypty
W jeden wieczór, bez kopiowania kodu z wcześniejszych zadań i bez otwierania tutoriali
(dozwolone tylko `help()`, docstringi i `TAB`), napisz `trenuj.py` na zbiorze nieużywanym w tej
fazie: własny `Dataset`, `DataLoader`, model w `nn.Module`, pętla train/val, ustawiony seed, AMP,
early stopping z zapisem `state_dict`, wykres krzywych i argumenty CLI (`--epochs`, `--lr`,
`--batch-size`). Dopisz `predykcja.py`, który wczytuje checkpoint i zwraca predykcję dla jednego
przykładu podanego z linii poleceń.
Gotowe, gdy `python trenuj.py --epochs 20` przechodzi na świeżym zbiorze bez błędu i zapisuje
checkpoint oraz PNG, `python predykcja.py <checkpoint> <przyklad>` wypisuje predykcję, a liczba
momentów, w których musiałeś otworzyć przeglądarkę, wynosi zero.

---

