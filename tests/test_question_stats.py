from services.question_stats import summarize_attempts


class _Row:
    def __init__(self, solved):
        self._solved = int(solved)

    def __getitem__(self, key):
        assert key == "solved_independently"
        return self._solved


def test_empty_attempts():
    assert summarize_attempts([]) == {"total": 0, "independent": 0, "pct": 0.0}


def test_mixed_attempts():
    attempts = [_Row(True), _Row(False), _Row(True), _Row(True)]

    summary = summarize_attempts(attempts)

    assert summary == {"total": 4, "independent": 3, "pct": 75.0}


def test_floor_boundary():
    attempts = [_Row(True)] * 199 + [_Row(False)]

    summary = summarize_attempts(attempts)

    assert summary["pct"] == 99.5
    assert int(summary["pct"]) == 99
