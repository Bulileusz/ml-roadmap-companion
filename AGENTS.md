# ml-roadmap-companion

## Przegląd
Lokalna, jednoosobowa aplikacja do codziennej nauki Machine Learningu (przebranżowienie z budownictwa). Monorepo: `backend/` (FastAPI + surowy sqlite3) i `frontend/` (React 19 + Vite + Tailwind v4). Bez auth, bez publikacji, dane w `data/roadmap.db`. Streamlit został wycofany — powłoka to React, domena (`backend/services/`, `backend/repository/`) przeżyła migrację bez zmian.

## Komendy
Wszystko przez `make` z korzenia repo (`make help` wypisuje listę):
- Setup: `make setup` — `uv venv` + `uv pip install -r backend/requirements-dev.txt` + `npm --prefix frontend install`
- Dev: `make dev` — uvicorn na :8000 i Vite na :5173 (Vite proxuje `/api`, więc nie ma CORS-a)
- Testy: `make test` (pytest + vitest), osobno `make test-backend` / `make test-frontend`
- Lint: `make lint` (ruff check + format --check, tsc, eslint), formatowanie: `make format`
- Produkcyjnie lokalnie: `make run` — build frontu i uvicorn serwujący całość na :8000
- Po zmianie `backend/api/schemas.py`: `make api-types` (przepisuje kontrakt na `frontend/src/api/schema.d.ts`; CI pilnuje, że są zgodne)

## Styl kodu
- Python: zależności przez **uv** + `backend/requirements*.txt`. **Bez `pyproject.toml`** (świadoma decyzja projektu), bez poetry i conda. W tym środowisku nie ma `pip` ani `ensurepip`, więc `pip install` fizycznie nie zadziała.
- Formatowanie i lint: ruff wg `ruff.toml` (E, F, I, UP, B; 88 kolumn; `src = ["backend"]`). Nie proponuj Blacka ani isort.
- Type hints w nowym kodzie Pythona.
- Frontend: TypeScript, Tailwind v4 do stylów (nie CSS modules/styled-components), `motion` (dawniej framer-motion) do animacji, Lucide do ikon, Radix do prymitywów wymagających a11y, TanStack Query do stanu serwera. Prettier + eslint.
- Tokeny designu wyłącznie w `frontend/src/styles/theme.css` (`@theme`). Kolory faz w `frontend/src/lib/phases.ts` i podawane przez zmienną CSS `--phase`, nie klasami Tailwinda per faza.

## Architektura
- `backend/db/` schemat + migracje na `PRAGMA user_version` (nigdy nie edytuj wydanej migracji, dopisuj na koniec `MIGRATIONS`), `backend/repository/` CRUD, `backend/services/` logika, `backend/api/` cienka warstwa HTTP.
- Połączenie z bazą jest **na request** (`api/deps.py`), migracje/seed/import content/migawka raz w `lifespan`.
- `data/` i `content/` leżą w korzeniu repo, nie w `backend/` — ścieżek pilnuje `backend/tests/test_paths.py`.
- XP, poziomy i osiągnięcia są **wyliczane** z `activity_log` (`services/gamification.py`), nie przechowywane.

## Testy
- pytest (`backend/tests/`, w tym `tests/api/` na TestClient) i vitest (`frontend/src/**/*.test.*`). Nowy kod wymaga testów. `make test` przed commitem.
- Testy API nie używają `with TestClient(app)` — to odpaliłoby lifespan na prawdziwej bazie.

## Commity i PR
- Conventional Commits, podpisywane (SSH). Nie commituj bezpośrednio do `master`.

## Bezpieczeństwo
- Sekrety w `.env` (gitignored), nigdy w repo.
