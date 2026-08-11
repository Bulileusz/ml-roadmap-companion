# Faza 4 — Projekt domenowy

## Od czego zacząć projekt: od modelu czy od metryki?
Od metryki i sposobu walidacji. Bez zdefiniowanego "co znaczy dobrze" i
uczciwego podziału danych każdy wynik jest nieporównywalny, a poprawki
modelu to zgadywanie. Model wybiera się dopiero po ustawieniu tej ramy.

## Dlaczego losowy podział danych bywa błędny?
Bo zakłada niezależność obserwacji. Przy szeregach czasowych trzeba dzielić
**po czasie** (trening z przeszłości, test z przyszłości). Przy zdjęciach
tego samego obiektu — **po grupach**, inaczej niemal identyczne ujęcia
trafią po obu stronach podziału i wynik będzie zawyżony.

## Czym jest transfer learning?
Wykorzystanie modelu wytrenowanego na dużym zbiorze (np. ImageNet) jako
punktu startowego: wczesne warstwy wykrywają ogólne wzorce — krawędzie,
tekstury — i przenoszą się na nową domenę. Douczamy końcówkę albo całość
z małym współczynnikiem uczenia. Standard przy małym zbiorze domenowym.

## Po co augmentacja danych?
Sztucznie powiększa zbiór przez przekształcenia zachowujące etykietę
(obrót, przycięcie, zmiana jasności). Uczy model niezmienniczości i
ogranicza przeuczenie. Uwaga: przekształcenie musi mieć sens w domenie —
odbicie lustrzane zdjęcia rysy w betonie tak, odbicie cyfry już nie.

## Dlaczego model bazowy jest pierwszym krokiem?
Daje punkt odniesienia i wykrywa błędy w potoku danych, zanim wsiąkniesz
w strojenie. Jeśli trywialny model osiąga 95%, problem może być łatwiejszy,
niż zakładasz — albo masz wyciek danych.

## Co zapisywać przy każdym eksperymencie?
Wersję danych, przekształcenia, hiperparametry, ziarno losowości, metryki
treningowe i walidacyjne oraz jednozdaniowy wniosek. Bez tego po dwudziestu
przebiegach nie odtworzysz, który był najlepszy ani dlaczego.

## Kiedy przestać poprawiać model?
Gdy poprawa przestaje mieć znaczenie dla zastosowania albo gdy błędy
przestają być błędami modelu, a stają się błędami etykiet. Analiza błędów
na konkretnych przykładach mówi więcej niż kolejna dziesiąta część procenta
na metryce.
