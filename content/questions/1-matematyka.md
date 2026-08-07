# Faza 1 — pytania sprawdzające

## Dlaczego iloczyn skalarny dwóch prostopadłych wektorów wynosi zero? Wyjaśnij bez wzoru, samą geometrią.

Iloczyn skalarny mierzy, **ile jednego wektora leży wzdłuż drugiego** — czyli
długość rzutu pierwszego na kierunek drugiego, przemnożoną przez długość
drugiego.

Gdy wektory są prostopadłe, rzut jednego na drugi to punkt: nic z pierwszego
wektora nie „idzie w stronę" drugiego. Cień pada dokładnie na początek układu,
więc długość rzutu wynosi zero, a wraz z nią cały iloczyn.

Stąd też znak: kąt ostry — rzut w tę samą stronę co drugi wektor, wynik
dodatni; kąt rozwarty — rzut w przeciwną, wynik ujemny.

## Macierz ma wyznacznik równy zero. Co to mówi o jej kolumnach i o układzie równań, który reprezentuje?

**O kolumnach:** są liniowo zależne — co najmniej jedną da się zapisać jako
kombinację pozostałych. Nie rozpinają pełnej przestrzeni, tylko jej podprzestrzeń
niższego wymiaru. Przekształcenie spłaszcza przestrzeń (płaszczyznę do prostej,
przestrzeń do płaszczyzny), a spłaszczenia nie da się odwrócić — bo wiele
różnych punktów wejściowych trafia w to samo miejsce.

**O układzie równań:** nie ma dokładnie jednego rozwiązania. Albo nie ma
żadnego (prawa strona leży poza spłaszczonym obrazem), albo jest ich
nieskończenie wiele (leży wewnątrz, a całe jądro przekształcenia można dodać do
dowolnego rozwiązania).

W praktyce ML to sygnał współliniowości cech — np. gdy dodałeś zarówno wszystkie
kolumny one-hot, jak i wyraz wolny.

## Dwie zmienne mają korelację Pearsona równą 0. Czy na pewno są niezależne? Podaj kontrprzykład.

Nie. Korelacja Pearsona mierzy wyłącznie związek **liniowy**.

Kontrprzykład: `x` losowane symetrycznie wokół zera, `y = x²`. Zależność jest
idealna i deterministyczna — znając `x` znasz `y` dokładnie — a korelacja wynosi
0, bo dla każdego dodatniego odchylenia `x` istnieje symetryczne ujemne dające
to samo `y`, i wkłady znoszą się w sumie.

To samo dotyczy zależności okresowych (`y = sin x`) i każdej symetrycznej
wokół średniej. Niezależność implikuje zerową korelację, ale nie odwrotnie.

## Dlaczego w gradient descent idziemy w stronę minus gradientu, a nie plus?

Bo gradient wskazuje kierunek **najszybszego wzrostu** funkcji, a my minimalizujemy
stratę. Idąc zgodnie z gradientem, wspinalibyśmy się po zboczu — strata by rosła.

Obrazowo: stoisz na zboczu we mgle i chcesz zejść do doliny. Gradient mówi „tam
jest najbardziej pod górę". Odwracasz się i robisz krok.

Współczynnik uczenia to długość tego kroku. Sam gradient podaje kierunek i
stromiznę, nie mówi, jak daleko iść — dlatego przy stromym zboczu i dużym kroku
można przeskoczyć dolinę na drugie zbocze.

## [code] Policz gradient funkcji f(x, y) = x²y + 3y numerycznie (różnicą skończoną) i porównaj z wyprowadzonym analitycznie.

Analitycznie: `∂f/∂x = 2xy`, `∂f/∂y = x² + 3`.

```python
def f(x, y):
    return x**2 * y + 3*y

def gradient_numeryczny(x, y, h=1e-5):
    # Różnica centralna - błąd rzędu h², a nie h jak przy jednostronnej.
    df_dx = (f(x + h, y) - f(x - h, y)) / (2 * h)
    df_dy = (f(x, y + h) - f(x, y - h)) / (2 * h)
    return df_dx, df_dy

x, y = 2.0, 3.0
print("numerycznie:", gradient_numeryczny(x, y))
print("analitycznie:", (2*x*y, x**2 + 3))   # (12.0, 7.0)
```

Zgodzą się do kilku miejsc po przecinku. Zbyt małe `h` **pogarsza** wynik —
odejmowanie dwóch bliskich liczb zmiennoprzecinkowych traci cyfry znaczące.
To jest dokładnie mechanizm, którym sprawdza się poprawność ręcznie
napisanego backpropagation.

## Współczynnik uczenia jest za duży. Opisz, co konkretnie dzieje się z wartością straty krok po kroku i dlaczego.

Krok 1: jesteś na zboczu, gradient wskazuje w dół doliny, robisz krok — ale tak
długi, że **przelatujesz nad minimum** i lądujesz na przeciwległym zboczu, wyżej
niż byłeś.

Krok 2: tam gradient jest jeszcze bardziej stromy (bo odszedłeś dalej od
minimum), więc kolejny krok jest jeszcze dłuższy i wyrzuca cię jeszcze wyżej po
przeciwnej stronie.

Krok 3 i dalej: amplituda rośnie wykładniczo. Strata skacze naprzemiennie w górę,
po kilku–kilkunastu iteracjach przekracza zakres liczb zmiennoprzecinkowych
i pojawia się `inf`, a zaraz po nim `NaN` — bo `inf - inf` jest nieokreślone
i zaraża wszystkie wagi.

Objaw diagnostyczny: strata nie „powoli rośnie", tylko **oscyluje z rosnącą
amplitudą**. Powolny wzrost to zwykle przeuczenie, nie za duży krok.

## Wyjaśnij regułę łańcuchową komuś, kto zna pochodne, ale nigdy nie widział sieci neuronowej — i pokaż, gdzie wraca w backpropagation.

Reguła łańcuchowa mówi, jak zmiana na wejściu przekłada się na wyjście, gdy po
drodze jest kilka przekształceń: **mnożysz wrażliwości**. Jeśli `y` zależy od
`u`, a `u` od `x`, to `dy/dx = dy/du · du/dx`. Przekładnia: koło A obraca koło B
trzy razy szybciej, koło B obraca C dwa razy szybciej — więc A obraca C sześć
razy szybciej.

Sieć neuronowa to złożenie wielu takich przekształceń: wejście → warstwa 1 →
aktywacja → warstwa 2 → … → strata. Żeby wiedzieć, jak waga w pierwszej warstwie
wpływa na stratę, trzeba przemnożyć wrażliwości wszystkich ogniw między nią
a stratą.

Backpropagation to właśnie ta reguła stosowana systematycznie od końca:
zaczynamy od pochodnej straty po wyjściu i cofamy się warstwa po warstwie,
mnożąc po drodze. Robimy to od tyłu, a nie od przodu, bo wyjście jest jedno,
a wag są miliony — jedno przejście wstecz daje pochodne dla wszystkich naraz.

## Dlaczego regularyzacja L1 zeruje część wag, a L2 tylko je kurczy? Odpowiedz odwołując się do kształtu obu norm.

Optymalizacja z regularyzacją to szukanie najniższej straty **wewnątrz obszaru
wyznaczonego przez normę**. Rozwiązanie ląduje tam, gdzie warstwice straty
dotkną brzegu tego obszaru.

**L1** (`|w₁| + |w₂| ≤ c`) to kwadrat obrócony o 45°, czyli romb z **wierzchołkami
na osiach**. Wierzchołek to punkt wystający — warstwice straty, spływając,
najczęściej trafiają właśnie w niego. A wierzchołek leżący na osi oznacza, że
druga współrzędna jest dokładnie zerem. Stąd selekcja cech.

**L2** (`w₁² + w₂² ≤ c`) to okrąg. Okrąg **nie ma wierzchołków** — jest gładki
w każdym punkcie, więc styczność wypada zwykle w miejscu, gdzie obie
współrzędne są niezerowe, tylko mniejsze. Stąd równomierne kurczenie.

Ta sama intuicja w języku pochodnych: pochodna `|w|` ma stałą wartość niezależnie
od tego, jak małe jest `w`, więc dopycha do zera do końca. Pochodna `w²` to `2w`
— maleje razem z `w`, więc siła kurczenia zanika, zanim dojdzie do zera.

## Średnia i mediana zbioru różnią się bardzo mocno. Co to mówi o rozkładzie i którą statystykę wybierzesz do raportu?

Rozkład jest **skośny** albo ma silne obserwacje odstające. Średnia > mediana
oznacza ogon w prawo (kilka bardzo dużych wartości ciągnie średnią w górę) —
klasycznie zarobki, ceny mieszkań, czas na stronie. Średnia < mediana to ogon
w lewo.

Do raportu zwykle **mediana**, bo odpowiada na pytanie „ile ma typowy przypadek"
i nie daje się przesunąć jednym miliarderem w próbce. Średnia mówi co innego:
jest sumą podzieloną przez liczebność, więc ma sens tam, gdzie interesuje cię
łączna wielkość — budżet, całkowity przychód.

Najuczciwiej: podaj obie i zaznacz rozjazd. Sam rozjazd jest informacją
o zbiorze, a nie usterką do zamiecenia.
