import sqlite3


def summarize_attempts(attempts: list[sqlite3.Row]) -> dict:
    total = len(attempts)
    independent = sum(1 for a in attempts if a["solved_independently"])
    pct = 0.0 if total == 0 else independent / total * 100
    return {"total": total, "independent": independent, "pct": pct}
