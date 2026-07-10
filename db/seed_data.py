import sqlite3

# (code, name, order_index)
SEED_PHASES = [
    ("0", "Faza 0 - Python odświeżenie", 0),
    ("1", "Faza 1 - Matematyka stosowana", 1),
    ("2", "Faza 2 - Klasyczne ML od zera", 2),
    ("2b", "Faza 2b - Ensemble methods", 3),
    ("3", "Faza 3 - PyTorch, pierwsza sieć", 4),
    ("4", "Faza 4 - Projekt domenowy", 5),
]

# code -> lista tytułów tasków, w kolejności
SEED_TASKS = {
    "0": [
        "NumPy: operacje wektorowe, broadcasting, indeksowanie",
        "Pandas: wczytywanie, czyszczenie, filtrowanie, groupby, łączenie danych",
        "Matplotlib/Seaborn: podstawowe wykresy (histogram, scatter, boxplot)",
        "Test końcowy: EDA na nowym, nieznanym wcześniej datasecie bez podglądania dokumentacji",
    ],
    "1": [
        "Algebra liniowa: wektory, macierze, iloczyn skalarny, intuicja geometryczna",
        "Statystyka: rozkłady, wartość oczekiwana, wariancja, korelacja vs przyczynowość",
        "Pochodne / gradient - intuicja pod backpropagation",
    ],
    "2": [
        "KNN (sklearn) - rola parametru k",
        "Regresja liniowa - interpretacja R², RMSE",
        "Regresja logistyczna - accuracy, precision, recall, F1, ROC AUC",
        "Granice decyzyjne - porównanie KNN/LogReg/Drzewo/SVM na jednym zbiorze",
        "Train/test split, walidacja krzyżowa, over/underfitting",
        "Porównanie własnych wniosków z notatkami z października 2025",
    ],
    "2b": [
        "Random Forest",
        "XGBoost / Gradient Boosting",
        "Feature engineering na danych tabelarycznych",
        "GridSearchCV/RandomizedSearchCV - tuning hiperparametrów",
        "Porównanie wyników z baseline z Fazy 2",
    ],
    "3": [
        "Tensor, autograd - podstawy",
        "Ręczna pętla treningowa (forward, loss, backward, optimizer step)",
        "Prosty MLP na tym samym problemie co w Fazie 2/2b",
        "Porównanie: model liniowy vs ensemble vs MLP",
    ],
    "4": [
        "Wybór kierunku (Computer Vision / time series / NLP)",
        "Znalezienie i przygotowanie datasetu domenowego (np. wady betonu na zdjęciach)",
        "Pierwszy model bazowy",
        "Iteracja i dokumentacja wniosków",
    ],
}


def seed_if_empty(conn: sqlite3.Connection) -> None:
    count = conn.execute("SELECT COUNT(*) FROM phases").fetchone()[0]
    if count > 0:
        return

    for code, name, order_index in SEED_PHASES:
        conn.execute(
            "INSERT INTO phases (code, name, order_index) VALUES (?, ?, ?)",
            (code, name, order_index),
        )

    phase_ids = {
        row["code"]: row["id"]
        for row in conn.execute("SELECT id, code FROM phases").fetchall()
    }

    for code, titles in SEED_TASKS.items():
        phase_id = phase_ids[code]
        for order_index, title in enumerate(titles):
            conn.execute(
                "INSERT INTO tasks (phase_id, title, order_index) VALUES (?, ?, ?)",
                (phase_id, title, order_index),
            )

    conn.commit()
