"""Tests for waiter dashboard endpoints."""

import pytest
import pytest_asyncio

from app.models.menu import MenuCategory, MenuItem
from app.models.order import Order, OrderItem, OrderStatus
from app.models.table import Table
from app.models.user import User
from app.core.security import hash_password


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def waiter_header(client):
    await client.post("/api/auth/register", json={
        "email": "waiter@test.com", "password": "StrongPass1!", "role": "waiter"
    })
    resp = await client.post("/api/auth/login", json={
        "email": "waiter@test.com", "password": "StrongPass1!"
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest_asyncio.fixture
async def waiter2_header(client, db_session):
    """Create a second waiter for transfer tests."""
    u = User(id="w2", email="waiter2@test.com", hashed_password=hash_password("StrongPass1!"), role="waiter")
    db_session.add(u)
    await db_session.commit()
    resp = await client.post("/api/auth/login", json={
        "email": "waiter2@test.com", "password": "StrongPass1!"
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest_asyncio.fixture
async def seed_tables(db_session):
    t1 = Table(id="t1", number=1, seats=4, occupied=True)
    t2 = Table(id="t2", number=2, seats=2, occupied=False)
    db_session.add_all([t1, t2])
    await db_session.flush()

    cat = MenuCategory(id="c1", name="Mains")
    item = MenuItem(id="mi1", category_id="c1", name="Burger", price=12.50, available=True)
    db_session.add_all([cat, item])
    await db_session.flush()

    o1 = Order(id="ord1", table_id="t1", status=OrderStatus.PENDING)
    db_session.add(o1)
    await db_session.flush()
    oi1 = OrderItem(id="oi1", order_id="ord1", menu_item_id="mi1", quantity=2, unit_price=12.50, subtotal=25.00)
    oi2 = OrderItem(id="oi2", order_id="ord1", menu_item_id="mi1", quantity=1, unit_price=12.50, subtotal=12.50)
    db_session.add_all([oi1, oi2])

    o2 = Order(id="ord2", table_id="t1", status=OrderStatus.READY)
    db_session.add(o2)
    await db_session.flush()
    oi3 = OrderItem(id="oi3", order_id="ord2", menu_item_id="mi1", quantity=1, unit_price=12.50, subtotal=12.50)
    db_session.add(oi3)

    await db_session.commit()
    return {"tables": [t1, t2], "orders": [o1, o2]}


# ---------------------------------------------------------------------------
# Table overview
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
class TestTableOverview:
    async def test_overview_returns_tables_with_active_orders(self, client, waiter_header, seed_tables):
        resp = await client.get("/api/waiter/tables", headers=waiter_header)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        t1 = next(t for t in data if t["number"] == 1)
        assert len(t1["active_orders"]) == 2
        assert t1["total_pending"] == 50.0

    async def test_overview_unauthenticated(self, client):
        resp = await client.get("/api/waiter/tables")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Transfer table
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
class TestTransferTable:
    async def test_transfer_success(self, client, waiter_header, waiter2_header, seed_tables, db_session):
        # Get waiter2 id
        resp = await client.get("/api/auth/me", headers=waiter2_header)
        w2_id = resp.json()["id"]

        resp = await client.post(
            "/api/waiter/tables/t1/transfer",
            json={"target_waiter_id": w2_id},
            headers=waiter_header,
        )
        assert resp.status_code == 200
        assert resp.json()["assigned_waiter_id"] == w2_id

    async def test_transfer_to_non_waiter_fails(self, client, waiter_header, seed_tables, db_session):
        from app.models.user import User as U
        from app.core.security import hash_password as hp
        cust = U(id="cust1", email="cust@test.com", hashed_password=hp("Pass1!"), role="customer")
        db_session.add(cust)
        await db_session.commit()

        resp = await client.post(
            "/api/waiter/tables/t1/transfer",
            json={"target_waiter_id": "cust1"},
            headers=waiter_header,
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Split bill
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
class TestSplitBill:
    async def test_split_success(self, client, waiter_header, seed_tables):
        resp = await client.post(
            "/api/waiter/orders/ord1/split-bill",
            json={"splits": [["oi1"], ["oi2"]]},
            headers=waiter_header,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["new_orders"]) == 2
        assert data["original_order_id"] == "ord1"

    async def test_split_missing_items_fails(self, client, waiter_header, seed_tables):
        resp = await client.post(
            "/api/waiter/orders/ord1/split-bill",
            json={"splits": [["oi1"], ["nonexistent"]]},
            headers=waiter_header,
        )
        assert resp.status_code == 400

    async def test_split_duplicate_item_fails(self, client, waiter_header, seed_tables):
        resp = await client.post(
            "/api/waiter/orders/ord1/split-bill",
            json={"splits": [["oi1", "oi2"], ["oi1"]]},
            headers=waiter_header,
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Close order
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
class TestCloseOrder:
    async def test_close_served(self, client, waiter_header, seed_tables):
        # ord2 is ready → can be served
        resp = await client.post(
            "/api/waiter/orders/ord2/close",
            json={"void": False},
            headers=waiter_header,
        )
        assert resp.status_code == 200
        assert resp.json()["new_status"] == "served"

    async def test_close_void(self, client, waiter_header, seed_tables):
        resp = await client.post(
            "/api/waiter/orders/ord1/close",
            json={"void": True},
            headers=waiter_header,
        )
        assert resp.status_code == 200
        assert resp.json()["new_status"] == "voided"

    async def test_serve_non_ready_fails(self, client, waiter_header, seed_tables):
        # ord1 is pending → cannot serve
        resp = await client.post(
            "/api/waiter/orders/ord1/close",
            json={"void": False},
            headers=waiter_header,
        )
        assert resp.status_code == 400

    async def test_close_already_closed_fails(self, client, waiter_header, seed_tables):
        await client.post("/api/waiter/orders/ord2/close", json={"void": False}, headers=waiter_header)
        resp = await client.post("/api/waiter/orders/ord2/close", json={"void": False}, headers=waiter_header)
        assert resp.status_code == 400
