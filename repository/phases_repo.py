import sqlite3


def list_all(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute("SELECT * FROM phases ORDER BY order_index").fetchall()
