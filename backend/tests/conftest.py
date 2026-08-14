import pytest

from db.connection import get_connection
from db.schema import init_db


@pytest.fixture
def conn(tmp_path):
    # Prawdziwy plik zamiast :memory: - testy przechodzą przez te same
    # PRAGMA (WAL, foreign_keys, busy_timeout) co aplikacja.
    connection = get_connection(tmp_path / "test.db")
    init_db(connection)
    yield connection
    connection.close()
