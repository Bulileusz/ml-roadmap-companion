# Faza 0 — Python odświeżenie

## Postaw środowisko projektu przez uv
Zainstaluj `uv` (menedżer od autorów Ruffa), załóż katalog projektu na naukę
i utwórz w nim środowisko przez `uv venv`. Dodaj `requirements.txt` z NumPy,
Pandas, Matplotlib, Seaborn i Jupyterem, zainstaluj je przez `uv pip install -r`,
a na koniec załóż `.gitignore`, który wyrzuca `.venv/`, dane i `*.ipynb_checkpoints`.
Materiał: „uv — zarządzanie środowiskiem i zależnościami".
Gotowe, gdy `uv run python -c "import numpy, pandas, seaborn; print('ok')"` wypisuje
`ok`, a `git status` w świeżym repo nie pokazuje ani jednego pliku środowiska.

## Zainstaluj PyTorch pod RTX 5070 i udowodnij, że karta liczy
Twoja karta to architektura Blackwell (compute capability sm_120) i domyślny wheel
z PyPI jej nie obsłuży. Zainstaluj build z indeksu CUDA 12.8:
`uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128`.
Sprawdź wersję sterownika przez `nvidia-smi` (potrzebny 570+). Napisz skrypt
`sprawdz_gpu.py`, który wypisuje `torch.__version__`, `torch.cuda.is_available()`,
`torch.cuda.get_device_name(0)` i `torch.cuda.get_device_capability(0)`, a potem
**wykonuje realne mnożenie macierzy na GPU** — `torch.randn(1000, 1000, device='cuda') @ ...`.
To ostatnie jest sednem: przy złym wheelu `is_available()` kłamie i zwraca `True`,
a dopiero pierwsza operacja wywala się na „no kernel image is available for
execution on the device". Materiał: „PyTorch — Get Started Locally".
Gotowe, gdy skrypt wypisuje capability `(12, 0)`, nazwę Twojej karty, a mnożenie
macierzy kończy się bez wyjątku i zwraca tensor o kształcie `(1000, 1000)`.

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
