from db.seed_data import SEED_PHASES, seed_if_empty


def _counts(conn):
    phases = conn.execute("SELECT COUNT(*) FROM phases").fetchone()[0]
    tasks = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
    return phases, tasks


def test_seed_populates_phases(conn):
    seed_if_empty(conn)

    phases, _ = _counts(conn)
    assert phases == len(SEED_PHASES)


def test_seed_creates_no_tasks(conn):
    """Roadmapa wchodzi z content/tasks/, nie z seeda.

    Wcześniej zadania jechały tędy i przez to wjeżdżały wyłącznie na pustą bazę -
    zmiana roadmapy na bazie, której się używa, wymagała ręcznego SQL-a. Fazy
    zostają, bo są szkieletem, do którego import przypina resztę treści.
    """
    seed_if_empty(conn)

    _, tasks = _counts(conn)
    assert tasks == 0


def test_seed_is_idempotent(conn):
    seed_if_empty(conn)
    before = _counts(conn)

    seed_if_empty(conn)

    assert _counts(conn) == before


def test_seed_skips_nonempty_phases_table(conn):
    conn.execute("INSERT INTO phases (code, name) VALUES ('custom', 'Moja faza')")
    conn.commit()

    seed_if_empty(conn)

    phases, tasks = _counts(conn)
    assert phases == 1
    assert tasks == 0
