# Faza 1 — Matematyka stosowana

## Co geometrycznie mówi iloczyn skalarny?
`a · b = |a| |b| cos θ`. Mierzy, **jak bardzo dwa wektory są zgodne co do
kierunku**: dodatni — kąt ostry, zero — prostopadłe, ujemny — rozwarty.
Stąd bierze się podobieństwo kosinusowe i rzutowanie wektora na wektor.

## Czym jest norma wektora?
Długość. Norma L2 (euklidesowa) to `sqrt(Σ xᵢ²)`, norma L1 to `Σ |xᵢ|`.
W ML wracają jako regularyzacja: L2 (ridge) kurczy wagi płynnie, L1 (lasso)
zeruje część z nich, dając selekcję cech.

## Macierz jako przekształcenie — co to znaczy?
Mnożenie `Ax` przenosi wektor `x` w nowe miejsce: obraca, skaluje, odbija,
ścina. Kolumny `A` to obrazy wektorów bazowych. Cała algebra liniowa w ML
to składanie takich przekształceń.

## Kiedy da się pomnożyć macierze?
`(m × n) · (n × p) = (m × p)` — **wewnętrzne wymiary muszą się zgadzać**.
Mnożenie macierzy nie jest przemienne: `AB ≠ BA`.

## Co mówi wyznacznik macierzy?
Ile razy przekształcenie zmienia "objętość" i czy odwraca orientację
(znak). **Wyznacznik zero oznacza spłaszczenie** wymiaru — macierz jest
osobliwa, nieodwracalna, kolumny liniowo zależne.

## Wartość oczekiwana — definicja i intuicja
`E[X] = Σ xᵢ p(xᵢ)`, czyli średnia ważona prawdopodobieństwami. Intuicja:
średnia z bardzo wielu powtórzeń eksperymentu. Jest liniowa:
`E[aX + bY] = aE[X] + bE[Y]` — zawsze, nawet dla zależnych zmiennych.

## Wariancja a odchylenie standardowe
Wariancja to `E[(X − E[X])²]` — średni kwadrat odchylenia od średniej.
Odchylenie standardowe to jej pierwiastek, więc ma **tę samą jednostkę co
dane** i dlatego lepiej się je interpretuje.

## Reguła 68–95–99,7
W rozkładzie normalnym w przedziale ±1σ od średniej leży ok. 68%
obserwacji, ±2σ ok. 95%, ±3σ ok. 99,7%. Szybki test "czy ta wartość jest
nietypowa".

## Co mierzy korelacja Pearsona i jakie ma ograniczenia?
Siłę i kierunek **liniowego** związku, w zakresie od −1 do 1. Nie wykrywa
zależności nieliniowych (parabola może dać r ≈ 0) i jest wrażliwa na
obserwacje odstające.

## Dlaczego korelacja to nie przyczynowość?
Współwystępowanie może wynikać ze zmiennej zakłócającej (obie wielkości
zależą od trzeciej), z odwrotnego kierunku przyczyny albo z przypadku przy
wielokrotnym testowaniu. Przyczynowość wymaga eksperymentu albo mocnych
założeń o strukturze zjawiska.

## Pochodna — co mówi w jednym zdaniu?
Tempo zmiany funkcji w punkcie, czyli nachylenie stycznej. Dodatnia —
funkcja rośnie, ujemna — maleje, zero — punkt stacjonarny (kandydat na
minimum lub maksimum).

## Czym jest gradient?
Wektor pochodnych cząstkowych po wszystkich zmiennych. Wskazuje **kierunek
najszybszego wzrostu** funkcji, a jego długość mówi, jak stromo. Dlatego
w uczeniu idziemy w stronę **minus** gradientu.

## Reguła łańcuchowa — po co w ML?
Pochodna złożenia: `(f(g(x)))' = f'(g(x)) · g'(x)`. Sieć neuronowa to
złożenie wielu funkcji, więc backpropagation to systematyczne stosowanie
tej reguły od straty wstecz do każdej wagi.

## Gradient descent w jednym kroku
`w ← w − η ∇L(w)`. Liczymy gradient straty po wagach i przesuwamy wagi
w przeciwnym kierunku o krok proporcjonalny do współczynnika uczenia `η`.
Powtarzamy aż strata przestanie spadać.
