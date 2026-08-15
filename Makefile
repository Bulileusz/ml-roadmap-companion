# Jeden punkt wejścia do obu połówek monorepo. Bez tego każda komenda wymaga
# pamiętania, z którego katalogu się ją odpala i którym Pythonem.
.DEFAULT_GOAL := help
.PHONY: help setup dev dev-backend dev-frontend test test-backend test-frontend \
        lint lint-backend lint-frontend format build run api-types clean

PY := .venv/bin/python
UV := uv

help: ## Ta lista
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## Zależności backendu (uv) i frontendu (npm)
	$(UV) venv --allow-existing
	$(UV) pip install -r backend/requirements-dev.txt
	npm --prefix frontend install

dev: ## Backend i frontend naraz (Vite proxuje /api na :8000)
	@echo "backend  → http://127.0.0.1:8000"
	@echo "frontend → http://127.0.0.1:5173"
	@trap 'kill 0' EXIT INT TERM; \
		( cd backend && ../$(PY) -m uvicorn api.main:app --reload --port 8000 ) & \
		npm --prefix frontend run dev & \
		wait

dev-backend: ## Sam backend z przeładowaniem
	cd backend && ../$(PY) -m uvicorn api.main:app --reload --port 8000

dev-frontend: ## Sam frontend
	npm --prefix frontend run dev

test: test-backend test-frontend ## Wszystkie testy

test-backend: ## pytest
	$(PY) -m pytest

test-frontend: ## vitest
	npm --prefix frontend test

lint: lint-backend lint-frontend ## Lint obu połówek

lint-backend: ## ruff check + format --check
	.venv/bin/ruff check .
	.venv/bin/ruff format --check .

lint-frontend: ## tsc + eslint
	npm --prefix frontend run typecheck
	npm --prefix frontend run lint

format: ## ruff format + prettier
	.venv/bin/ruff format .
	npm --prefix frontend exec -- prettier --write "src/**/*.{ts,tsx,css}"

build: ## Produkcyjny build frontendu do frontend/dist
	npm --prefix frontend run build

run: build ## Cała apka na jednym porcie (uvicorn serwuje też frontend/dist)
	@echo "apka → http://127.0.0.1:8000"
	cd backend && ../$(PY) -m uvicorn api.main:app --port 8000

smoke: build ## Cała apka na jednorazowej bazie w /tmp — NIE dotyka twoich danych
	@echo "próbna apka → http://127.0.0.1:8001 (baza: /tmp/ml-roadmap-smoke.db)"
	rm -f /tmp/ml-roadmap-smoke.db*
	cd backend && ML_ROADMAP_DB=/tmp/ml-roadmap-smoke.db \
		../$(PY) -m uvicorn api.main:app --port 8001

api-types: ## Przepisz kontrakt FastAPI na typy TS (po każdej zmianie schemas.py)
	cd backend && ../$(PY) -c "import json; from api.main import app; \
		print(json.dumps(app.openapi(), ensure_ascii=False, indent=2))" \
		> ../frontend/openapi.json
	npm --prefix frontend run gen:api

clean: ## Wyniki buildów i cache (baza i migawki zostają nietknięte)
	rm -rf frontend/dist frontend/node_modules/.vite .pytest_cache .ruff_cache
	find . -name __pycache__ -type d -not -path "./.venv/*" -exec rm -rf {} +
