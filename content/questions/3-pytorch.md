# Faza 3 — pytania sprawdzające

## Zapomniałeś `optimizer.zero_grad()`. Opisz krok po kroku, co stanie się ze stratą przez pierwsze kilka iteracji.

`backward()` **dodaje** gradienty do `.grad`, zamiast je nadpisywać. Bez
zerowania po każdej iteracji w `.grad` siedzi suma gradientów ze wszystkich
dotychczasowych batchy.

Iteracja 1: wszystko poprawnie — `.grad` zawiera gradient z jednego batcha.

Iteracja 2: `.grad` to suma gradientów z batcha 1 i 2, czyli mniej więcej
podwojony gradient. Optymalizator robi krok dwa razy za długi.

Iteracja 3: potrojony. Iteracja `n`: `n`-krotny. **Efektywny współczynnik
uczenia rośnie liniowo z numerem iteracji.**

Rezultat: przez pierwsze kilka kroków strata może nawet spadać, potem zaczyna
oscylować, a po kilkudziesięciu iteracjach eksploduje do `inf` i `NaN`. Objaw
jest łudząco podobny do za dużego kroku uczenia — dlatego przy takim zachowaniu
sprawdź `zero_grad()` **zanim** zaczniesz stroić `lr`.

(Ta sama akumulacja bywa używana celowo: kilka batchy bez zerowania symuluje
większy batch, gdy nie mieści się w pamięci.)

## Dlaczego sieć złożona z pięciu warstw liniowych bez aktywacji jest równoważna jednej warstwie liniowej? Pokaż to algebraicznie.

Warstwa liniowa to `y = Wx + b`. Złóżmy dwie:

```
h  = W₁x + b₁
y  = W₂h + b₂ = W₂(W₁x + b₁) + b₂ = (W₂W₁)x + (W₂b₁ + b₂)
```

`W₂W₁` to po prostu jakaś macierz `W'`, a `W₂b₁ + b₂` to jakiś wektor `b'`.
Wyszło `y = W'x + b'` — pojedyncza warstwa liniowa.

Indukcyjnie dla pięciu: `W' = W₅W₄W₃W₂W₁`, `b'` analogicznie. Pięć warstw ma
więcej **parametrów**, ale nie większą **siłę wyrazu** — zbiór funkcji, które
potrafi reprezentować, jest identyczny jak dla jednej warstwy.

Dlatego aktywacja nieliniowa nie jest ozdobnikiem: to ona sprawia, że
dokładanie warstw cokolwiek daje.

## [code] Napisz pętlę treningową od zera, bez `nn.Module` — sam tensor wag, forward, loss, backward i ręczna aktualizacja.

```python
import torch

# y = 3x + 2 z odrobiną szumu
X = torch.randn(200, 1)
y = 3 * X + 2 + 0.1 * torch.randn(200, 1)

w = torch.zeros(1, 1, requires_grad=True)
b = torch.zeros(1, requires_grad=True)
lr = 0.1

for epoka in range(100):
    y_pred = X @ w + b                      # forward
    strata = ((y_pred - y) ** 2).mean()     # MSE

    strata.backward()                       # gradienty do w.grad i b.grad

    with torch.no_grad():                   # aktualizacja poza grafem
        w -= lr * w.grad
        b -= lr * b.grad
        w.grad.zero_()                      # bo backward akumuluje
        b.grad.zero_()

    if epoka % 20 == 0:
        print(f"epoka {epoka:3d}  strata {strata.item():.4f}  "
              f"w {w.item():.3f}  b {b.item():.3f}")

print(f"nauczone: w={w.item():.3f} (cel 3), b={b.item():.3f} (cel 2)")
```

Dwa miejsca, w których łatwo się potknąć: aktualizacja **musi** być w
`torch.no_grad()`, inaczej autograd doda ją do grafu i przy kolejnym `backward()`
dostaniesz błąd o drugim przejściu wstecz; oraz ręczne `zero_()`, bo bez
optymalizatora nikt tego za ciebie nie zrobi.

## Twoja strata spada na treningu, a rośnie na walidacji od trzeciej epoki. Co się dzieje i jakie masz trzy opcje?

Klasyczne **przeuczenie**: od trzeciej epoki model przestaje uczyć się
zależności, a zaczyna zapamiętywać konkretne przykłady treningowe.

**Early stopping** — zatrzymaj trening w minimum straty walidacyjnej i przywróć
wagi z tamtej epoki. Najtańsze i zwykle wystarczające; punkt przecięcia sam
wskazuje właściwy moment.

**Regularyzacja** — dropout, `weight_decay` w optymalizatorze, mniejsza sieć.
Ogranicza pojemność, więc model ma mniej miejsca na zapamiętywanie.

**Więcej danych albo augmentacja** — szum różni się między przykładami, sygnał
nie, więc przy większym zbiorze zapamiętywanie przestaje się opłacać.

Zanim sięgniesz po którąkolwiek: sprawdź, czy zbiór walidacyjny nie pochodzi
z innego rozkładu i czy nie ma wycieku — rosnąca strata walidacyjna od trzeciej
epoki przy zbiorze 200 obrazków może po prostu znaczyć, że walidacja jest za
mała, żeby cokolwiek mierzyć.

## Dodałeś softmax przed `CrossEntropyLoss`. Model dalej się uczy, tylko gorzej. Dlaczego nie dostajesz błędu?

Bo `CrossEntropyLoss` **ma softmax w środku** (dokładniej `log_softmax` +
`NLLLoss`) i przyjmuje surowe logity — ale nie ma jak sprawdzić, czy to, co
dostała, jest już znormalizowane. Twój softmax daje poprawne prawdopodobieństwa
w zakresie (0, 1); funkcja straty traktuje je jako logity i przepuszcza przez
softmax **drugi raz**. Wynik jest wciąż poprawnym rozkładem, więc nic nie
protestuje.

Dlaczego gorzej: podwójny softmax **spłaszcza** rozkład. Wejście do drugiego
softmaxu leży już w (0, 1), więc różnice między klasami są małe, a wyjście
zbliża się do rozkładu jednostajnego. Gradienty maleją, sygnał uczący słabnie
i model zbiega wolniej oraz do gorszego rozwiązania.

Zapamiętaj: `CrossEntropyLoss` → surowe logity. Jeśli chcesz prawdopodobieństw
do raportu, policz softmax osobno, **po** stracie, wewnątrz `torch.no_grad()`.

## Czym różni się `model.eval()` od `torch.no_grad()`? Czy jedno zastępuje drugie?

**Nie zastępuje** — robią zupełnie różne rzeczy i przy inferencji zwykle chcesz
obu.

`model.eval()` przełącza **tryb warstw**, które zachowują się inaczej w treningu
i w inferencji: dropout przestaje wyłączać neurony, a batch normalization
przechodzi ze statystyk bieżącego batcha na zapamiętane średnie biegnące. Nie
ma żadnego wpływu na liczenie gradientów.

`torch.no_grad()` wyłącza **budowanie grafu obliczeń**. Oszczędza pamięć
i przyspiesza, bo nie trzeba zapamiętywać wartości pośrednich do przejścia
wstecz. Nie ma żadnego wpływu na zachowanie warstw.

Pominięcie `eval()` daje **złe wyniki** (dropout losowo psuje predykcje).
Pominięcie `no_grad()` daje **poprawne wyniki**, tylko wolniej i pamięciożernie.

```python
model.eval()
with torch.no_grad():
    predykcje = model(X_test)
```

## Strata wychodzi `NaN` po kilku iteracjach. Wymień cztery możliwe przyczyny i kolejność, w jakiej je sprawdzisz.

Kolejność od najtańszego i najczęstszego:

**1. Za duży współczynnik uczenia.** Najczęstsza przyczyna. Sprawdzenie: zmniejsz
`lr` dziesięciokrotnie i patrz, czy `NaN` znika. Trzydzieści sekund pracy.

**2. Brakujący `zero_grad()`.** Daje objaw łudząco podobny do punktu 1 —
efektywny krok rośnie z każdą iteracją. Sprawdzenie: przeczytaj pętlę.

**3. `NaN` albo `inf` już w danych.** Sprawdzenie: `torch.isnan(X).any()`
i `torch.isinf(X).any()` na wejściu; jedna zła wartość zaraża wszystkie wagi
w jednym przejściu wstecz. Sprawdź też, czy nie ma nieprzeskalowanych cech
rzędu 10⁶.

**4. Niestabilna operacja w stracie.** `log(0)`, dzielenie przez zero, pierwiastek
z liczby ujemnej, ręcznie liczona entropia krzyżowa bez `log_softmax`.
Sprawdzenie: `torch.autograd.set_detect_anomaly(True)` wskaże operację, która
wyprodukowała `NaN` — wolne, więc dopiero na końcu.

Praktycznie pomaga też `torch.nn.utils.clip_grad_norm_`, ale to leczenie objawu,
nie przyczyny.

## [code] Uruchom MLP na tym samym problemie co model liniowy i ensemble z Faz 2/2b. Porównaj wyniki i uzasadnij, czy sieć była tu potrzebna.

```python
import torch, torch.nn as nn
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score

X, y = make_classification(n_samples=5000, n_features=20, n_informative=8,
                           random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=0)
skaler = StandardScaler().fit(Xtr)
Xtr_s, Xte_s = skaler.transform(Xtr), skaler.transform(Xte)

for nazwa, model in [("LogReg", LogisticRegression(max_iter=1000)),
                     ("Boosting", HistGradientBoostingClassifier(random_state=0))]:
    model.fit(Xtr_s, ytr)
    print(f"{nazwa:10} AUC {roc_auc_score(yte, model.predict_proba(Xte_s)[:, 1]):.4f}")

Xt = torch.tensor(Xtr_s, dtype=torch.float32)
yt = torch.tensor(ytr, dtype=torch.float32).unsqueeze(1)
mlp = nn.Sequential(nn.Linear(20, 64), nn.ReLU(), nn.Linear(64, 1))
opt = torch.optim.Adam(mlp.parameters(), lr=1e-3)
kryterium = nn.BCEWithLogitsLoss()

for _ in range(300):
    opt.zero_grad()
    kryterium(mlp(Xt), yt).backward()
    opt.step()

mlp.eval()
with torch.no_grad():
    p = torch.sigmoid(mlp(torch.tensor(Xte_s, dtype=torch.float32))).numpy().ravel()
print(f"{'MLP':10} AUC {roc_auc_score(yte, p):.4f}")
```

Czego się spodziewać: na danych **tabelarycznych** boosting zwykle wygrywa albo
remisuje z MLP, a MLP kosztuje znacznie więcej pracy — skalowanie jest
obowiązkowe, dochodzi dobór architektury, `lr`, liczby epok i early stopping.

Wniosek, którego to ćwiczenie ma nauczyć: **sieć nie jest domyślnym wyborem dla
tabelek**. Zaczyna wygrywać tam, gdzie w danych jest struktura, którą warto
wykorzystać — obrazy, tekst, dźwięk, sekwencje.

## Kiedy zwiększenie rozmiaru batcha pomaga, a kiedy szkodzi? Uwzględnij i jakość, i czas.

**Pomaga:** lepiej wykorzystujesz GPU (jedna duża operacja macierzowa zamiast
wielu małych), więc epoka trwa krócej. Gradient policzony z większej próbki ma
mniejszą wariancję, co daje stabilniejszą zbieżność i pozwala bezpiecznie
podnieść `lr`. Batch normalization potrzebuje sensownej liczby próbek, żeby jej
statystyki cokolwiek znaczyły.

**Szkodzi:** szum w gradiencie z małego batcha działa jak regularyzacja —
pomaga wypaść z płytkich minimów i sprzyja rozwiązaniom lepiej generalizującym.
Bardzo duże batche często zbiegają do minimów „ostrych", które gorzej znoszą
nowe dane. Do tego przy stałej liczbie epok większy batch oznacza **mniej
aktualizacji wag**, więc model uczy się mniej — trzeba podnieść `lr` albo liczbę
epok. No i pamięć: batch nie zmieści się w GPU.

Praktycznie: bierz największy batch mieszczący się w pamięci, a `lr` skaluj
w górę razem z nim — i sprawdzaj na walidacji, czy jakość nie spadła.

## Wyjaśnij, dlaczego autograd nie musi znać wzoru na pochodną twojej funkcji straty, żeby ją policzyć.

Bo nie różniczkuje twojej funkcji jako całości — **rozkłada ją na elementarne
operacje**, których pochodne zna, i skleja regułą łańcuchową.

Kiedy piszesz `strata = ((y_pred - y) ** 2).mean()`, PyTorch nie widzi „MSE".
Widzi: odejmowanie, potęgowanie, uśrednianie. Każda z tych operacji ma
zaimplementowaną własną pochodną, a wykonując je w przód, PyTorch zapisuje graf:
kto z czego powstał i jaka operacja to zrobiła.

`backward()` przechodzi ten graf od końca, mnożąc lokalne pochodne kolejnych
operacji — dokładnie reguła łańcuchowa. Dlatego działa dla **dowolnej** funkcji
złożonej z operacji na tensorach, także takiej, której nikt wcześniej nie
zaimplementował, i takiej, której kształt zależy od instrukcji warunkowej
w Pythonie (graf jest budowany dynamicznie przy każdym przejściu w przód).

Ograniczenie wynika z tego wprost: jeśli wyjdziesz poza operacje na tensorach —
np. przerzucisz coś przez NumPy — łańcuch się urywa i gradient nie popłynie.
