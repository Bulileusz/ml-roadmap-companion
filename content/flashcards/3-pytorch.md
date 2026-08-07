# Faza 3 — PyTorch, pierwsza sieć

## Tensor a `np.ndarray` — co dochodzi?
Tensor umie liczyć na GPU i **śledzi historię operacji** na potrzeby
autogradu. Poza tym API jest bardzo podobne. Tensor na CPU może dzielić
pamięć z tablicą NumPy (`torch.from_numpy`), więc zmiana jednego widać
w drugim.

## Co robi `requires_grad=True`?
Włącza śledzenie operacji na tensorze. PyTorch buduje wtedy graf obliczeń,
a `backward()` policzy pochodną straty po tym tensorze i zapisze ją w polu
`.grad`. Parametry modelu mają to ustawione domyślnie.

## Jak działa autograd?
W przód budowany jest dynamiczny graf wykonanych operacji. `loss.backward()`
przechodzi ten graf wstecz, stosując regułę łańcuchową, i **akumuluje**
gradienty w `.grad` liści grafu. Graf jest domyślnie zwalniany po jednym
przejściu wstecz.

## Pięć kroków pętli treningowej
1. `optimizer.zero_grad()` — wyzeruj gradienty.
2. `output = model(x)` — przejście w przód.
3. `loss = criterion(output, y)` — policz stratę.
4. `loss.backward()` — przejście wstecz.
5. `optimizer.step()` — zaktualizuj wagi.

## Dlaczego trzeba wołać `zero_grad()`?
Bo `backward()` **dodaje** nowe gradienty do już istniejących, zamiast je
nadpisywać. Bez zerowania krok optymalizatora korzystałby z sumy gradientów
ze wszystkich dotychczasowych batchy. (Ta akumulacja bywa celowo używana do
symulowania większego batcha.)

## Po co funkcja aktywacji?
Bez nieliniowości złożenie warstw liniowych **jest** przekształceniem
liniowym — dziesięciowarstwowa sieć miałaby siłę wyrazu jednej warstwy.
Aktywacja wprowadza nieliniowość, dzięki której sieć modeluje złożone
zależności.

## ReLU — definicja, zaleta, pułapka
`max(0, x)`. Tania w liczeniu i nie wysyca się dla dodatnich wejść, więc
nie dusi gradientu jak sigmoida. Pułapka: neuron, który trwale wpadnie
w obszar ujemny, ma zerowy gradient i przestaje się uczyć ("umierające
ReLU") — stąd warianty typu Leaky ReLU.

## Epoka, batch, iteracja
**Batch** — porcja próbek przetwarzana jednorazowo. **Iteracja** — jedna
aktualizacja wag, czyli jeden batch. **Epoka** — jedno pełne przejście przez
cały zbiór treningowy. Liczba iteracji w epoce = rozmiar zbioru / rozmiar
batcha.

## Współczynnik uczenia — objawy złego doboru
Za duży: strata skacze, rośnie albo daje `NaN`. Za mały: strata spada
boleśnie wolno i model potrafi utknąć. To zwykle **pierwszy** hiperparametr
do strojenia.

## `model.train()` a `model.eval()`
Przełączają tryb warstw zachowujących się różnie w treningu i inferencji:
dropout (aktywny / wyłączony) i batch normalization (statystyki z batcha /
zapamiętane średnie). Nie wyłączają liczenia gradientów — do tego służy
`torch.no_grad()`.

## Częsty błąd z `CrossEntropyLoss`
Ta funkcja **ma softmax w środku** i oczekuje surowych logitów. Dołożenie
własnego softmaxa przed nią to podwójne zastosowanie — trening będzie
działał wolniej i gorzej, często bez żadnego błędu.

## Czym jest MLP?
Perceptron wielowarstwowy: sekwencja warstw w pełni połączonych
przedzielonych nieliniowościami. Każdy neuron warstwy widzi wszystkie
wyjścia poprzedniej. Punkt wyjścia do sieci głębokich i naturalne
porównanie z modelami z Fazy 2/2b na tym samym problemie.
