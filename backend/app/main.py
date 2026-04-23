


"""FastAPI application entry-point with CORS, routers, and WebSocket mount."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, menu, orders, payments, tables, waiter, inventory, analytics, ws
from app.core.config import settings
from app.db.session import engine
from app.db.base import Base

# Ensure all models are imported so Base.metadata is complete
import app.models  # noqa: F401


OPENAPI_TAGS = [
    {"name": "auth", "description": "Authentication: register, login, token refresh"},
    {"name": "menu", "description": "Menu categories & items CRUD"},
    {"name": "orders", "description": "Order placement, listing & status management"},
    {"name": "payments", "description": "Stripe payment intents & webhooks"},
    {"name": "waiter", "description": "Waiter dashboard: table overview, transfer, split, close"},
    {"name": "inventory", "description": "Inventory items, stock transactions, ingredient linkage"},
    {"name": "analytics", "description": "Sales analytics, daily summaries, top items"},
    {"name": "tables", "description": "Restaurant table management"},
    {"name": "websocket", "description": "Real-time order event stream"},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (dev only – use Alembic migrations in prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    lifespan=lifespan,
    openapi_tags=OPENAPI_TAGS,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(menu.router, prefix="/api/menu", tags=["menu"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(waiter.router, prefix="/api/waiter", tags=["waiter"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(tables.router, prefix="/api/tables", tags=["tables"])

# WebSocket
app.include_router(ws.router, prefix="/ws", tags=["websocket"])
