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

## Peshku i Pitë – table tablets

Guests order from a tablet on each table; orders go straight to the kitchen display.

```bash
cd backend && python -m app.seed      # menu, tables 1–14, dev staff accounts; prints one link per table
```

| Who | URL | Login |
|---|---|---|
| Table tablet | `/t/7?key=…` (open the printed link once – the key is then remembered; the tablet can stay on `/t/7`) | none |
| Kitchen display | `/kitchen` | `kuzhina@example.com` |
| Waiter floor view | `/waiter` | `kamarieri@example.com` |
| Manager board (today's sales, staff, table → waiter, reviews) | `/manager` | `admin@example.com` |
| Menu manager (sold out, prices, photos) | `/menu-manager` | `admin@example.com` |

Dev staff password: `ndrysho-kete` (set `SEED_STAFF_PASSWORD` before seeding to change it).
Admins can list or rotate tablet links via `GET /api/tables/tablets` and `POST /api/tables/{id}/rotate-key`.

Items seeded with price `0` (Qofte Merluci and the non-cocktail drinks) show "Çmimi së shpejti" and can't be
ordered until a price is set in the menu manager. Fish plate sizes all use the base placeholder price for now.

Existing database? Run `alembic upgrade head` (migrations `0003_guest_tablet`, `0004_manager_board`) or, in dev, recreate it.

Waiters only see their own tables by default ("Tavolinat e mia"); the manager assigns them under Menaxheri → Tavolinat.
Removing a staff member deactivates the account (no login, tables freed) but keeps their sales in the reports.
"Today" uses the restaurant's local day – set `RESTAURANT_TZ` (default `Europe/Tirane`).
