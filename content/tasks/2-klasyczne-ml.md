# Faza 2 — Klasyczne ML od zera

## Przepisz laboratorium KNN z ISLP linijka po linijce
Dorzuć `scikit-learn` do `requirements.txt`, zainstaluj przez `uv pip install -r` i przepisz **ręcznie** (bez kopiuj-wklej) lab klasyfikacyjny z rozdziału 4 ISLP w części z `KNeighborsClassifier` do skryptu `01_knn_lab.py`. Po każdym kroku dopisz `print()` z kształtem tablic i wynikiem `score`, a znaczenie `fit`, `predict` i pojęcia estimator sprawdź w „scikit-learn: User Guide — uczenie nadzorowane".
Gotowe, gdy skrypt przechodzi od wczytania danych do wypisania accuracy na zbiorze testowym bez błędu i drukuje kształty wszystkich czterech tablic powstałych z podziału.

## Pokręć parametrem k i znajdź, gdzie KNN przestaje działać
Weź skrypt z poprzedniego zadania, opakuj samo trenowanie pętlą po `k` od 1 do 50 i zbieraj accuracy osobno na treningu i na teście, a potem narysuj obie krzywe na jednym wykresie. Zanim uruchomisz, zapisz w komentarzu, jakiej wartości accuracy treningowej spodziewasz się dla `k=1`; intuicję dobierz z odcinka o KNN z playlisty „StatQuest — uczenie maszynowe".
Gotowe, gdy wykres pokazuje accuracy treningową równą 1.0 dla `k=1` i obie krzywe zbiegające się przy dużym `k`, a skrypt wypisuje `k` o najlepszym wyniku testowym.

## Uruchom cudze porównanie klasyfikatorów i podmień w nim dane
Skopiuj kod z „scikit-learn: porównanie klasyfikatorów na jednym zbiorze", uruchom go lokalnie i zapisz wynikowy PNG bez żadnych zmian. Potem zredukuj listę klasyfikatorów do czterech (KNN, regresja logistyczna, drzewo, SVM) i podmień wbudowane zbiory na własne wywołania `make_moons` i `make_circles` z wyraźnie większym szumem.
Gotowe, gdy masz na dysku dwa pliki PNG — oryginalny i własny — a w komentarzu na górze skryptu zapisane, którego modelu granica najmocniej zmieniła kształt po zwiększeniu szumu.

## Sprawdź, ile twój wynik zależy od losowego podziału
Na jednym zbiorze (np. `penguins` po usunięciu braków) policz accuracy KNN dla trzydziestu różnych wartości `random_state` w `train_test_split`, zbierz wyniki do tablicy i narysuj histogram. Powtórz cały eksperyment z `stratify=y` i porównaj rozrzut obu serii oraz udziały klas w podzbiorach.
Gotowe, gdy skrypt wypisuje rozstęp accuracy między najgorszym a najlepszym podziałem dla obu wariantów oraz tabelkę udziałów klas w train i test.

## Zastąp pojedynczy podział walidacją krzyżową
Przeczytaj „scikit-learn: walidacja krzyżowa" i policz dla tego samego modelu `cross_val_score` w czterech konfiguracjach: `KFold(shuffle=True)` i `StratifiedKFold`, każdy dla 5 i 10 foldów. Zestaw średnie i odchylenia z rozrzutem trzydziestu pojedynczych podziałów z poprzedniego zadania.
Gotowe, gdy skrypt drukuje tabelkę strategia × liczba foldów × średnia × odchylenie, a Ty własnymi słowami, bez zaglądania, tłumaczysz, dlaczego odchylenie z CV jest mniejsze niż rozstęp z zadania poprzedniego.

## Włóż skalowanie do Pipeline i złap leakage na gorącym uczynku
Na zbiorze z cechami w różnych jednostkach policz accuracy KNN trzy razy: bez skalowania, ze `StandardScaler` dopasowanym na całych danych **przed** podziałem, oraz ze skalerem wewnątrz `Pipeline` ocenianym przez `cross_val_score`. Konstrukcję pipeline'u i to, dlaczego kolejność ma znaczenie, masz w „scikit-learn: Pipeline".
Gotowe, gdy skrypt wypisuje trzy liczby, różnica między wariantem nieskalowanym a skalowanym przekracza kilka punktów procentowych, a Ty umiesz wskazać w kodzie dokładną linijkę, w której dane testowe wpłynęły na scaler.

## SKŁADAJĄCE — dobierz k uczciwie i zweryfikuj go na danych, których model nie widział
Odłóż 20% danych jako hold-out, a na reszcie uruchom `GridSearchCV` przeszukujący pipeline ze skalerem po `n_neighbors`, `weights` i `p`. Dopiero na samym końcu policz metryki na odłożonym zbiorze i zestaw je z `best_score_` z gridu.
Gotowe, gdy skrypt wypisuje najlepsze hiperparametry, `best_score_`, wynik na hold-oucie i różnicę między nimi, a hold-out jest dotykany dokładnie raz w całym pliku.

## Dopasuj regresję liniową i policz R², RMSE i MAE ze wzoru
Na `pomiary.csv` z fazy 0 dopasuj `LinearRegression` i sprawdź, że współczynniki zgadzają się z rozwiązaniem równań normalnych z fazy 1. Policz R², RMSE i MAE własnymi funkcjami w NumPy i zweryfikuj je funkcjami z „scikit-learn: metryki i ocena modeli", a potem wstaw do danych jeden gruby outlier i zobacz, która metryka skacze mocniej; teoria jest w rozdziale 3 ISLP.
Gotowe, gdy własne metryki zgadzają się z sklearn do 1e-10, a skrypt wypisuje wszystkie trzy przed i po wstawieniu outliera wraz z procentową zmianą każdej.

## Narysuj krzywą złożoności i pokaż, jak R² potrafi kłamać
Zbuduj pipeline `PolynomialFeatures(degree) → LinearRegression` i przejedź `degree` od 1 do 15 na jednowymiarowych danych z szumem (np. `sin(x)`), zapisując RMSE treningowe i RMSE z walidacji krzyżowej. Osobno dołóż do zbioru pięć kolumn czystego szumu, jedna po drugiej, i porównaj R² na treningu z R² na teście; pojęcia `overfitting`, `underfitting` i `generalization` sprawdź w „Google Machine Learning Glossary".
Gotowe, gdy wykres pokazuje RMSE treningowe malejące monotonicznie i RMSE walidacyjne z wyraźnym minimum, a skrypt drukuje dwie serie R² rosnące i nierosnące wraz z liczbą losowych kolumn.

## Uspokój przeuczony model regularyzacją
Weź wielomian stopnia 12 z poprzedniego zadania i dopasuj do niego `Ridge` oraz `Lasso` dla `alpha` z `np.logspace(-4, 4, 20)`, rysując ścieżkę współczynników i RMSE walidacyjne w funkcji alfy. Policz, ile współczynników Lasso zeruje przy trzech różnych alfach, i porównaj alfę wybraną ręcznie z tą z `RidgeCV`; teoria w rozdziale 6 ISLP.
Gotowe, gdy wykres ścieżki pokazuje współczynniki dociskane do zera wraz ze wzrostem alfy, a skrypt wypisuje alfę minimalizującą RMSE walidacyjne oraz liczbę niezerowych współczynników Lasso dla każdej z trzech alf.

## SKŁADAJĄCE — zbuduj kompletny model regresyjny na pomiarach betonu
Na `pomiary.csv` albo własnych danych z pracy przejdź całą ścieżkę w jednym skrypcie: hold-out, pipeline ze skalerem i opcjonalnym `PolynomialFeatures`, `GridSearchCV` po stopniu i alfie, ocena RMSE/MAE/R² na hold-oucie oraz wykres reszt względem wartości przewidywanej. Na koniec narysuj `learning_curve` z „scikit-learn: walidacja krzyżowa" dla wybranego modelu.
Gotowe, gdy skrypt wypisuje wybrane hiperparametry i trzy metryki z hold-outu, a Ty na podstawie krzywej uczenia odpowiadasz w komentarzu jednym zdaniem, czy modelowi bardziej pomogłoby więcej danych, czy większa złożoność.

## Wytrenuj regresję logistyczną i wyciągnij z niej prawdopodobieństwa
Na dwuwymiarowym zbiorze dopasuj `LogisticRegression`, narysuj `predict_proba` jako mapę tła z naniesioną granicą 0.5 i sprawdź, że `predict` to dokładnie `predict_proba > 0.5`. Policz prawdopodobieństwa ręcznie jako sigmoidę z `X @ coef_.T + intercept_` i porównaj je z wynikiem biblioteki; intuicję zbierz z odcinków o regresji logistycznej z playlisty „StatQuest" i rozdziału 4 ISLP.
Gotowe, gdy własna sigmoida różni się od `predict_proba` o mniej niż 1e-10, a na wykresie granica przebiega dokładnie tam, gdzie tło ma wartość 0.5.

## Policz cztery metryki ze wzoru na zbiorze o nierównych klasach
Wygeneruj `make_classification` z `weights=[0.95, 0.05]`, wytrenuj klasyfikator i policz TP, FP, TN, FN własnym kodem, a z nich accuracy, precision, recall i F1. Zweryfikuj wszystko przez `confusion_matrix` i `classification_report` z „scikit-learn: metryki i ocena modeli" i dorzuć baseline `DummyClassifier(strategy='most_frequent')`.
Gotowe, gdy twoje cztery liczby zgadzają się z sklearn do 1e-12, a skrypt wypisuje accuracy dummy'ego powyżej 0.9 przy jego recall równym zero.

## Przesuń próg decyzyjny i narysuj ROC oraz precision-recall
Na modelu z poprzedniego zadania przejedź progiem od 0 do 1 co 0.01, licząc dla każdego precision, recall, TPR i FPR własnym kodem, i porównaj swoje punkty z `roc_curve`, `precision_recall_curve` oraz `roc_auc_score`. Wybierz próg pod scenariusz „przeoczona wada betonu kosztuje dziesięć razy więcej niż fałszywy alarm", implementując funkcję kosztu i minimalizując ją po progu.
Gotowe, gdy twoja ręczna krzywa ROC pokrywa się z biblioteczną, skrypt wypisuje AUC i próg minimalizujący koszt, a macierz pomyłek dla tego progu ma mniej FN niż macierz dla progu 0.5.

## Porównaj kształty granic drzewa i SVM oraz ich hiperparametry
Na jednym zbiorze 2D narysuj przez `DecisionBoundaryDisplay` granice `DecisionTreeClassifier` dla `max_depth` 1, 3, 10 i `None` oraz `SVC(kernel='rbf')` dla trzech kombinacji `C` i `gamma`. Do drzewa dorysuj `plot_tree` przy `max_depth=3` i odszukaj na rysunku granicy próg, który odczytałeś z węzła; skąd biorą się oba kształty, tłumaczą rozdziały 8 i 9 ISLP.
Gotowe, gdy granice drzewa są prostokątne i coraz bardziej postrzępione z głębokością, granica SVM zmienia gładkość wraz z `gamma`, a skrypt wypisuje accuracy treningowe i walidacyjne dla każdego z siedmiu wariantów.

## SKŁADAJĄCE — zestaw cztery modele na jednym zbiorze i rozstrzygnij, który wygrywa
Na jednym prawdziwym zbiorze (`titanic`, `penguins` albo dane z pracy) zbuduj cztery pipeline'y — KNN, regresja logistyczna, drzewo, SVM — ze skalerem tam, gdzie jest potrzebny, i oceń każdy tą samą `StratifiedKFold` po accuracy, F1 i ROC AUC przez `cross_validate`. Dorysuj wykres pudełkowy rozrzutu foldów i macierze pomyłek najlepszego oraz najgorszego modelu.
Gotowe, gdy skrypt drukuje tabelę cztery modele × trzy metryki × odchylenie, a Ty w komentarzu wskazujesz zwycięzcę i piszesz, czy jego przewaga przekracza odchylenie między foldami.

## Zweryfikuj notatki z października 2025 eksperymentem, nie pamięcią
Wypisz ze swoich notatek osiem konkretnych tez o ML (np. „KNN wymaga skalowania", „wysokie R² oznacza dobry model", „accuracy wystarczy do oceny klasyfikatora") i dla każdej napisz w jednym notebooku najkrótszy możliwy eksperyment potwierdzający ją albo obalający, korzystając ze skryptów z tej fazy. Terminy, co do których notatki i dokumentacja mówią co innego, rozstrzygnij przez „Google Machine Learning Glossary".
Gotowe, gdy notebook ma osiem komórek, a każda kończy się wydrukiem `POTWIERDZONE` albo `OBALONE` wraz z liczbą, która o tym rozstrzyga.

## Test końcowy — przeprowadź własne zadanie klasyfikacyjne bez zaglądania do rozwiązań
Weź zbiór, którego nie używałeś w tej fazie — CSV z pracy albo wbudowany zbiór sklearn/seaborn — i w jednym notebooku przejdź od surowego pliku do wybranego modelu: krótkie EDA, hold-out, porównanie co najmniej trzech rodzin modeli przez walidację krzyżową, strojenie zwycięzcy przez `GridSearchCV` i ocena na hold-oucie macierzą pomyłek oraz krzywą ROC. Dokumentacja i notatki zamknięte: dozwolone tylko `?`, `help()` i uzupełnianie w notebooku.
Gotowe, gdy notebook wykonuje się w całości po `Restart & Run All`, hold-out jest użyty dokładnie raz, a na końcu stoi komórka Markdown z pięcioma wnioskami, w tym jednym o tym, czego model wciąż nie potrafi.
