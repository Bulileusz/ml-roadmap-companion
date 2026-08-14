# ml-roadmap-companion

## Przegląd
Aplikacja do codziennej, przyjemnej nauki Machine Learningu (przebranżowienie z budownictwa). Obecnie: Streamlit. **W trakcie migracji** do: backend FastAPI (Python) + frontend React 18 + Vite + Tailwind CSS + Framer Motion + Lucide Icons + Canvas-Confetti. Struktura repo (monorepo `backend/`+`frontend/` czy osobne repo) — do ustalenia na starcie migracji.

## Komendy (stan obecny — Streamlit)
- Setup: `pip install -r requirements-dev.txt` (NIE `uv` — projekt celowo bez pyproject.toml, patrz ruff.toml)
- Uruchomienie: `streamlit run app.py --server.headless true`
- Testy: `pytest` (testpaths: `tests/`)
- Lint/format: `ruff check . && ruff format .` (reguły: E, F, I, UP, B; line-length 88 — patrz ruff.toml)

## Komendy (docelowo — po migracji, uzupełnić gdy powstaną)
- Backend: `uvicorn` (FastAPI) — komenda startowa do dodania po scaffoldzie
- Frontend: `npm run dev` / `npm run build` / `npm run lint` (Vite) — do dodania po `npm create vite@latest`

## Styl kodu
- Python: zależności przez pip + `requirements.txt`/`requirements-dev.txt` (NIE uv/poetry/conda — świadoma decyzja projektu).
- Formatowanie i lint: ruff wg `ruff.toml`. Nie proponuj Blacka ani isort.
- Type hints mile widziane w nowym kodzie.
- Frontend (docelowo): React 18 + TypeScript, Tailwind do stylów (nie CSS modules/styled-components), Framer Motion do animacji, Lucide do ikon.

## Testy
- pytest; nowy kod wymaga testów. Uruchom `pytest` przed commitem.

## Commity i PR
- Conventional Commits, podpisywane (SSH). Nie commituj bezpośrednio do main.

## Bezpieczeństwo
- Sekrety w `.env` (gitignored) i `.streamlit/secrets.toml` (gitignored), nigdy w repo.
