# Audyt list materiałów do samodzielnej nauki ML — luki i konkretne uzupełnienia

## TL;DR
- Największa realna luka to nie merytoryka, lecz środowisko: domyślny PyTorch z PyPI **nie uruchomi RTX 5070** (Blackwell, sm_120) — potrzebny jest wheel `cu128`/`cu129` (PyTorch 2.7.0+), a bez tego zobaczysz `RuntimeError: CUDA error: no kernel image is available for execution on the device`. To trzeba dodać jako osobną Fazę 0.5, przed całą resztą.
- Kilka linków wymaga podmiany: **Papers with Code** wygaszone przez Meta 24 lipca 2025 → Hugging Face (archiwum jako organizacja `pwc-archive`); **Albumentations** → **AlbumentationsX**; **MLflow tracking** → nowy kanoniczny URL. ISLP i d2l.ai (wersja 1.0.3) działają i są aktualne.
- Zestaw jest dobry i celowo oszczędny; brakuje 6 tanich, „kod-first" wkładek: zarządzanie środowiskiem (uv), reprodukowalność PyTorch, CNN jako pomost między Fazą 3 a 4, etykietowanie zdjęć (Label Studio/CVAT), Grad-CAM + metryki dla niezbalansowanych danych oraz gotowe zbiory betonu (SDNET2018, Özgenel, DeepCrack, CrackSeg9k), żeby zacząć projekt zanim uzbierasz własne zdjęcia.

## Key Findings

### A) Aktualność i dostępność obecnych linków
- **Papers with Code** — wygaszone przez Meta **24 lipca 2025**; następnego dnia CTO Hugging Face Julien Chaumond ogłosił następcę „Trending Papers". `paperswithcode.com` przekierowuje dziś do Hugging Face. Serwis hostował ponad 18 000 prac, 1 500 leaderboardów i ponad 1 000 zadań; ostatni publiczny snapshot danych jest zarchiwizowany jako organizacja HF **`pwc-archive`** oraz na GitHub (`paperswithcode/paperswithcode-data`). **Substytut: Hugging Face Datasets** (do pobierania danych) + Trending Papers (do śledzenia SOTA). Uwaga: HF nie odtworzył pełnych, task-owych leaderboardów PWC.
- **Albumentations** — repozytorium `albumentations` **nie jest już aktywnie rozwijane** (ostatnia aktualizacja czerwiec 2025); rozwój przeniesiono do **AlbumentationsX** (podwójna licencja **AGPL-3.0 / komercyjna** — zmiana względem dawnego MIT). Dokumentacja pozostaje pod `https://albumentations.ai/docs/`.
- **MLflow tracking** — stary adres `mlflow.org/docs/latest/tracking.html` nadal odpowiada, ale kanoniczny dziś to `https://mlflow.org/docs/latest/ml/tracking/`.
- **ISLP (statlearning.com)** — działa; wersja pythonowa (ISLP) aktualna.
- **d2l.ai** — działa, wersja **1.0.3**, PyTorch jako framework główny.
- **Matplotlib quick start** — URL `matplotlib.org/stable/users/explain/quick_start.html` nadal aktualny.

Wniosek: do podmiany są tylko trzy pozycje (Papers with Code, Albumentations, MLflow). Reszta linków żyje.

### B) Luka sprzętowo-środowiskowa (RTX 5070, Blackwell, sm_120) — priorytet
- RTX 5070 to architektura **Blackwell, compute capability sm_120**. Wersje stable PyTorch sprzed 2.7.0 kompilowały kernele tylko do sm_90 (Ada / RTX 4000).
- **PyTorch 2.7.0 to pierwszy stable z natywnym wsparciem Blackwell/sm_120**. Oficjalny blog PyTorch 2.7: *„support for the NVIDIA Blackwell GPU architecture and pre-built wheels for CUDA 12.8 ... PyTorch 2.7 includes Triton 3.3, which adds support for the Blackwell architecture"*. Nośnikiem sm_120 jest **wheel CUDA 12.8 (cu128)**; nowsze wydania oferują też cu129. **Nightly nie jest już wymagany** — stable wystarcza.
- **Typowy błąd przy złej instalacji.** Domyślny `pip install torch` (PyPI, CPU) lub wheel cu126/cu118 na RTX 5070 daje:
  - `UserWarning: NVIDIA GeForce RTX 5070 ... with CUDA capability sm_120 is not compatible with the current PyTorch installation. The current PyTorch install supports CUDA capabilities sm_50 sm_60 sm_61 sm_70 sm_75 sm_80 sm_86 sm_90.`
  - a przy realnym uruchomieniu kernela: `RuntimeError: CUDA error: no kernel image is available for execution on the device`.
  - **Pułapka myląca:** `torch.cuda.is_available()` zwraca `True`, a `.cuda()` na tensorze przechodzi bez błędu — dopiero pierwsza operacja (`a * b`, `nn.Linear`) się wywala. To sprawia, że wiele osób szuka problemu w kodzie modelu, a nie w instalacji.
- **Oficjalna komenda instalacyjna (Linux i Windows identyczna co do formy)** — ze strony Get Started Locally, Stable + Pip + Python + CUDA 12.8:
  ```
  pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128
  ```
  (alternatywnie tag `cu129`). Kluczowe: **bez `--index-url` z tagiem `cu###`** dostaniesz build CPU-only albo starszy CUDA bez sm_120.
- **pip vs conda vs uv.** Oficjalny, najpewniejszy kanał to pip/wheel z `--index-url` PyTorcha. Conda działa, ale kanał `pytorch` bywa opóźniony przy nowych architekturach — bezpieczniej pip wewnątrz środowiska conda/venv. `uv` obsługuje `--index-url`, więc `uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128` działa i daje reprodukowalny lockfile — to rekomendowane podejście dla tego profilu.
- **Znane pułapki na Blackwellu.** Wymagany sterownik NVIDIA **570+** (na Linuksie wariant `nvidia-driver-570-open` bywa stabilniejszy). `torchvision`/`torchaudio` muszą pochodzić z tego samego tagu cu128 co `torch`, inaczej konflikt wersji przy resolverze pip. `flash-attention` i `xformers` na Blackwellu były spóźnione jeszcze w końcu 2025 — na start ich nie potrzebujesz do transfer learningu. Zwróć też uwagę: build cu128/cu129 PyTorch 2.8.0 usunął wsparcie starszych sm50–sm60, ale to nie dotyczy RTX 5070.
- **VRAM i batch size.** Desktopowy RTX 5070 ma **12 GB GDDR7 na 192-bit szynie, 6 144 rdzenie CUDA, 192 rdzenie Tensor (5. gen), ~672 GB/s, TDP 250 W, MSRP 549 USD**. Praktyczne konsekwencje:
  - ResNet50 / EfficientNet-B0, 224×224, mixed precision: batch **~32–64**.
  - ViT-B/16, 224×224: batch **~16–32**.
  - Przy **512–768 px** (a wady betonu — cienkie rysy, ubytki — często wymagają rozdzielczości wyższej niż 224 px) VRAM szybko się kończy i batch spada do **4–8**. Stąd potrzeba mixed precision i gradient accumulation.
- **Mixed precision i gradient accumulation — warto poznać od razu.** `torch.amp` (autocast + GradScaler) podwaja–potraja mieszczalny batch i przyspiesza trening na Tensor Cores. Gradient accumulation pozwala symulować duży batch przy 12 GB. Oficjalne strony w liście nowych pozycji.

### C) Brakujące obszary merytoryczne (po jednym najlepszym darmowym źródle)
- **Zarządzanie środowiskiem / reprodukowalność zależności** — brak w planie. Dodać **uv** (`docs.astral.sh/uv`): jeden lockfile na projekt, koniec „działa u mnie".
- **Git i higiena repo ML** — brak. **DVC to na tym etapie przerost.** Wystarczy Git + porządny `.gitignore` (dane, `*.ckpt`, `*.pth`, `mlruns/`, `.venv/`) + prosta struktura (`data/` poza repo, `src/`, `notebooks/`, `models/`). Wersjonowanie danych wprowadzaj dopiero, gdy zbiór własnych zdjęć zacznie się realnie zmieniać.
- **Reprodukowalność treningu PyTorch** — brak. Dodać oficjalną stronę **„Reproducibility"** (`torch.manual_seed`, `torch.use_deterministic_algorithms`, seed workerów DataLoadera, `torch.backends.cudnn.deterministic`).
- **CNN (konwolucja, pooling, receptive field)** — **realna dziura pojęciowa** między Fazą 3 (MLP, autograd) a Fazą 4 (transfer learning). Bez tego transfer learning jest magią. Dodać rozdział CNN z **d2l.ai**.
- **Etykietowanie własnych zdjęć** — brak, a to warunek zbudowania własnego zbioru betonu. **Label Studio** (uniwersalne, self-hosted, klasyfikacja/bbox/maski) lub **CVAT** (mocniejsze w segmentacji i wideo, wsparcie SAM). Oba open source i działają lokalnie na Windows/Linux. Dla pojedynczego użytkownika i klasyfikacji patchy Label Studio jest prostszy; do masek segmentacyjnych CVAT bywa szybszy.
- **Metryki dla niezbalansowanych zbiorów + interpretacja modelu** — **warto dołożyć do Fazy 4.** SDNET2018 jest silnie niezbalansowany (dużo więcej „non-crack"), więc accuracy myli — potrzebne precision/recall/F1/PR-AUC (pokrywa to już `sklearn.metrics` z Fazy 2). Do interpretacji: **pytorch-grad-cam** (Grad-CAM dla CNN i ViT) pokazuje, na które piksele model patrzy — kluczowe do zaufania modelowi na danych domenowych.
- **Segmentacja semantyczna vs klasyfikacja przy ~400 zdjęciach.** Przy tej wielkości zbioru **klasyfikacja patchy jest bezpieczniejszym startem** — nie wymaga masek pikselowych (kosztownych w anotacji). Segmentacja ma sens dopiero, gdy masz maski; wtedy zacznij od gotowych zbiorów segmentacyjnych (DeepCrack, CrackSeg9k) i U-Net, a własne 400 zdjęć posłużą do fine-tuningu.

### D) Zbiory danych domenowych (do pobrania i treningu lokalnie)
| Zbiór | Rozmiar | Zadanie | Rozdzielczość | Licencja | Link / DOI |
|---|---|---|---|---|---|
| **SDNET2018** | 230 obrazów bazowych → **>56 000 podobrazów** (54 mosty, 72 ściany, 104 nawierzchnie); rysy 0,06–25 mm | klasyfikacja crack/non-crack (silnie niezbalansowany) | 256×256 | CC BY 4.0, dostęp akademicki | DOI 10.15142/T3TD19 / `digitalcommons.usu.edu/all_datasets/48/` |
| **Concrete Crack Images for Classification (Özgenel/METU)** | **40 000** (20k crack / 20k non-crack), z 458 obrazów 4032×3024 | klasyfikacja binarna | 227×227 | CC BY 4.0 | `data.mendeley.com/datasets/5y9wdsg2zt/2` |
| **Concrete Crack Segmentation (Özgenel)** | 458 obrazów + maski | segmentacja binarna | wysoka | CC BY | `data.mendeley.com/datasets/jwsn7tfbrp/1` |
| **DeepCrack** | 537 obrazów z maskami (300 train / 237 test) | segmentacja | 544×384 | badawcza | `github.com/yhlleo/DeepCrack` |
| **Crack500** | ~500 obrazów + maski | segmentacja | ~2560×1440+ | badawcza | repozytoria pavement-crack-detection |
| **CrackForest (CFD)** | 118 obrazów | segmentacja/detekcja | 480×320 | badawcza | `github.com/cuilimeng/CrackForest-dataset` |
| **CrackSeg9k** | **~9 160** obrazów (kolekcja/benchmark) | segmentacja | zróżnicowana | Harvard Dataverse | DOI 10.7910/DVN/EGIEBY (pobierz V4) / `github.com/Dhananjay42/crackseg9k` |
| **OmniCrack30k** (nowszy) | ~30 000 (20 podzbiorów) | segmentacja, benchmark | zróżnicowana | badawcza | CVPRW 2024 (VAND) |

Orientacyjne rozmiary plików: Özgenel ~230 MB (spakowane), SDNET2018 ~1,7 GB, DeepCrack/CFD/Crack500 od kilkudziesięciu do kilkuset MB, CrackSeg9k dzielony na dwa podfoldery (kilka GB). Przed pobraniem zweryfikuj rozmiar na stronie źródłowej.

**Rekomendowana kolejność startu:** Özgenel (najprostszy, CC BY, czysty) → SDNET2018 (trudniejszy, niezbalansowany) → dopiero potem segmentacja (DeepCrack/CrackSeg9k).

### E) Stan sztuki w domenie (punkt odniesienia)
- **Dwa główne podejścia:** (1) **klasyfikacja patchy** — obraz dzielony na kafelki, klasyfikator (ResNet/VGG/EfficientNet) z transfer learningiem; proste, na czystych zbiorach (Özgenel, SDNET) dokładności rzędu **97–99%**; (2) **segmentacja pikselowa** — U-Net, DeepLabv3+, SegNet oraz nowsze warianty transformerowe/Mamba; metryki IoU i F1.
- **Typowe wartości segmentacji:** na DeepCrack raportowane IoU rzędu **~0,85–0,93** (np. U-Net ~0,92, STRNet/SDDNet w tym zakresie). Na trudniejszych zbiorach (Crack500, CFD) F1/IoU wyraźnie niższe — CFD bywa poniżej F1 ~0,55 dla słabszych modeli. Nowe modele SAM-owe (Segment Any Crack) na benchmarku OmniCrack30k osiągają ~61% F1 / ~44% IoU, co pokazuje, jak trudna jest generalizacja między zbiorami.
- **Interpretacja dla Ciebie:** >97% accuracy na klasyfikacji czystych patchy to standard, nie sukces — realną trudnością jest **domain shift** (model wytrenowany na Özgenel słabo działa na Twoich zdjęciach). Dlatego od początku licz precision/recall/F1 i testuj na danych spoza zbioru treningowego.
- **Przeglądy/benchmarki do wglądu:** „Deep Learning for Crack Detection: A Review of Learning Paradigms, Generalizability, and Datasets" (arXiv:2508.10256, 2025); CrackSeg9k (ECCV W 2022); OmniCrack30k (CVPRW 2024).

### F) Czego świadomie nie dodawać
- **Andrew Ng ML / Deep Learning Specialization** — wideo-centryczne, dużo wykładu, część płatna; kłóci się z filozofią „kod-first" i budżetem 60–90 min wieczorami.
- **fast.ai** — świetny kurs, ale narzuca własną bibliotekę (`fastai`) i podejście top-down; rozprasza od czystego PyTorcha, który już jest w Fazie 3.
- **Hands-On Machine Learning (Géron)** — bardzo dobra, ale płatna i obszerna; treściowo pokrywa się z ISLP + scikit-learn + d2l, które już masz.
- **Deep Learning Book (Goodfellow)** — teoria, prawie bez kodu; nie na ten etap i nie pod Twój cel.
- **Płatne kursy (Udemy/Coursera itp.)** — główne ryzyko to nadmiar źródeł i rozsypanie samodzielnej nauki; unikaj, dopóki obecny plan nie zostanie przerobiony.

## Details — audyt per faza

### Faza 0 — Python naukowy
- **Do podmiany:** nic.
- **Do dodania:** [docs] uv (zarządzanie środowiskiem; wprowadź od pierwszego dnia).
- **Wystarczy jak jest:** NumPy (beginners, broadcasting), Pandas (10 min, indexing), Matplotlib, Seaborn, McKinney — komplet, nie rozdmuchiwać.

### Faza 0.5 (NOWA) — Środowisko i sprzęt
Krytyczna: bez niej nic nie ruszy na RTX 5070.
- **Do dodania:** [docs] PyTorch Get Started Locally (instalacja cu128); [docs] PyTorch AMP; [docs] PyTorch Reproducibility.

### Faza 1 — Matematyka
- **Do podmiany:** nic.
- **Wystarczy jak jest:** MML book, 3Blue1Brown (LA, calculus, NN), Khan, Seeing Theory, NumPy linalg — komplet.

### Faza 2 / 2b — Klasyczne ML
- **Do podmiany:** nic (ISLP i cała dokumentacja scikit-learn aktualne).
- **Wystarczy jak jest:** komplet; metryki z Fazy 2 pokryją też niezbalansowane dane w Fazie 4.

### Faza 3 — PyTorch
- **Do dodania:** [book] d2l.ai rozdział CNN (pomost pojęciowy do Fazy 4).
- **Wystarczy jak jest:** Learn the Basics, autograd, torch.nn, optim, Dataset/DataLoader, Karpathy Zero to Hero.

### Faza 4 — Projekt CV (beton)
- **Do podmiany:** Papers with Code → Hugging Face Datasets; Albumentations → AlbumentationsX docs; MLflow → nowy URL.
- **Do dodania:** [docs] Label Studio; [docs] pytorch-grad-cam; zbiory SDNET2018, Özgenel, DeepCrack, CrackSeg9k; [article] przegląd crack detection.
- **Wystarczy jak jest:** transfer learning tutorial, torchvision models, cross-validation z grupami, d2l CV, Karpathy Recipe.

## Recommendations
1. **Zanim cokolwiek innego (Faza 0.5):** zainstaluj sterownik NVIDIA 570+, utwórz świeże środowisko (`uv venv`), potem `pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128`. **Test akceptacyjny:** `torch.cuda.get_device_capability()` musi dać `(12, 0)`, a `A @ B` na `cuda` nie może rzucić błędu. **Próg zmiany:** jeśli widzisz „no kernel image is available" — masz zły wheel, wróć do cu128/cu129.
2. Fazy 0 i 1 rób równolegle; uv od pierwszego dnia (jeden `uv.lock` na projekt).
3. W Fazie 3 dołóż rozdział CNN z d2l **przed** transfer learningiem — inaczej Faza 4 będzie kopiowaniem kodu bez zrozumienia.
4. W Fazie 4 zacznij od **klasyfikacji patchy na Özgenel** (CC BY, czysty), włącz **mixed precision** i **Grad-CAM** od pierwszego treningu. Potem **SDNET2018** — tu porzuć accuracy na rzecz precision/recall/F1. Segmentację (DeepCrack/CrackSeg9k, U-Net) wprowadzaj dopiero, gdy klasyfikacja stabilnie działa.
5. **Próg wyboru zadania:** po zebraniu ~400 własnych zdjęć — jeśli masz maski pikselowe, przejdź na segmentację (U-Net, fine-tuning na CrackSeg9k); jeśli tylko etykiety obraz/patch, zostań przy klasyfikacji i skup się na domain shift (augmentacje AlbumentationsX, test na danych spoza zbioru treningowego).
6. Śledź eksperymenty w MLflow lokalnie od pierwszego treningu Fazy 4 — bez tego nie odróżnisz, która zmiana pomogła.

## Caveats
- **Dokładna wersja stable PyTorch w sierpniu 2026 jest niejednoznaczna między źródłami:** strona Get Started renderowała selektor z „Stable (2.7.0)", podczas gdy inne źródła (Wikipedia, przewodnik SaladCloud) podają **2.11.0 z 23 marca 2026** jako rekomendowaną. Pewne i dobrze udokumentowane jest to, że **sm_120 jest w stable od 2.7.0 przez wheel cu128** — trzymaj się cu128/cu129 niezależnie od numeru wersji.
- **Ekosystem wokół Blackwella** (część edge-case'ów Triton, flash-attention, niektóre operacje torchvision) bywał spóźniony jeszcze w końcu 2025; samo PyTorch core działa na stable+cu128, ale egzotyczne biblioteki mogą wymagać obejść lub buildu ze źródeł.
- **Rozmiary plików zbiorów** podane orientacyjnie na podstawie liczby i rozdzielczości obrazów — zweryfikuj na stronie źródłowej przed pobraniem.
- **Licencja AlbumentationsX** to AGPL-3.0/komercyjna — dla nauki i projektu niekomercyjnego AGPL jest OK, ale to zmiana względem dawnego MIT; jeśli kiedyś skomercjalizujesz projekt, sprawdź warunki.
- Wartości metryk SOTA (IoU/F1) różnią się między pracami z powodu odmiennych podziałów train/test i preprocessingu — traktuj je jako rząd wielkości, nie twarde progi.

## Pełna lista NOWYCH pozycji (gotowa do wklejenia, format jak w obecnych plikach)

## [docs] uv — zarządzanie środowiskiem i zależnościami
https://docs.astral.sh/uv/
Ultraszybki menedżer pakietów i środowisk (Astral, autorzy Ruff). Zastępuje pip/venv/pip-tools i tworzy lockfile (uv.lock) gwarantujący reprodukowalne instalacje. Na tym etapie daje porządek: jedno środowisko na projekt i koniec problemu „działa tylko u mnie".

## [docs] PyTorch — Get Started Locally (instalacja pod RTX 5070)
https://pytorch.org/get-started/locally/
Oficjalny generator komendy instalacyjnej. Dla Blackwella wybierz Stable + Pip + CUDA 12.8, co daje: pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128. Bez tego (domyślny wheel z PyPI) dostaniesz „no kernel image is available for execution on the device".

## [docs] PyTorch — Automatic Mixed Precision (torch.amp)
https://docs.pytorch.org/docs/stable/amp.html
autocast i GradScaler pozwalają trenować w FP16/BF16, co przy 12 GB VRAM podwaja–potraja mieszczalny batch i przyspiesza trening na Tensor Cores Blackwella. Praktycznie konieczne przy wyższych rozdzielczościach zdjęć betonu (512–768 px).

## [docs] PyTorch — Reproducibility
https://docs.pytorch.org/docs/stable/notes/randomness.html
Jak ustawić torch.manual_seed, torch.use_deterministic_algorithms oraz seed workerów DataLoadera. Bez tego porównywanie eksperymentów jest nierzetelne, a cała filozofia planu to mierzalny, powtarzalny kod.

## [book] Dive into Deep Learning — rozdział o CNN
https://d2l.ai/chapter_convolutional-neural-networks/index.html
Konwolucja, padding/stride, pooling, receptive field, kanały — pomost pojęciowy między MLP (Faza 3) a transfer learningiem (Faza 4), z uruchamialnym kodem PyTorch. Bez tego rozdziału Faza 4 jest kopiowaniem kodu bez zrozumienia.

## [docs] Label Studio — etykietowanie obrazów lokalnie
https://labelstud.io/guide/
Open-source, self-hosted narzędzie do anotacji (klasyfikacja, bounding boxy, maski segmentacji). Potrzebne, gdy zaczniesz budować własny zbiór zdjęć betonu. Alternatywa mocniejsza w segmentacji i wideo: CVAT (app.cvat.ai / github.com/cvat-ai/cvat).

## [docs] pytorch-grad-cam — interpretacja modelu obrazowego
https://github.com/jacobgil/pytorch-grad-cam
Grad-CAM i pochodne dla CNN oraz Vision Transformerów. Pokazuje, na które piksele model patrzy przy decyzji „crack/no-crack" — kluczowe do debugowania i budowania zaufania do modelu na danych domenowych.

## [dataset] SDNET2018
https://digitalcommons.usu.edu/all_datasets/48/
Ponad 56 000 podobrazów 256×256 betonu (mosty, ściany, nawierzchnie), rysy od 0,06 do 25 mm, klasyfikacja cracked/non-cracked, silnie niezbalansowany, CC BY 4.0 (DOI 10.15142/T3TD19). Dobry drugi krok — wymusza pracę z metrykami precision/recall/F1 zamiast accuracy.

## [dataset] Concrete Crack Images for Classification (Özgenel/METU)
https://data.mendeley.com/datasets/5y9wdsg2zt/2
40 000 obrazów 227×227 (20k crack / 20k non-crack), klasyfikacja binarna, licencja CC BY 4.0. Najprostszy możliwy start projektu Fazy 4, zanim uzbierasz własne zdjęcia — czysty i zbalansowany.

## [dataset] DeepCrack
https://github.com/yhlleo/DeepCrack
537 obrazów z maskami pikselowymi (300 train / 237 test), rozdzielczość 544×384, segmentacja. Wejście w segmentację semantyczną, gdy klasyfikacja już działa i masz maski.

## [dataset] CrackSeg9k
https://github.com/Dhananjay42/crackseg9k
Około 9 160 obrazów, ujednolicony benchmark segmentacji rys (Harvard Dataverse, DOI 10.7910/DVN/EGIEBY, pobierz wersję V4). Punkt odniesienia do porównania własnego modelu segmentacyjnego z literaturą.

## [article] Deep Learning for Crack Detection: A Review
https://arxiv.org/abs/2508.10256
Przegląd (2025) paradygmatów uczenia, generalizacji i zbiorów w wykrywaniu rys betonu. Daje punkt odniesienia: jakie architektury i jakie wartości metryk (IoU/F1) uchodzą obecnie za dobre, żebyś wiedział, czy Twój model jest dobry.
---

# FAZA 0 — Python odświeżenie: zadania na jeden wieczór

## Przećwicz wszystkie przykłady z „NumPy: absolute beginners guide"
Przejdź przewodnik od góry do dołu, przepisując każdy przykład **ręcznie** do jednego skryptu `01_numpy_basics.py` (nie kopiuj-wklej — przepisywanie wyłapuje literówki i wymusza czytanie). Po każdym przykładzie dopisz `print()` z kształtem i typem wyniku.
Gotowe, gdy skrypt wykonuje się od początku do końca bez błędu i wypisuje `shape` oraz `dtype` dla co najmniej piętnastu utworzonych tablic.

## Pokręć indeksowaniem na gotowej tablicy
Weź z „NumPy: absolute beginners guide" sekcję o indeksowaniu i slicingu, utwórz tablicę `np.arange(60).reshape(5, 4, 3)` i wyciągnij z niej dziesięć różnych fragmentów: pojedynczy element, całe wiersze, kolumny, co drugi element, ostatnią warstwę, fragment odwrócony. Przy każdym wypisz kształt i wynik.
Gotowe, gdy skrypt drukuje dziesięć fragmentów, a Ty dla każdego zapisałeś w komentarzu przewidywany kształt **przed** uruchomieniem i zgadza się w co najmniej 8 na 10 przypadków.

## Sprawdź, gdzie broadcasting się składa, a gdzie pęka
Przeczytaj „NumPy: broadcasting" i napisz skrypt, który przetwarza tablicę `(100, 5)` udających pomiary: odejmij średnią kolumnową `(5,)`, podziel przez odchylenie `(5,)`, a potem spróbuj odjąć średnią wierszową `(100,)` i złap wyjątek. Napraw ostatni przypadek przez `reshape(-1, 1)` albo `[:, np.newaxis]`.
Gotowe, gdy skrypt wypisuje odchylenie standardowe znormalizowanych kolumn (bliskie 1.0), pokazuje komunikat błędu dla wersji niepoprawnej i poprawny wynik po naprawie.

## Zmierz, ile realnie daje wektoryzacja
Napisz ten sam rachunek na trzy sposoby: pętla `for` po liście Pythona, list comprehension i operacja wektorowa NumPy — np. odległość euklidesowa każdego z miliona punktów od zadanego środka. Zmierz każdy wariant przez `timeit` i porównaj też zużycie pamięci przez `sys.getsizeof` / `nbytes`.
Gotowe, gdy skrypt wypisuje tabelkę trzech czasów w milisekundach, a Ty potrafisz podać z pamięci rząd przyspieszenia NumPy nad czystą pętlą.

## Wytnij dane maskami boolowskimi i policz agregacje po osiach
Na macierzy `(200, 6)` z losowymi danymi (`np.random.default_rng(42)`) policz `mean`, `std`, `min`, `max` osobno dla `axis=0` i `axis=1`, a następnie wybierz maską wiersze spełniające warunek (np. druga kolumna powyżej średniej) i policz na nich to samo. Sekcję o agregacjach i indeksowaniu logicznym masz w „NumPy: absolute beginners guide".
Gotowe, gdy skrypt wypisuje kształty wyników dla obu osi i liczbę wierszy przechodzących przez maskę, a Ty umiesz wyjaśnić własnymi słowami, co znika przy `axis=0`, a co przy `axis=1`.

## SKŁADAJĄCE — zrób z surowej macierzy pomiarów gotowy raport w czystym NumPy
Wygeneruj lub zapisz do pliku `pomiary.csv` macierz udającą wyniki badań betonu (kolumny: wytrzymałość, wiek, temperatura, wilgotność), wczytaj ją przez `np.loadtxt` / `np.genfromtxt`, wstaw ręcznie kilka `NaN`, a potem: znajdź braki, zastąp je średnią kolumnową, znormalizuj wszystkie kolumny i wypisz macierz korelacji przez `np.corrcoef`. Wszystko bez Pandas — tylko NumPy.
Gotowe, gdy skrypt przyjmuje ścieżkę do pliku jako argument, wypisuje liczbę uzupełnionych braków i macierz korelacji 4×4 z jedynkami na przekątnej.

## Przerób „10 minutes to pandas" na własnym zbiorze
Przejdź cały przewodnik „Pandas: 10 minutes to pandas", ale zamiast jego przykładowych ramek podstaw `sns.load_dataset("penguins")` z materiału „Seaborn: tutorial". Każdą operację z przewodnika (podgląd, sortowanie, selekcja, statystyki opisowe) wykonaj na tym zbiorze.
Gotowe, gdy masz notebook, w którym każda komórka odpowiada jednej sekcji przewodnika i wszystkie wykonują się bez błędu na nowym zbiorze.

## Wczytaj brzydki CSV i zmuś Pandas do współpracy
Weź dowolny CSV z pracy (albo zepsuj kopię `penguins.csv`: średnik jako separator, przecinek dziesiętny, polskie znaki w nagłówkach, kolumna z datą jako tekst, puste wiersze na górze) i wczytaj go poprawnie **jednym** wywołaniem `read_csv` z parametrami `sep`, `decimal`, `encoding`, `skiprows`, `parse_dates`, `dtype`. Rozdział 6 z „Python for Data Analysis" opisuje te parametry komplet.
Gotowe, gdy `df.dtypes` pokazuje liczby jako `float64`/`int64`, datę jako `datetime64`, a nie wszystko jako `object`.

## Rozstrzygnij spór .loc kontra .iloc i ucisz SettingWithCopyWarning
Przeczytaj „Pandas: indeksowanie i wybór danych" i celowo wywołaj `SettingWithCopyWarning`, przypisując wartość do wyniku wcześniejszego filtrowania. Potem napisz wersję poprawną przez `.loc[maska, kolumna] = wartość` i wersję przez jawne `.copy()`.
Gotowe, gdy jeden skrypt pokazuje po kolei: ostrzeżenie, brak zmiany w oryginalnej ramce, a następnie dwie wersje, które zmieniają dane naprawdę.

## Wyczyść ramkę z braków, duplikatów i złych typów
Na zbiorze `titanic` z „Seaborn: tutorial" policz braki per kolumna, zdecyduj dla każdej osobno: usunąć wiersze, usunąć kolumnę czy uzupełnić (`fillna` medianą lub modą), usuń duplikaty i skonwertuj kolumny kategoryczne na `category`. Uzasadnij każdą decyzję w komentarzu jednym zdaniem.
Gotowe, gdy skrypt wypisuje `df.isna().sum()` przed i po czyszczeniu, a po jest wszędzie zero, i wypisuje zysk pamięci z `df.memory_usage(deep=True)` po zmianie typów.

## Odpowiedz na pięć pytań przez groupby
Sformułuj pięć konkretnych pytań do zbioru `titanic` lub `penguins` (np. „która klasa miała najwyższą przeżywalność w podziale na płeć") i odpowiedz na każde jednym łańcuchem `groupby` z `agg`, używając wielu funkcji agregujących naraz i `as_index=False`. Rozdział 10 z „Python for Data Analysis" pokazuje `agg` ze słownikiem i własnymi funkcjami.
Gotowe, gdy skrypt wypisuje pięć ramek wynikowych, każda poprzedzona wydrukowanym pytaniem, i żadna nie ma więcej niż dziesięć wierszy.

## Połącz dwie ramki na cztery sposoby i zobacz, gdzie giną wiersze
Rozbij jeden zbiór na dwie ramki o częściowo pokrywających się kluczach, a potem połącz je przez `merge` z `how` równym `inner`, `left`, `right` i `outer`. Za każdym razem wypisz liczbę wierszy i liczbę powstałych `NaN`. Sekcja o łączeniu jest w rozdziale 8 „Python for Data Analysis" oraz w „10 minutes to pandas".
Gotowe, gdy skrypt drukuje tabelkę cztery warianty × liczba wierszy × liczba braków, a Ty przewidziałeś liczby przed uruchomieniem i trafiłeś przynajmniej w trzech przypadkach.

## SKŁADAJĄCE — zbuduj funkcję, która robi z surowego CSV czystą ramkę
Napisz moduł `czyszczenie.py` z funkcjami `wczytaj(sciezka)`, `wyczysc(df)` i `podsumuj(df)`, spinając w nie wszystko z poprzednich pięciu zadań: parametry `read_csv`, obsługę braków, typy kategoryczne, usuwanie duplikatów i zwrócenie ramki z podsumowaniem per grupa. Funkcje mają być bezstanowe i zwracać nowe ramki, nie modyfikować wejścia.
Gotowe, gdy uruchomienie `python czyszczenie.py dane.csv` na dwóch różnych plikach CSV kończy się wypisaniem podsumowania bez ani jednej zmiany w kodzie.

## Naucz się interfejsu obiektowego Matplotlib, a nie pyplota
Przeczytaj „Matplotlib: Quick start guide" i narysuj siatkę 2×2 przez `fig, axes = plt.subplots(2, 2)`, wstawiając w każdy `ax` inny wykres tych samych danych. Ustaw tytuły, etykiety osi, legendę i zapisz całość przez `fig.savefig` do PNG w 150 dpi — wszystko przez metody obiektu `ax`/`fig`, ani razu przez `plt.title` czy `plt.xlabel`.
Gotowe, gdy na dysku leży plik PNG z czterema opisanymi panelami, a w kodzie nie występuje żadne wywołanie `plt.` poza `plt.subplots` i `plt.show`.

## Zrób histogram, scatter i boxplot w Seaborn i rozbij je na kategorie
Z „Seaborn: tutorial" weź sekcję o rozkładach i narysuj dla `penguins`: `histplot` z `hue` po gatunku, `scatterplot` z `hue` i `style`, oraz `boxplot` z podziałem na wyspę. Dla każdego wykresu dopisz w komentarzu jedno zdanie o tym, co z niego widać.
Gotowe, gdy trzy wykresy są zapisane do plików, a Twoje trzy zdania zawierają konkretne liczby odczytane z wykresów, nie ogólniki.

## Połącz groupby z wykresem w jedną odpowiedź na pytanie
Postaw jedno pytanie do danych, policz odpowiedź przez `groupby` i **tę samą** ramkę wynikową narysuj — słupkami przez `sns.barplot` albo `ax.bar` z surowych wartości. Dodaj do wykresu podpisy słupków wartościami liczbowymi.
Gotowe, gdy jeden skrypt drukuje tabelę wynikową i zapisuje wykres, a liczby na wykresie zgadzają się z tabelą co do drugiego miejsca po przecinku.

## SKŁADAJĄCE — napisz szablon raportu EDA i uruchom go na znanym zbiorze
Zbuduj notebook `eda_szablon.ipynb`, który w ustalonej kolejności robi: podgląd i typy, braki, statystyki opisowe, rozkłady zmiennych liczbowych, liczności zmiennych kategorycznych, korelacje z heatmapą i trzy wykresy odpowiadające na trzy postawione pytania. Uruchom go na `titanic`, wykorzystując „Seaborn: tutorial" i rozdział 9 z „Python for Data Analysis".
Gotowe, gdy notebook wykonuje się od góry do dołu po `Restart & Run All` i kończy się listą pięciu obserwacji o danych zapisanych w komórce Markdown.

## Test końcowy — zrób EDA na zbiorze, którego nie widziałeś, bez zaglądania do dokumentacji
Weź dataset, którego nie otwierałeś w tej fazie — dowolny CSV z pracy albo wbudowany zbiór seaborn niewykorzystany wcześniej (`sns.get_dataset_names()` pokaże listę) — i w jeden wieczór przejdź od surowego pliku do wniosków. Zamknij dokumentację NumPy, Pandas i Seaborn: dozwolone tylko `?`, `help()` i `df.<TAB>` w notebooku.
Gotowe, gdy masz notebook z wczytaniem, raportem braków, czyszczeniem, co najmniej dwoma `groupby` i czterema wykresami oraz listą pięciu wniosków, a liczba momentów, w których musiałeś otworzyć przeglądarkę, wynosi zero.

## Materiały, których zabrakło w Fazie 0

### [docs] uv — zarządzanie środowiskiem i zależnościami
https://docs.astral.sh/uv/
Uzasadnienie: cała lista Fazy 0 zakłada, że środowisko już działa, a przy pracy lokalnej to nie jest dane. Jedno środowisko na projekt z lockfile'em wprowadzone teraz oszczędza konflikt wersji przy instalacji PyTorcha z indeksem `cu128` w Fazie 3, gdzie błąd instalacyjny kosztuje kilka wieczorów. Do przerobienia w tle przy pierwszym zadaniu, nie jako osobne zadanie.
