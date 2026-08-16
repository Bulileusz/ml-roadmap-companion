# Faza 0 — materiały

## [docs] uv — zarządzanie środowiskiem i zależnościami
https://docs.astral.sh/uv/
Menedżer pakietów i środowisk od autorów Ruffa. Zastępuje pip i venv, a lockfile
(`uv.lock`) sprawia, że środowisko da się odtworzyć co do wersji. Pierwsza rzecz
do postawienia — cała reszta listy zakłada, że masz gdzie uruchomić kod.

## [docs] PyTorch: Get Started Locally (instalacja pod RTX 5070)
https://pytorch.org/get-started/locally/
Oficjalny generator komendy instalacyjnej. Twoja karta to Blackwell (sm_120),
więc potrzebny jest wheel z indeksu CUDA 12.8, a nie domyślny z PyPI:
`uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128`.
Przy złym buildzie `torch.cuda.is_available()` zwraca True, a dopiero pierwsza
operacja wywala się na „no kernel image is available for execution on the device" —
dlatego weryfikacja idzie przez realne mnożenie macierzy, nie przez samą flagę.

## [docs] NumPy: absolute beginners guide
https://numpy.org/doc/stable/user/absolute_beginners.html
Oficjalny wstęp: tworzenie tablic, kształty, indeksowanie, broadcasting.
Krótszy niż się wydaje, a pokrywa większość tego, czego potrzeba do Fazy 0.

## [docs] NumPy: broadcasting
https://numpy.org/doc/stable/user/basics.broadcasting.html
Jedna strona, ale to ona rozstrzyga, dlaczego (3,4) + (4,) działa,
a (3,4) + (3,) nie. Warto przeczytać dwa razy i przerobić przykłady.

## [docs] Pandas: 10 minutes to pandas
https://pandas.pydata.org/docs/user_guide/10min.html
Szybki przekrój: wczytywanie, selekcja, braki, groupby, łączenie.
Do potraktowania jako mapa, nie jako komplet.

## [docs] Pandas: indeksowanie i wybór danych
https://pandas.pydata.org/docs/user_guide/indexing.html
Sekcja o .loc, .iloc i indeksowaniu łańcuchowym — źródło odpowiedzi
na pytanie o SettingWithCopyWarning.

## [book] Python for Data Analysis (Wes McKinney)
https://wesmckinney.com/book/
Darmowa wersja online, napisana przez autora Pandas. Rozdziały 4–5 (NumPy,
Pandas) i 8 (łączenie, grupowanie) pokrywają całą Fazę 0.

## [docs] Matplotlib: Quick start guide
https://matplotlib.org/stable/users/explain/quick_start.html
Różnica między interfejsem pyplot a obiektowym — warto poznać ten drugi
od razu, bo cała reszta dokumentacji go używa.

## [docs] Seaborn: tutorial
https://seaborn.pydata.org/tutorial.html
Histogramy, scatter, boxploty i podział na kategorie w jednej linii.
Sekcja o rozkładach jest wprost pod zadanie z EDA.
