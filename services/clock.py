from datetime import date, datetime

# Jedyne źródło "teraz"/"dziś" w aplikacji - czas lokalny maszyny.
# Format now_iso() celowo zgodny z SQLite datetime('now')
# ("YYYY-MM-DD HH:MM:SS"), żeby stare wiersze (UTC) i nowe (lokalne)
# pozostały porównywalne/sortowalne jako stringi.


def today() -> date:
    return date.today()


def now_iso() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
