"""Tests for the analytics endpoints."""

import pytest
import pytest_asyncio
from datetime import datetime, timezone

from app.models.menu import MenuCategory, MenuItem
from app.models.order import Order, OrderItem, OrderStatus
from app.models.table import Table


@pytest_asyncio.fixture
async def admin_header(client):
    await client.post("/api/auth/register", json={
        "email": "analytics_admin@test.com", "password": "StrongPass1!", "role": "admin"
    })
    resp = await client.post("/api/auth/login", json={
        "email": "analytics_admin@test.com", "password": "StrongPass1!"
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest_asyncio.fixture
async def seed_sales(db_session):
    table = Table(id="t1", number=1, seats=4)
    cat = MenuCategory(id="c1", name="Mains")
    mi1 = MenuItem(id="mi1", category_id="c1", name="Burger", price=12.50, available=True)
    mi2 = MenuItem(id="mi2", category_id="c1", name="Fries", price=5.00, available=True)
    db_session.add_all([table, cat, mi1, mi2])
    await db_session.flush()

    now = datetime.now(timezone.utc)

    # Order 1: served
    o1 = Order(id="o1", table_id="t1", status=OrderStatus.SERVED, created_at=now)
    db_session.add(o1)
    await db_session.flush()
    db_session.add_all([
        OrderItem(id="oi1", order_id="o1", menu_item_id="mi1", quantity=2, unit_price=12.50, subtotal=25.00),
        OrderItem(id="oi2", order_id="o1", menu_item_id="mi2", quantity=1, unit_price=5.00, subtotal=5.00),
    ])

    # Order 2: pending (still counts)
    o2 = Order(id="o2", table_id="t1", status=OrderStatus.PENDING, created_at=now)
    db_session.add(o2)
    await db_session.flush()
    db_session.add(OrderItem(id="oi3", order_id="o2", menu_item_id="mi1", quantity=1, unit_price=12.50, subtotal=12.50))

    # Order 3: voided (should be excluded)
    o3 = Order(id="o3", table_id="t1", status=OrderStatus.VOIDED, created_at=now)
    db_session.add(o3)
    await db_session.flush()
    db_session.add(OrderItem(id="oi4", order_id="o3", menu_item_id="mi2", quantity=3, unit_price=5.00, subtotal=15.00))

    await db_session.commit()


@pytest.mark.asyncio
class TestDailySales:
    async def test_returns_summary(self, client, admin_header, seed_sales):
        resp = await client.get("/api/analytics/daily-sales", headers=admin_header)
        assert resp.status_code == 200
        data = resp.json()
        assert "daily" in data
        assert "top_items" in data
        assert data["total_orders"] == 2  # voided excluded
        assert data["total_revenue"] == 42.50  # 25 + 5 + 12.50

    async def test_top_items(self, client, admin_header, seed_sales):
        resp = await client.get("/api/analytics/daily-sales", headers=admin_header)
        top = resp.json()["top_items"]
        assert len(top) >= 1
        # Burger: qty 3, Fries: qty 1 → Burger should be first
        assert top[0]["item_name"] == "Burger"
        assert top[0]["total_quantity"] == 3

    async def test_date_filter_excludes(self, client, admin_header, seed_sales):
        resp = await client.get(
            "/api/analytics/daily-sales?from=2020-01-01&to=2020-01-31",
            headers=admin_header,
        )
        assert resp.status_code == 200
        assert resp.json()["total_orders"] == 0

    async def test_empty_range(self, client, admin_header):
        resp = await client.get("/api/analytics/daily-sales", headers=admin_header)
        assert resp.status_code == 200
        assert resp.json()["total_orders"] == 0
        assert resp.json()["daily"] == []

    async def test_unauthenticated(self, client):
        resp = await client.get("/api/analytics/daily-sales")
        assert resp.status_code == 401

    async def test_non_admin_forbidden(self, client):
        await client.post("/api/auth/register", json={
            "email": "cust@test.com", "password": "StrongPass1!", "role": "customer"
        })
        resp = await client.post("/api/auth/login", json={
            "email": "cust@test.com", "password": "StrongPass1!"
        })
        token = resp.json()["access_token"]
        resp = await client.get(
            "/api/analytics/daily-sales",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403
