from repository import tasks_repo
from services import progress
from services.progress import phase_progress_pct


def test_pct_zero_total_is_zero():
    assert phase_progress_pct(0, 0) == 0.0


def test_pct_basic():
    assert phase_progress_pct(1, 2) == 50.0


def test_pct_floor_boundary():
    # 199/200 = 99.5% - wyświetlane jako int(pct) musi dać 99, nie 100.
    pct = phase_progress_pct(199, 200)
    assert pct == 99.5
    assert int(pct) == 99


def test_get_all_phase_progress_and_overall(conn):
    cursor = conn.execute("INSERT INTO phases (code, name) VALUES ('0', 'Faza 0')")
    conn.commit()
    phase_id = cursor.lastrowid
    done_task = tasks_repo.create(conn, phase_id, "Zrobione")
    tasks_repo.create(conn, phase_id, "Niezrobione")
    tasks_repo.set_done(conn, done_task, True)

    per_phase = progress.get_all_phase_progress(conn)
    overall = progress.get_overall_progress(conn)

    assert len(per_phase) == 1
    assert per_phase[0]["done"] == 1
    assert per_phase[0]["total"] == 2
    assert per_phase[0]["pct"] == 50.0
    assert overall == {"done": 1, "total": 2, "pct": 50.0}
