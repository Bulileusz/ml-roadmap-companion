# Faza 2 — Klasyczne ML od zera

## Jak działa KNN?
Brak fazy uczenia — model zapamiętuje zbiór treningowy. Przy predykcji
szuka `k` najbliższych obserwacji według wybranej metryki i głosuje
(klasyfikacja) albo uśrednia (regresja). Kosztowny przy predykcji, nie przy
treningu.

## Co robi parametr `k` w KNN?
Małe `k` → granica decyzyjna poszarpana, model łapie szum (overfitting).
Duże `k` → granica gładka, model uśrednia zbyt szeroko i gubi strukturę
(underfitting). `k` = liczba obserwacji to zawsze klasa większościowa.

## Dlaczego KNN wymaga skalowania cech?
Bo liczy odległości. Cecha w zakresie 0–100 000 zdominuje cechę w zakresie
0–1, choćby ta druga była ważniejsza. Standaryzacja albo normalizacja jest
tu obowiązkowa, inaczej metryka mierzy głównie jednostki.

## Co minimalizuje regresja liniowa?
Sumę kwadratów reszt (RSS), czyli kwadratów różnic między wartością
prawdziwą a przewidzianą. Kwadrat mocno karze duże błędy, przez co metoda
jest wrażliwa na obserwacje odstające.

## Jak czytać R²?
Ułamek wariancji zmiennej objaśnianej wyjaśniony przez model. 1 — dopasowanie
idealne, 0 — model nie jest lepszy od przewidywania średniej, **wartości
ujemne są możliwe** na zbiorze testowym. Rośnie po dodaniu każdej kolejnej
cechy, więc do porównywania modeli lepszy jest R² skorygowany.

## RMSE a MAE — kiedy co?
Oba są w jednostkach zmiennej objaśnianej. RMSE podnosi błędy do kwadratu,
więc **mocniej karze duże pomyłki** — wybierz, gdy pojedynczy duży błąd jest
kosztowny. MAE traktuje wszystkie błędy proporcjonalnie i jest odporniejsza
na obserwacje odstające.

## Co właściwie zwraca regresja logistyczna?
Prawdopodobieństwo przynależności do klasy: kombinacja liniowa cech
przepuszczona przez sigmoidę, co ściska wynik do przedziału (0, 1). Klasa
powstaje dopiero po przyłożeniu progu — domyślnie 0,5, ale próg to decyzja
biznesowa, nie stała.

## Macierz pomyłek — cztery pola
**TP** — poprawnie wskazana klasa pozytywna. **TN** — poprawnie odrzucona.
**FP** (błąd I rodzaju) — fałszywy alarm. **FN** (błąd II rodzaju) —
przeoczenie. Wszystkie metryki klasyfikacji to kombinacje tych czterech liczb.

## Precision — definicja i pytanie, na które odpowiada
`TP / (TP + FP)`. "Spośród tych, które wskazałem jako pozytywne, ile
naprawdę takie było?" Ważna, gdy fałszywy alarm jest kosztowny — np. filtr
spamu wyrzucający ważny mail.

## Recall — definicja i pytanie, na które odpowiada
`TP / (TP + FN)`. "Spośród wszystkich naprawdę pozytywnych, ile
wychwyciłem?" Ważny, gdy przeoczenie jest kosztowne — np. badanie
przesiewowe pomijające chorego.

## Czym jest F1?
Średnia harmoniczna precision i recall: `2PR / (P + R)`. Średnia
harmoniczna, a nie arytmetyczna, bo **karze skrajną nierównowagę** — model
z precision 1,0 i recall 0,0 dostaje F1 równe 0, a nie 0,5.

## Co mierzy ROC AUC?
Pole pod krzywą TPR względem FPR dla wszystkich progów. Interpretacja:
prawdopodobieństwo, że losowa obserwacja pozytywna dostanie wyższy wynik
niż losowa negatywna. 0,5 — losowanie, 1,0 — separacja idealna. Nie zależy
od wyboru progu.

## Kiedy accuracy wprowadza w błąd?
Przy niezbalansowanych klasach. Jeśli 99% obserwacji jest negatywnych,
model odpowiadający zawsze "negatywna" ma 99% accuracy i zerową wartość.
Wtedy patrz na precision, recall, F1 albo AUC.

## Czym jest granica decyzyjna?
Powierzchnia w przestrzeni cech, na której model zmienia predykcję.
Regresja logistyczna i liniowy SVM dają hiperpłaszczyznę, drzewo — schodki
równoległe do osi, KNN — nieregularną mozaikę. Rysowanie jej to najszybszy
sposób zobaczenia, czym te modele się różnią.

## Po co dzielić dane na treningowe i testowe?
Bo błąd na danych, których model nie widział, jest jedyną uczciwą oceną.
Model zawsze wypada lepiej na zbiorze, na którym się uczył — to nie
oszustwo, tylko definicja uczenia.

## Jak działa walidacja krzyżowa k-fold?
Dane dzielone na `k` części; model uczony `k` razy, za każdym razem na
`k−1` częściach, oceniany na pozostałej. Wynik to średnia z `k` ocen.
Zaleta: każda obserwacja raz służy do walidacji, więc ocena mniej zależy od
szczęśliwego podziału.

## Overfitting a underfitting
**Overfitting** — model nauczył się szumu: niski błąd treningowy, wysoki
testowy. **Underfitting** — model za prosty na problem: błąd wysoki
w obu przypadkach. Rozstrzyga porównanie tych dwóch błędów, nie sama
wartość jednego z nich.

## Kompromis obciążenie–wariancja
**Obciążenie** to błąd z upraszczających założeń (model za sztywny).
**Wariancja** to wrażliwość na konkretną próbkę treningową (model za
elastyczny). Komplikowanie modelu zwykle zmniejsza obciążenie i zwiększa
wariancję — szukamy minimum sumy.

## Czym jest wyciek danych (data leakage)?
Sytuacja, gdy do treningu trafia informacja niedostępna w momencie
predykcji — np. skalowanie policzone na całym zbiorze przed podziałem albo
cecha wyliczona z przyszłości. Objaw: podejrzanie dobre wyniki walidacyjne
i katastrofa na produkcji.
