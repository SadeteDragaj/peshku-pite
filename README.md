# Restaurant Table-Ordering SaaS

Monorepo with a **FastAPI** backend and **React 18 + TypeScript** frontend.

## Quick Start (Docker)

```bash
docker compose up --build
```

- **API / Swagger:** http://localhost:8000/docs
- **Frontend:** http://localhost:5173

## Development (local)

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Pre-commit hooks
```bash
pip install pre-commit
pre-commit install
```
