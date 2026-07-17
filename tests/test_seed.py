from db.seed_data import SEED_PHASES, SEED_TASKS, seed_if_empty


def _counts(conn):
    phases = conn.execute("SELECT COUNT(*) FROM phases").fetchone()[0]
    tasks = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
    return phases, tasks


def test_seed_populates_phases_and_tasks(conn):
    seed_if_empty(conn)

    phases, tasks = _counts(conn)
    assert phases == len(SEED_PHASES)
    assert tasks == sum(len(titles) for titles in SEED_TASKS.values())


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
