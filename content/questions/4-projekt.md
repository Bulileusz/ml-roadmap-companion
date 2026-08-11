# Faza 4 — pytania sprawdzające

## Masz zdjęcia wad betonu, po kilka ujęć tego samego elementu. Dlaczego losowy podział na train/test zawyży wynik i jak podzielisz dane poprawnie?

Losowy podział rozrzuci ujęcia **tego samego elementu** po obu stronach. Model
zobaczy w treningu tę samą rysę pod nieco innym kątem, a potem „rozpozna" ją
w teście — ale rozpoznał konkretny element, nie nauczył się wykrywać wad.
Test przestaje mierzyć generalizację i pokazuje wynik znacznie zawyżony wobec
tego, co dostaniesz na nowej budowie.

Poprawnie: podział **po grupach**, gdzie grupą jest element (albo obiekt, albo
sesja zdjęciowa). Wszystkie ujęcia jednego elementu trafiają w całości do
treningu albo w całości do testu.

```python
from sklearn.model_selection import GroupShuffleSplit, GroupKFold
splitter = GroupShuffleSplit(test_size=0.25, random_state=0)
train_idx, test_idx = next(splitter.split(X, y, groups=id_elementu))
```

Ta sama zasada dotyczy walidacji krzyżowej — `GroupKFold`, nie `KFold`. Jeśli
dane zbierano w czasie, dochodzi drugi wymiar: podział po dacie, żeby model nie
uczył się z przyszłości.

## Masz 400 zdjęć. Uzasadnij, dlaczego trenowanie sieci od zera jest tu złym pomysłem, i opisz alternatywę.

Sieć konwolucyjna ma miliony parametrów. Przy 400 obrazach masz o kilka rzędów
wielkości za mało danych, żeby je sensownie wyznaczyć — model zapamięta zbiór
treningowy i nie nauczy się niczego przenośnego. Wczesne warstwy musiałyby
odkryć od zera detektory krawędzi i tekstur, na co potrzeba dziesiątek tysięcy
obrazów.

Alternatywa: **transfer learning**. Bierzesz sieć wytrenowaną na dużym zbiorze
(np. ImageNet), gdzie te uniwersalne detektory już powstały, i wykorzystujesz je
jako ekstraktor cech.

Dwa warianty, w tej kolejności:
1. **Zamroź trzon, doucz samą głowicę.** Najbezpieczniejsze przy 400 obrazach —
   uczysz kilkuset–kilku tysięcy parametrów zamiast milionów.
2. **Fine-tuning z małym `lr`.** Odmrażasz kilka ostatnich bloków i douczasz je
   współczynnikiem uczenia rzędu 10× mniejszym niż dla głowicy. Sięgaj po to,
   gdy twoja domena mocno odbiega od ImageNetu — a beton odbiega.

Do tego augmentacja i walidacja krzyżowa po grupach, bo przy 400 zdjęciach
pojedynczy test jest za mały, żeby cokolwiek stwierdzić.

## Jakie przekształcenia augmentacyjne mają sens dla zdjęć wad betonu, a które zmieniłyby etykietę albo wprowadziły model w błąd?

**Mają sens** — rysa pozostaje rysą niezależnie od tego, jak trzymałeś telefon:
obrót o dowolny kąt, odbicie poziome i pionowe, losowe przycięcie, zmiana
jasności i kontrastu (inne oświetlenie na budowie), lekkie rozmycie
i szum (gorszy aparat), niewielkie zmiany perspektywy.

**Wprowadzają w błąd** — wszystko, co zmienia *cechę diagnostyczną*: silna
zmiana nasycenia i barwy (wykwity, zawilgocenie i korozja zbrojenia rozpoznaje
się po kolorze), agresywne wyostrzanie (potrafi dorobić rysy tam, gdzie ich nie
ma, albo zatrzeć włoskowate), mocne skalowanie bez zachowania odniesienia (**szerokość
rozwarcia rysy jest kryterium oceny** — powiększone zdjęcie sugeruje groźniejszą
wadę), wycinanie fragmentów mogące usunąć jedyną wadę z kadru przy zachowaniu
etykiety „wada".

Reguła: augmentacja jest ważna wtedy i tylko wtedy, gdy **etykieta przetrwa
przekształcenie**. Dla obrotu cyfry „6" nie przetrwa, dla rysy w betonie
przetrwa — a dla skali przetrwa klasa, ale nie ocena istotności.

## Klient mówi "chcemy wysokiej skuteczności". Jakie trzy pytania musisz zadać, żeby przełożyć to na konkretną metrykę?

**Co kosztuje więcej: przeoczenie czy fałszywy alarm — i ile razy?** To
rozstrzyga między recall a precision i pozwala ustawić próg. „Przeoczona rysa
to potencjalna awaria, fałszywy alarm to godzina inspektora" daje zupełnie inny
model niż odpowiedź odwrotna.

**Jak częsty jest przypadek pozytywny?** Przy 2% wad accuracy jest bezużyteczna
i trzeba mierzyć PR AUC albo recall przy zadanej precision. Bez tej liczby nie
wiadomo nawet, czy 95% to sukces, czy porażka.

**Kto i jak użyje wyniku?** Model podejmujący decyzję automatycznie potrzebuje
innej metryki niż model, który tylko ustawia kolejkę do przejrzenia przez
człowieka. W tym drugim przypadku właściwą miarą jest często „ile wad znajdzie
inspektor sprawdzając 50 najwyżej ocenionych zdjęć" — czyli precision@k, a nie
żadna metryka globalna.

Dopiero mając te trzy odpowiedzi, da się zapisać jedno zdanie: „metryką jest X,
celem jest wartość Y, mierzone na zbiorze Z".

## Model bazowy osiąga 95%. Wymień dwa powody do radości i dwa powody do niepokoju.

**Do radości:** potok danych działa od początku do końca — wczytywanie, podział,
trening, ocena — a to zwykle połowa roboty. Masz też punkt odniesienia, więc
każdy kolejny model będzie oceniany względem czegoś, a nie w próżni.

**Do niepokoju:** po pierwsze, **jaki jest udział klasy większościowej?** Jeśli
95% obserwacji jest negatywnych, twój model prawdopodobnie odpowiada zawsze
„nie" i nie umie nic. Sprawdź macierz pomyłek, zanim się ucieszysz.

Po drugie, **95% dla modelu bazowego jest podejrzanie dobre**. Typowe przyczyny:
wyciek danych (cecha niedostępna w momencie predykcji), zbiór testowy
zanieczyszczony danymi treningowymi (duplikaty, zgrupowane obserwacje), albo
zadanie łatwiejsze, niż sądziłeś. Wszystkie trzy trzeba wykluczyć — najtaniej
przez przejrzenie ważności cech i policzenie duplikatów między zbiorami.

## Po dwudziestu eksperymentach nie pamiętasz, który był najlepszy. Co powinieneś był zapisywać od pierwszego przebiegu?

Minimum, które ratuje sytuację:

- **Wersję danych** — który plik, jaki filtr, ile wierszy po czyszczeniu.
- **Przekształcenia** — skalowanie, kodowanie kategorii, augmentacja.
- **Hiperparametry** — komplet, nie tylko te zmieniane.
- **Ziarno losowości** — bez niego nie odtworzysz nawet własnego wyniku.
- **Metryki treningowe i walidacyjne** — obie, bo sama walidacyjna nie mówi,
  czy model był przeuczony.
- **Sposób podziału** — losowy, po grupach, po czasie; z jakim `random_state`.
- **Jedno zdanie wniosku** — „głębsze drzewo nie pomogło, przeucza się od
  głębokości 8". To ono sprawia, że po miesiącu nie powtarzasz tego samego.

Najprostsza wersja: dopisywanie wiersza do CSV po każdym przebiegu. Nie
potrzebujesz MLflow ani Weights & Biases na starcie — potrzebujesz nawyku.

Dobra heurystyka: **jeśli nie umiesz odtworzyć wyniku sprzed dwóch tygodni,
ten wynik nie istnieje.**

## Kiedy analiza błędów na konkretnych przykładach da ci więcej niż kolejne strojenie hiperparametrów? Po czym poznasz ten moment?

Poznasz po tym, że **kolejne strojenia przestały cokolwiek zmieniać** — różnice
mieszczą się w rozrzucie między foldami — a metryka nadal jest daleko od tego,
czego potrzebuje zastosowanie. To znaczy, że wyczerpałeś to, co da się wycisnąć
z tego modelu na tych danych, i wąskim gardłem są dane, nie parametry.

Drugi sygnał: różne rodziny modeli dają bardzo zbliżone wyniki. Jeśli regresja
logistyczna, las i boosting mylą się mniej więcej tak samo, to nie modele są
problemem, tylko informacja zawarta w cechach.

Co daje analiza błędów: obejrzenie pięćdziesięciu najgorszych przypadków
zwykle ujawnia **strukturę** — wszystkie zdjęcia niedoświetlone, wszystkie
przypadki z jednej linii produkcyjnej, albo, najczęściej, **błędnie oznaczone
etykiety**. Żadne strojenie tego nie naprawi, a poprawienie etykiet albo
dołożenie jednej cechy potrafi dać więcej niż tydzień szukania po siatce.

Reguła kciuka: po drugim strojeniu bez postępu — otwórz dane i popatrz.

## [code] Zbuduj minimalny, kompletny potok: wczytanie danych, podział, baseline, metryka, zapis wyniku. Ma działać od początku do końca jednym uruchomieniem.

```python
"""Minimalny potok: python potok.py -> wynik w eksperymenty.csv"""
import csv, json
from datetime import datetime
from pathlib import Path

from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, classification_report

ZIARNO = 42
KONFIG = {"model": "LogisticRegression", "C": 1.0, "skalowanie": True}

X, y = load_breast_cancer(return_X_y=True)
Xtr, Xte, ytr, yte = train_test_split(
    X, y, test_size=0.25, random_state=ZIARNO, stratify=y
)

# Pipeline, nie osobny scaler: skalowanie dopasowuje się wewnątrz każdego
# foldu walidacji, więc statystyki testu nie przeciekają do treningu.
model = Pipeline([
    ("skaler", StandardScaler()),
    ("model", LogisticRegression(C=KONFIG["C"], max_iter=1000)),
])

walidacja = cross_val_score(model, Xtr, ytr, cv=5, scoring="roc_auc")
model.fit(Xtr, ytr)
auc_test = roc_auc_score(yte, model.predict_proba(Xte)[:, 1])

print(classification_report(yte, model.predict(Xte)))
print(f"walidacja AUC {walidacja.mean():.4f} ±{walidacja.std():.4f} | "
      f"test AUC {auc_test:.4f}")

# Zapis wyniku - jeden wiersz na przebieg, żeby dało się je porównać.
plik = Path("eksperymenty.csv")
nowy = not plik.exists()
with plik.open("a", newline="", encoding="utf-8") as f:
    zapis = csv.writer(f)
    if nowy:
        zapis.writerow(["czas", "ziarno", "konfig", "walidacja_auc",
                        "walidacja_std", "test_auc"])
    zapis.writerow([datetime.now().isoformat(timespec="seconds"), ZIARNO,
                    json.dumps(KONFIG), round(walidacja.mean(), 4),
                    round(walidacja.std(), 4), round(auc_test, 4)])
```

Cztery rzeczy, które ten szkielet wymusza od pierwszego dnia: ustalone ziarno,
`Pipeline` zamiast ręcznego skalowania (czyli brak wycieku), walidacja
z odchyleniem obok pojedynczej liczby, i dopisywanie wyniku do pliku. Kolejny
eksperyment to zmiana `KONFIG` i ponowne uruchomienie — porównanie masz gotowe.
