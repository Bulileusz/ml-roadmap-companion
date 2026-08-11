# Faza 3 — materiały

## [course] PyTorch: Learn the Basics
https://pytorch.org/tutorials/beginner/basics/intro.html
Oficjalna ścieżka od tensora, przez autograd i budowę modelu, po pełną pętlę
treningową. Osiem krótkich rozdziałów — najkrótsza droga do pierwszej sieci.

## [docs] PyTorch: A Gentle Introduction to torch.autograd
https://pytorch.org/tutorials/beginner/blitz/autograd_tutorial.html
Jak powstaje graf obliczeń i co robi backward(). Odpowiedź na pytanie,
dlaczego autograd nie musi znać wzoru na pochodną twojej straty.

## [book] Dive into Deep Learning (d2l.ai)
https://d2l.ai/
Darmowy podręcznik z kodem w PyTorch i ćwiczeniami po każdej sekcji.
Rozdział 3 — regresja od zera, rozdział 5 — perceptron wielowarstwowy.
Każda sekcja ma wersję „od zera" i „zwięzłą" — przerób obie.

## [docs] PyTorch: torch.nn — warstwy i funkcje straty
https://pytorch.org/docs/stable/nn.html
Referencja. Wejdź na stronę CrossEntropyLoss i przeczytaj akapit o tym, że
funkcja oczekuje surowych logitów — to najczęstsza pułapka tej fazy.

## [docs] PyTorch: optimizery
https://pytorch.org/docs/stable/optim.html
SGD, Adam, weight_decay i harmonogramy współczynnika uczenia. Sekcja
o zero_grad() wyjaśnia, dlaczego gradienty się akumulują.

## [video] Neural Networks: Zero to Hero (Andrej Karpathy)
https://karpathy.ai/zero-to-hero.html
Pierwszy odcinek (micrograd) buduje autograd od zera w czystym Pythonie.
Godzina, po której backpropagation przestaje być czarną skrzynką — bardzo
dobre uzupełnienie oficjalnych tutoriali.

## [docs] PyTorch: Dataset i DataLoader
https://pytorch.org/tutorials/beginner/basics/data_tutorial.html
Batche, tasowanie i wczytywanie własnych danych. Potrzebne, zanim wejdziesz
w Fazę 4 z własnym zbiorem.
