# Faza 3 — pytania sprawdzające

## Zapomniałeś `optimizer.zero_grad()`. Opisz krok po kroku, co stanie się ze stratą przez pierwsze kilka iteracji.

## Dlaczego sieć złożona z pięciu warstw liniowych bez aktywacji jest równoważna jednej warstwie liniowej? Pokaż to algebraicznie.

## [code] Napisz pętlę treningową od zera, bez `nn.Module` — sam tensor wag, forward, loss, backward i ręczna aktualizacja.

## Twoja strata spada na treningu, a rośnie na walidacji od trzeciej epoki. Co się dzieje i jakie masz trzy opcje?

## Dodałeś softmax przed `CrossEntropyLoss`. Model dalej się uczy, tylko gorzej. Dlaczego nie dostajesz błędu?

## Czym różni się `model.eval()` od `torch.no_grad()`? Czy jedno zastępuje drugie?

## Strata wychodzi `NaN` po kilku iteracjach. Wymień cztery możliwe przyczyny i kolejność, w jakiej je sprawdzisz.

## [code] Uruchom MLP na tym samym problemie co model liniowy i ensemble z Faz 2/2b. Porównaj wyniki i uzasadnij, czy sieć była tu potrzebna.

## Kiedy zwiększenie rozmiaru batcha pomaga, a kiedy szkodzi? Uwzględnij i jakość, i czas.

## Wyjaśnij, dlaczego autograd nie musi znać wzoru na pochodną twojej funkcji straty, żeby ją policzyć.
