# Faza 1 — Matematyka stosowana

## Narysuj własnym kodem rysunki z „Essence of Linear Algebra"
Obejrzyj rozdziały 1–2 („Vectors", „Linear combinations, span, basis") i odtwórz w Matplotlibie każdy pokazany tam rysunek: pojedynczy wektor jako strzałka od początku układu, suma dwóch wektorów „ogon do głowy", mnożenie przez skalar dodatni i ujemny oraz span dwóch wektorów jako chmura 200 losowych kombinacji liniowych. Użyj `ax.quiver` z `angles='xy', scale_units='xy', scale=1`, bo bez tego strzałki mają nieprawdziwe długości. Na koniec podmień jeden z wektorów spanu tak, żeby był współliniowy z drugim.
Gotowe, gdy skrypt zapisuje PNG z czterema panelami, a na panelu ze spanem współliniowa para wypełnia tylko prostą, nie całą płaszczyznę.

## Przepuść siatkę punktów przez macierze przekształceń z filmu
Obejrzyj rozdział 3 „Linear transformations and matrices", zbuduj przez `np.meshgrid` siatkę punktów w kwadracie [-2, 2]² i przemnóż ją przez cztery macierze 2×2 wprost z filmu: obrót o 90°, ścinanie (shear), skalowanie niejednorodne i rzut na oś X. Rysuj pary przed/po, zaznaczając osobnym kolorem obrazy wektorów bazowych i-hat oraz j-hat.
Gotowe, gdy skrypt rysuje cztery pary paneli, a narysowane obrazy i-hat i j-hat zgadzają się z kolumnami macierzy, które skrypt wypisuje w konsoli.

## Policz iloczyn skalarny trzema drogami i wyciągnij z niego kąt
Przeczytaj sekcję 3.2 („Inner products") z „Mathematics for Machine Learning" i obejrzyj rozdział „Dot products and duality". Napisz skrypt, który dla dziesięciu par wektorów w R³ liczy iloczyn skalarny pętlą, przez `np.sum(a * b)` i przez `np.dot`, a następnie wyznacza kąt przez `arccos` z normalizacją `np.linalg.norm`, rzut prostopadły jednego wektora na drugi oraz cosine similarity. Dołóż trzy pary specjalne: prostopadłą, równoległą i przeciwnie skierowaną.
Gotowe, gdy trzy metody dają ten sam wynik do 1e-12, a skrypt wypisuje dokładnie 90°, 0° i 180° dla trzech dołożonych par.

## Pokaż numerycznie, że mnożenie macierzy to składanie przekształceń
Obejrzyj rozdział „Matrix multiplication as composition" i na siatce z zadania o przekształceniach sprawdź dwie rzeczy: że `(A @ B) @ v` daje to samo co `A @ (B @ v)` dla stu losowych wektorów, oraz że `A @ B` to nie to samo co `B @ A`. Narysuj obok siebie obie kolejności — obrót po ścinaniu i ścinanie po obrocie.
Gotowe, gdy skrypt wypisuje maksymalną różnicę bezwzględną poniżej 1e-12 dla łączności i wyraźnie niezerową dla przemienności, a na wykresie widać dwie różne figury.

## Zbadaj, co mierzy wyznacznik i kiedy macierz przestaje być odwracalna
Obejrzyj rozdział „The determinant" i przeczytaj o wyznaczniku oraz macierzy odwrotnej w rozdziale 2 „Mathematics for Machine Learning". Dla sześciu macierzy 2×2 — w tym jednej z zerowym i jednej z ujemnym wyznacznikiem — policz `np.linalg.det`, wyznacz pole obrazu kwadratu jednostkowego ze wzoru na pole wielokąta po współrzędnych wierzchołków i porównaj je z modułem wyznacznika; dla każdej spróbuj `np.linalg.inv` i złap `LinAlgError`.
Gotowe, gdy skrypt wypisuje tabelkę macierz / wyznacznik / pole obrazu / odwracalna, pola zgadzają się z wyznacznikami do 1e-6, a przypadek osobliwy kończy się złapanym wyjątkiem, nie przerwaniem programu.

## Znajdź kierunki, których macierz nie obraca
Obejrzyj rozdział „Eigenvectors and eigenvalues" i przeczytaj sekcję 4.2 z „Mathematics for Machine Learning". Policz `np.linalg.eig` dla trzech macierzy 2×2 (jedna symetryczna, jedna ścinająca, jedna obrotowa — ta ostatnia da wartości zespolone), narysuj dla każdej kilkanaście losowych wektorów przed i po przekształceniu oraz osobno wektory własne, i sprawdź numerycznie residuum `A @ v - λ * v`.
Gotowe, gdy residuum ma normę poniżej 1e-10 dla każdej pary (λ, v), na wykresie strzałki własne przed i po leżą na jednej prostej w odróżnieniu od pozostałych, a dla macierzy obrotu skrypt wypisuje, że część urojona jest niezerowa.

## SKŁADAJĄCE — dopasuj model liniowy do pomiarów przez równania normalne
Weź `pomiary.csv` z fazy 0 (albo wygeneruj podobny zbiór), zbuduj macierz planu `X` z kolumną jedynek i dopasuj wytrzymałość do wieku i temperatury, licząc współczynniki ze wzoru `(Xᵀ X)⁻¹ Xᵀ y` — ale rozwiąż to przez `np.linalg.solve`, nie przez jawne `inv`. Porównaj wynik z `np.linalg.lstsq` i zobacz, jak zmienia się `np.linalg.cond(X.T @ X)`, gdy dołożysz kolumnę będącą sumą dwóch pozostałych. Materiały: „NumPy: linear algebra" i rozdział 9 „Mathematics for Machine Learning".
Gotowe, gdy współczynniki z obu metod zgadzają się do sześciu miejsc po przecinku, skrypt rysuje wykres reszt, a wskaźnik uwarunkowania po dołożeniu zależnej kolumny rośnie o kilka rzędów wielkości.

## Wylosuj próbki z czterech rozkładów i przyłóż do nich gęstość teoretyczną
Przejdź sekcje o rozkładach w „Seeing Theory", a potem wylosuj po 10 000 próbek z rozkładu jednostajnego, normalnego, dwumianowego i wykładniczego przez `np.random.default_rng(42)`. Dla każdego narysuj histogram z `density=True` i nałóż na niego krzywą gęstości (albo słupki funkcji masy) policzoną ręcznie ze wzoru w NumPy, bez gotowej funkcji z biblioteki statystycznej.
Gotowe, gdy cztery panele pokazują histogram pokrywający się z narysowaną krzywą, a skrypt wypisuje dla każdego rozkładu średnią i wariancję próbki obok wartości teoretycznych.

## Sprawdź empirycznie wartość oczekiwaną, wariancję i prawo wielkich liczb
Przerób sekcje o wartości oczekiwanej i wariancji z „Khan Academy: statystyka i prawdopodobieństwo". Napisz skrypt, który dla rzutu kostką i dla rozkładu wykładniczego liczy E[X] i Var(X) z definicji (suma po wartościach / całka numeryczna) oraz z próbek o rozmiarach od 10 do 100 000, i rysuje bieżącą średnią w funkcji liczby próbek w skali logarytmicznej. Porównaj przy okazji `np.var(..., ddof=0)` z `ddof=1` na małych próbkach.
Gotowe, gdy wykres pokazuje krzywą zbiegającą do poziomej linii wartości teoretycznej, a skrypt wypisuje, przy ilu próbkach błąd spada trwale poniżej 1% i o ile procent różnią się obie wersje wariancji dla n=5.

## Zobacz centralne twierdzenie graniczne i sprawdź, ile naprawdę obiecuje przedział ufności
Przeklikaj rozdział o centralnym twierdzeniu granicznym w „Seeing Theory" i wylosuj z wyraźnie skośnego rozkładu wykładniczego po 5000 średnich z próbek o rozmiarach 1, 5, 30 i 200 — narysuj cztery histogramy tych średnich i porównaj ich odchylenia standardowe z `σ/√n`. Na tej samej pętli policz dla każdej próbki o n=30 przedział `x̄ ± 1.96 · s/√n` i sprawdź, jaki odsetek przedziałów zawiera prawdziwą średnią.
Gotowe, gdy histogram dla n=200 jest symetryczny mimo skośnego wejścia, zmierzone odchylenia zgadzają się z `σ/√n` w granicach 5%, a odsetek trafionych przedziałów wypada między 93% a 97%.

## Policz korelację ręcznie i rozbij ją kwartetem Anscombe'a
Zaimplementuj kowariancję i korelację Pearsona wprost ze wzoru w NumPy i porównaj z `np.cov` oraz `np.corrcoef`, a potem uruchom swoją funkcję na czterech zbiorach z `sns.load_dataset("anscombe")`. Do każdego zbioru dorysuj wykres rozrzutu z prostą dopasowaną metodą z zadania o równaniach normalnych.
Gotowe, gdy skrypt wypisuje cztery niemal identyczne korelacje (zgodne do drugiego miejsca po przecinku) i cztery niemal identyczne pary współczynników prostej, a panele wyglądają zupełnie inaczej.

## Zbuduj dane, w których korelacja kłamie
Zasymuluj confounder: wylosuj zmienną `Z` (np. temperaturę dojrzewania), zbuduj `X` i `Y` jako jej zaszumione funkcje, bez żadnej bezpośredniej zależności między nimi, i policz `corr(X, Y)`. Usuń wpływ `Z`, dopasowując regresję liniową obu zmiennych względem `Z` i licząc korelację reszt; osobno zasymuluj drugi przypadek, w którym filtrowanie po zmiennej zależnej od `X` i `Y` tworzy korelację, której w danych nie było.
Gotowe, gdy skrypt wypisuje korelację surową powyżej 0.7 i korelację reszt poniżej 0.1, a wykres pokazuje oba przypadki obok siebie z wpisanymi w tytuły wartościami korelacji.

## SKŁADAJĄCE — policz PCA ręcznie i zweryfikuj je rozkładem SVD
Na liczbowych kolumnach zbioru `penguins` (albo własnych pomiarach) wystandaryzuj dane, policz macierz kowariancji, wyznacz jej wektory i wartości własne przez `np.linalg.eigh`, posortuj malejąco i zrzutuj dane na dwie pierwsze składowe, kolorując punkty gatunkiem. Porównaj wynik z `np.linalg.svd` na wycentrowanej macierzy. Materiały: rozdział 10 „Mathematics for Machine Learning" i „NumPy: linear algebra".
Gotowe, gdy skrypt wypisuje udział wyjaśnionej wariancji każdej składowej, wartości własne zgadzają się z kwadratami wartości osobliwych podzielonymi przez n−1 do 1e-8, a na rzucie gatunki tworzą rozdzielone skupiska.

## Policz pochodną numerycznie i znajdź punkt, w którym się psuje
Obejrzyj rozdziały 1–3 „Essence of Calculus" i zaimplementuj iloraz różnicowy w dwóch wariantach — jednostronnym `(f(x+h) - f(x)) / h` i centralnym `(f(x+h) - f(x-h)) / (2h)` — dla trzech funkcji, których pochodną potrafisz podać analitycznie. Policz błąd względem wartości dokładnej dla `h` od 1e-1 do 1e-16 i narysuj go w skali log-log.
Gotowe, gdy wykres ma kształt litery „V" (najpierw błąd maleje, potem rośnie od błędów zaokrągleń), a skrypt wypisuje `h` minimalizujące błąd dla obu wariantów wraz z wartością błędu, o kilka rzędów mniejszą dla wariantu centralnego.

## Rozłóż wyrażenie jednego neuronu na graf i przejdź go w obie strony
Obejrzyj rozdział o regule łańcuchowej z „Essence of Calculus" oraz rozdział o backpropagation z serii „Neural networks". Weź wyrażenie `z = w*x + b`, `a = sigmoid(z)`, `L = (a - y)²`, wyprowadź na kartce `dL/dw` i `dL/db`, a potem zaimplementuj `forward` zwracające wartości pośrednie i `backward` zwracające gradienty, korzystając z tych wartości. Zweryfikuj je pochodną numeryczną z poprzedniego zadania.
Gotowe, gdy dla dziesięciu losowych zestawów `(w, b, x, y)` gradient analityczny i numeryczny różnią się względnie o mniej niż 1e-6.

## Narysuj pole gradientu i sprawdź, że jest prostopadłe do poziomic
Przeczytaj z rozdziału 5 („Vector calculus") „Mathematics for Machine Learning" części o pochodnych cząstkowych i gradiencie. Dla dwóch funkcji dwóch zmiennych (np. `f = x² + 3y²` oraz funkcji z siodłem) policz gradient analitycznie i numerycznie, narysuj poziomice przez `ax.contour` i nałóż na nie pole gradientu przez `ax.quiver` na rzadszej siatce.
Gotowe, gdy strzałki wychodzą prostopadle do poziomic i wskazują kierunek wzrostu, a skrypt wypisuje dla dwudziestu punktów iloczyn skalarny gradientu z wektorem stycznym do poziomicy, co do modułu mniejszy niż 1e-6.

## Zejdź gradientem do minimum i zepsuj to learning rate'em
Zaimplementuj gradient descent w kilkunastu linijkach i uruchom go na funkcji z poprzedniego zadania z czterema wartościami learning rate: za małą, dobrą, na granicy stabilności i rozbiegającą. Narysuj cztery trajektorie na poziomicach oraz wykres wartości funkcji w kolejnych krokach, a potem tym samym optymalizatorem dopasuj współczynniki regresji z zadania o równaniach normalnych.
Gotowe, gdy jedna trajektoria wyraźnie ucieka poza wykres, wykres straty dla dobrego learning rate maleje monotonicznie, a współczynniki znalezione gradientem zgadzają się z rozwiązaniem analitycznym do trzech miejsc po przecinku.

## Test końcowy — napisz sieć z jedną warstwą ukrytą i wyprowadź jej gradienty samodzielnie
Wygeneruj w NumPy zbiór 2D, którego nie da się rozdzielić prostą (dwa koncentryczne okręgi albo dwa księżyce z szumem), i zbuduj od zera sieć 2 → 8 → 1 z sigmoidą i błędem kwadratowym: forward pass, backward pass wyprowadzony regułą łańcuchową na macierzach i pętla treningowa z gradient descent. Bez PyTorcha i bez zaglądania do cudzego kodu ani do materiałów — dozwolone są wyłącznie własne skrypty z tej fazy.
Gotowe, gdy gradient check względem pochodnej numerycznej daje błąd względny poniżej 1e-5 dla obu macierzy wag i obu wektorów bias, krzywa straty maleje, a rysunek granicy decyzyjnej pokazuje poprawną klasyfikację powyżej 95% punktów.
