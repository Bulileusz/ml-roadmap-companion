from api import main
from db.connection import get_connection


def _isolate(monkeypatch, tmp_path):
    """bootstrap() na bazie i katalogu migawek w tmp_path zamiast na prawdziwych.

    Sam lifespan nie ma szwu do wstrzyknięcia ścieżek - i nie powinien mieć,
    bo w produkcji ma czytać dokładnie jedną, znaną bazę. Podstawiamy więc to,
    czego używa: fabrykę połączeń i katalog migawek.
    """
    db_path = tmp_path / "bootstrap.db"
    monkeypatch.setattr(main, "get_connection", lambda: get_connection(db_path))
    monkeypatch.setattr(main, "SNAPSHOT_DIR", tmp_path / "snapshots")
    return db_path


def test_bootstrap_migrates_seeds_and_imports_content(monkeypatch, tmp_path):
    db_path = _isolate(monkeypatch, tmp_path)

    main.bootstrap()

    conn = get_connection(db_path)
    try:
        assert conn.execute("SELECT COUNT(*) FROM phases").fetchone()[0] == 6
        # Zadania wjeżdżają z content/tasks/, nie z seeda - dlatego liczba jest
        # tu warunkiem "cokolwiek wjechało", a nie stałą do przepisywania przy
        # każdym rozpisaniu kolejnej fazy roadmapy.
        assert conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0] > 0
        # content/ z repo wjeżdża przy starcie, więc fiszka dopisana do pliku
        # trafia do bazy bez dodatkowego kliknięcia.
        assert conn.execute("SELECT COUNT(*) FROM flashcards").fetchone()[0] > 0
        assert conn.execute("SELECT COUNT(*) FROM resources").fetchone()[0] > 0
        # A wszystkie czekają na zapoznanie, nie na powtórkę.
        assert (
            conn.execute(
                "SELECT COUNT(*) FROM flashcards WHERE learned_at IS NOT NULL"
            ).fetchone()[0]
            == 0
        )
    finally:
        conn.close()


def test_bootstrap_is_idempotent_across_restarts(monkeypatch, tmp_path):
    db_path = _isolate(monkeypatch, tmp_path)

    main.bootstrap()
    conn = get_connection(db_path)
    after_first = conn.execute("SELECT COUNT(*) FROM flashcards").fetchone()[0]
    conn.close()

    main.bootstrap()

    conn = get_connection(db_path)
    try:
        assert conn.execute("SELECT COUNT(*) FROM flashcards").fetchone()[0] == (
            after_first
        )
        assert conn.execute("SELECT COUNT(*) FROM phases").fetchone()[0] == 6
    finally:
        conn.close()


def test_bootstrap_writes_one_snapshot_per_day(monkeypatch, tmp_path):
    _isolate(monkeypatch, tmp_path)

    main.bootstrap()
    main.bootstrap()

    snapshots = sorted((tmp_path / "snapshots").glob("roadmap-snapshot-*.json"))
    # Trzy restarty w ciągu dnia to nie trzy kopie tego samego stanu.
    assert len(snapshots) == 1
    assert snapshots[0].read_text(encoding="utf-8").startswith("{")


def test_bootstrap_survives_an_unwritable_snapshot_directory(monkeypatch, tmp_path):
    db_path = _isolate(monkeypatch, tmp_path)
    # Plik tam, gdzie ma być katalog - mkdir wywali OSError.
    blocker = tmp_path / "snapshots"
    blocker.write_text("nie katalog", encoding="utf-8")

    main.bootstrap()

    # Brak kopii jest przykry, brak działającej apki gorszy.
    conn = get_connection(db_path)
    try:
        assert conn.execute("SELECT COUNT(*) FROM phases").fetchone()[0] == 6
    finally:
        conn.close()
