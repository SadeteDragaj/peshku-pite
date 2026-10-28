"""Tests for the manager board: day summary, staff accounts, table assignment, reviews."""

from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio

from app.core.security import hash_password
from app.models.menu import MenuCategory, MenuItem
from app.models.order import Order, OrderItem, OrderStatus
from app.models.service import Feedback
from app.models.table import Table
from app.models.user import User


async def _login(client, email: str, password: str = "StrongPass1!") -> dict:
    resp = await client.post("/api/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest_asyncio.fixture
async def admin_header(client, db_session):
    db_session.add(
        User(id="adm", email="boss@test.com", full_name="Boss", hashed_password=hash_password("StrongPass1!"), role="admin")
    )
    await db_session.commit()
    return await _login(client, "boss@test.com")


@pytest_asyncio.fixture
async def waiter(db_session):
    u = User(id="w1", email="ana@test.com", full_name="Ana", hashed_password=hash_password("StrongPass1!"), role="waiter")
    db_session.add(u)
    await db_session.commit()
    return u


@pytest_asyncio.fixture
async def floor(db_session, waiter):
    """Two tables, table 1 served by Ana; two sold orders and one voided order today."""
    db_session.add_all([Table(id="t1", number=1, assigned_waiter_id="w1"), Table(id="t2", number=2)])
    db_session.add_all([MenuCategory(id="c1", name="Fish"), MenuItem(id="mi1", category_id="c1", name="Levrek", price=10)])
    await db_session.flush()
    now = datetime.now(timezone.utc)
    for oid, table, waiter_id, status, qty in [
        ("o1", "t1", "w1", OrderStatus.SERVED, 2),
        ("o2", "t2", None, OrderStatus.PENDING, 1),
        ("o3", "t1", "w1", OrderStatus.VOIDED, 5),
    ]:
        db_session.add(Order(id=oid, table_id=table, session_id=f"s-{table}", waiter_id=waiter_id, status=status, created_at=now))
        await db_session.flush()
        db_session.add(
            OrderItem(order_id=oid, menu_item_id="mi1", name="Levrek", quantity=qty, unit_price=10, subtotal=10 * qty)
        )
    db_session.add(Feedback(table_id="t1", rating=5, tags=["Ushqimi"], comment="Shumë mirë"))
    db_session.add(Feedback(table_id="t2", rating=3, tags=["Ushqimi", "Shpejtësia"], comment=""))
    await db_session.commit()


# ---------------------------------------------------------------------------
# Access
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_waiter_cannot_open_manager_board(client, waiter):
    headers = await _login(client, "ana@test.com")
    resp = await client.get("/api/manager/summary", headers=headers)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_summary_counts_todays_money(client, admin_header, floor):
    data = (await client.get("/api/manager/summary", headers=admin_header)).json()
    assert data["revenue"] == 30.0  # 20 served + 10 pending; the voided 50 is excluded
    assert data["orders"] == 2
    assert data["avg_order"] == 15.0
    assert data["items_sold"] == 3
    assert data["tabs"] == 2
    assert data["voided_orders"] == 1 and data["voided_value"] == 50.0
    assert data["open_orders"] == 1
    assert data["avg_rating"] == 4.0 and data["reviews"] == 2
    assert {w["name"]: w["revenue"] for w in data["by_waiter"]} == {"Ana": 20.0, "": 10.0}
    assert data["top_items"][0] == {"name": "Levrek", "quantity": 3, "revenue": 30.0}
    assert len(data["last_7_days"]) == 7 and data["last_7_days"][-1]["revenue"] == 30.0


@pytest.mark.asyncio
async def test_summary_for_an_empty_day(client, admin_header, floor):
    past = (datetime.now(timezone.utc) - timedelta(days=30)).date()
    data = (await client.get(f"/api/manager/summary?day={past}", headers=admin_header)).json()
    assert data["revenue"] == 0 and data["orders"] == 0 and data["avg_rating"] is None


# ---------------------------------------------------------------------------
# Staff
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_add_waiter_who_can_then_log_in(client, admin_header):
    resp = await client.post(
        "/api/manager/staff",
        headers=admin_header,
        json={"email": "Blerta@Test.com", "full_name": "Blerta", "password": "Kamarierja1", "role": "waiter"},
    )
    assert resp.status_code == 201
    assert resp.json()["email"] == "blerta@test.com"
    login = await client.post("/api/auth/login", json={"email": "blerta@test.com", "password": "Kamarierja1"})
    assert login.status_code == 200

    dup = await client.post(
        "/api/manager/staff",
        headers=admin_header,
        json={"email": "blerta@test.com", "full_name": "B", "password": "Kamarierja1"},
    )
    assert dup.status_code == 409


@pytest.mark.asyncio
async def test_remove_waiter_blocks_login_and_frees_tables(client, admin_header, floor):
    resp = await client.delete("/api/manager/staff/w1", headers=admin_header)
    assert resp.status_code == 200
    assert resp.json()["active"] is False and resp.json()["table_numbers"] == []

    login = await client.post("/api/auth/login", json={"email": "ana@test.com", "password": "StrongPass1!"})
    assert login.status_code == 401

    # History stays: her sales still count under her name
    data = (await client.get("/api/manager/summary", headers=admin_header)).json()
    assert {w["name"] for w in data["by_waiter"]} == {"Ana", ""}

    back = await client.patch("/api/manager/staff/w1", headers=admin_header, json={"active": True})
    assert back.json()["active"] is True


@pytest.mark.asyncio
async def test_manager_cannot_remove_themselves(client, admin_header):
    resp = await client.delete("/api/manager/staff/adm", headers=admin_header)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_reset_password(client, admin_header, waiter):
    await client.patch("/api/manager/staff/w1", headers=admin_header, json={"password": "NewPassword9"})
    assert (await client.post("/api/auth/login", json={"email": "ana@test.com", "password": "NewPassword9"})).status_code == 200


# ---------------------------------------------------------------------------
# Tables
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_assign_and_unassign_table(client, admin_header, floor):
    resp = await client.put("/api/manager/tables/t2/waiter", headers=admin_header, json={"waiter_id": "w1"})
    assert resp.status_code == 200 and resp.json()["assigned_waiter_name"] == "Ana"

    staff = (await client.get("/api/manager/staff", headers=admin_header)).json()
    assert next(s for s in staff if s["id"] == "w1")["table_numbers"] == [1, 2]

    tables = (await client.get("/api/manager/tables", headers=admin_header)).json()
    assert tables[1]["open_orders"] == 1 and tables[1]["pending_total"] == 10.0

    resp = await client.put("/api/manager/tables/t2/waiter", headers=admin_header, json={"waiter_id": None})
    assert resp.json()["assigned_waiter_id"] is None


@pytest.mark.asyncio
async def test_cannot_assign_to_kitchen_or_inactive(client, admin_header, floor, db_session):
    db_session.add(User(id="k1", email="k@test.com", hashed_password="x", role="kitchen"))
    await db_session.commit()
    resp = await client.put("/api/manager/tables/t2/waiter", headers=admin_header, json={"waiter_id": "k1"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_new_orders_record_the_tables_waiter(client, floor, db_session):
    table = await db_session.get(Table, "t1")
    resp = await client.post(
        "/api/guest/tables/1/orders",
        headers={"X-Table-Key": table.device_key},
        json={"items": [{"menu_item_id": "mi1", "quantity": 1}]},
    )
    assert resp.status_code == 201
    order = await db_session.get(Order, resp.json()["id"])
    assert order.waiter_id == "w1"


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_reviews_overview(client, admin_header, floor):
    data = (await client.get("/api/manager/reviews", headers=admin_header)).json()
    assert data["count"] == 2 and data["average"] == 4.0
    assert data["distribution"] == [0, 0, 1, 0, 1]
    assert data["top_tags"][0] == {"tag": "Ushqimi", "count": 2}
    assert {r["table_number"] for r in data["reviews"]} == {1, 2}
