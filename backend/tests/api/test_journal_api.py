from repository import activity_repo
from services import clock


def test_empty_journal(client, seeded):
    assert client.get("/api/journal/activity").json() == []
    assert client.get("/api/journal/streak").json() == {
        "current": 0,
        "longest": 0,
        "active_days": 0,
    }


def test_activity_feed_is_newest_first(client, db, seeded):
    db.execute(
        "INSERT INTO activity_log (occurred_at, kind, ref_id, detail) VALUES "
        "('2026-03-10 08:00:00', 'task_done', 1, 'Stare'), "
        "('2026-03-14 09:00:00', 'card_review', 2, 'Nowsze')"
    )
    db.commit()

    entries = client.get("/api/journal/activity").json()

    assert [e["detail"] for e in entries] == ["Nowsze", "Stare"]


def test_activity_feed_respects_the_limit(client, db, seeded):
    for index in range(5):
        activity_repo.log(db, activity_repo.KIND_TASK_DONE, index, f"Wpis {index}")

    assert len(client.get("/api/journal/activity", params={"limit": 3}).json()) == 3


def test_absurd_limit_is_rejected_instead_of_dumping_the_whole_log(client, seeded):
    assert client.get("/api/journal/activity", params={"limit": 0}).status_code == 422
    assert (
        client.get("/api/journal/activity", params={"limit": 99999}).status_code == 422
    )


def test_heatmap_covers_full_weeks_and_ends_today(client, seeded):
    days = client.get("/api/journal/heatmap", params={"weeks": 4}).json()

    assert len(days) == 28
    assert days[-1]["day"] == clock.today().isoformat()
    # Dni bez ruchu też są w siatce - kalendarz musi je pokazać, choć w dzienniku
    # nie istnieją.
    assert all(day["count"] == 0 for day in days)


def test_heatmap_counts_events_per_day(client, db, seeded):
    today = clock.today().isoformat()
    db.execute(
        "INSERT INTO activity_log (occurred_at, kind, ref_id, detail) VALUES "
        f"('{today} 08:00:00', 'card_review', 1, ''), "
        f"('{today} 08:05:00', 'card_review', 2, '')"
    )
    db.commit()

    days = client.get("/api/journal/heatmap", params={"weeks": 1}).json()

    assert days[-1] == {"day": today, "count": 2}


def test_streak_counts_yesterday_as_alive(client, db, seeded):
    from datetime import timedelta

    yesterday = (clock.today() - timedelta(days=1)).isoformat()
    db.execute(
        "INSERT INTO activity_log (occurred_at, kind, ref_id, detail) "
        f"VALUES ('{yesterday} 20:00:00', 'task_done', 1, '')"
    )
    db.commit()

    # Inaczej seria ginęłaby o północy, zanim dzisiejszy dzień nauki się zacznie.
    assert client.get("/api/journal/streak").json()["current"] == 1
