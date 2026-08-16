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

# Zadania roadmapy NIE są tutaj - wchodzą z content/tasks/ przez services/content.
# Trzymanie ich w seedzie znaczyło, że wjeżdżają wyłącznie na pustą bazę: zmiana
# roadmapy na bazie, której się używa, wymagała ręcznego grzebania w SQL. Fazy
# zostają, bo to szkielet, do którego przypina się cała reszta treści - i bez
# którego import nie ma dokąd wkładać ani fiszek, ani zadań.


def seed_if_empty(conn: sqlite3.Connection) -> None:
    count = conn.execute("SELECT COUNT(*) FROM phases").fetchone()[0]
    if count > 0:
        return

    for code, name, order_index in SEED_PHASES:
        conn.execute(
            "INSERT INTO phases (code, name, order_index) VALUES (?, ?, ?)",
            (code, name, order_index),
        )

    conn.commit()
