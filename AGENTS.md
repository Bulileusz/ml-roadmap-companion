# ml-roadmap-companion

## Przegląd
Aplikacja ma służyć użytkownikowi do codziennej, przyjemnej nauki Machine Learningu (przebranżowienie z budownictwa).

## Komendy
- Setup: `uv sync`
- Uruchomienie: `uv run python main.py`
- Testy: `uv run pytest`
- Lint/format: `uv run ruff check --fix . && uv run ruff format .`

## Styl kodu
- Python, zależności przez uv (nie pip/poetry/conda).
- Formatowanie i lint: ruff. Nie proponuj Blacka ani isort.
- Type hints w nowym kodzie.

## Commity i PR
- Conventional Commits, podpisywane (SSH). Nie commituj bezpośrednio do main.

## Bezpieczeństwo
- Sekrety w .env (gitignored), nigdy w repo.
