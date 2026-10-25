.PHONY: help install sample-data test dev-backend dev-frontend dev docker-up

help:
	@echo "DocuQuality - Document Image Quality Assessment & Auto-Correction"
	@echo "Available commands:"
	@echo "  make install       Install both backend and frontend dependencies"
	@echo "  make sample-data   Generate degraded synthetic documents in sample_data/"
	@echo "  make test          Run pytest suite on CV metrics and corrections"
	@echo "  make dev-backend   Start FastAPI uvicorn development server on :8000"
	@echo "  make dev-frontend  Start Vite development server on :5173"
	@echo "  make dev           Start full stack local development"
	@echo "  make docker-up     Run the full system using Docker Compose"

install:
	python -m pip install -r backend/requirements.txt
	cd frontend && npm install

sample-data:
	python backend/generate_samples.py

test:
	python -m pytest backend/tests -v

dev-backend:
	python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload

dev-frontend:
	cd frontend && npm run dev

dev:
	@echo "Starting backend and frontend..."
	python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 & cd frontend && npm run dev

docker-up:
	docker-compose up --build
