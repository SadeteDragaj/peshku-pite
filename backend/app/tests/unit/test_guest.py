"""Tests for the guest (table tablet) API and the waiter request/clear endpoints."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.menu import MenuCategory, MenuItem
from app.models.table import Table
from app.models.user import User

KEY = "test-key-7"


def _staff(role: str = "waiter", user_id: str = "u-waiter") -> dict:
    return {"Authorization": f"Bearer {create_access_token({'sub': user_id, 'role': role})}"}


@pytest.fixture
async def seeded(db_session: AsyncSession):
    db_session.add(User(id="u-waiter", email="w@example.com", hashed_password="x", role="waiter"))
    db_session.add(Table(id="t7", number=7, seats=4, device_key=KEY, session_id="s-1"))
    cat = MenuCategory(id="c-fish", name="Peshku", name_en="Fish")
    db_session.add(cat)
    db_session.add_all(
        [
            MenuItem(
                id="m-solo",
                category_id="c-fish",
                name="Peshk për Një Bark",
                price=4.99,
                sizes=[{"code": "S", "price": 4.99}, {"code": "M", "price": 6.49}],
                addons=[{"id": "tartar", "name": "Salcë tartar", "name_en": "Tartar sauce", "price": 0.49}],
            ),
            MenuItem(id="m-sard", category_id="c-fish", name="Sardele", price=4.00),
            MenuItem(id="m-shrimp", category_id="c-fish", name="Tavë me Karkaleca", price=16.0, available=False),
            MenuItem(id="m-cod", category_id="c-fish", name="Qofte Merluci", price=0),
        ]
    )
    await db_session.commit()


def _h(key: str = KEY) -> dict:
    return {"X-Table-Key": key}


async def _order(client: AsyncClient, items: list[dict], key: str = KEY):
    return await client.post("/api/guest/tables/7/orders", json={"items": items}, headers=_h(key))


@pytest.mark.asyncio
async def test_menu_is_public_and_includes_sold_out(client: AsyncClient, seeded):
    res = await client.get("/api/guest/menu")
    assert res.status_code == 200
    names = {i["name"]: i for i in res.json()[0]["items"]}
    assert names["Tavë me Karkaleca"]["available"] is False
    assert names["Peshk për Një Bark"]["sizes"][1] == {"code": "M", "price": 6.49}


@pytest.mark.asyncio
async def test_wrong_key_is_rejected(client: AsyncClient, seeded):
    assert (await client.get("/api/guest/tables/7", headers=_h("nope"))).status_code == 401
    assert (await client.get("/api/guest/tables/7")).status_code == 422
    ok = await client.get("/api/guest/tables/7", headers=_h())
    assert ok.status_code == 200 and ok.json()["number"] == 7


@pytest.mark.asyncio
async def test_order_prices_size_and_addons_on_server(client: AsyncClient, seeded):
    res = await _order(
        client,
        [
            {
                "menu_item_id": "m-solo",
                "size": "M",
                "addon_ids": ["tartar"],
                "quantity": 2,
                "special_instructions": " pa qepë ",
            },
            {"menu_item_id": "m-sard"},
        ],
    )
    assert res.status_code == 201, res.text
    body = res.json()
    first = body["items"][0]
    assert first["unit_price"] == 6.98 and first["subtotal"] == 13.96
    assert first["size"] == "M" and first["addons"][0]["id"] == "tartar"
    assert first["special_instructions"] == "pa qepë" and first["name"] == "Peshk për Një Bark"
    assert body["table_number"] == 7 and body["session_id"] == "s-1"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "line, detail",
    [
        ({"menu_item_id": "m-solo"}, "Choose a size"),
        ({"menu_item_id": "m-sard", "size": "S"}, "no size options"),
        ({"menu_item_id": "m-solo", "size": "S", "addon_ids": ["caviar"]}, "not offered"),
        ({"menu_item_id": "m-shrimp"}, "not available"),
        ({"menu_item_id": "m-cod"}, "no price set"),
    ],
)
async def test_invalid_lines_are_rejected(client: AsyncClient, seeded, line, detail):
    res = await _order(client, [line])
    assert res.status_code == 400 and detail in res.json()["detail"]


@pytest.mark.asyncio
async def test_tab_only_shows_current_session(client: AsyncClient, seeded):
    await _order(client, [{"menu_item_id": "m-sard", "quantity": 2}])
    tab = (await client.get("/api/guest/tables/7/tab", headers=_h())).json()
    assert tab["total"] == 8.0 and len(tab["orders"]) == 1

    # Can't clear while the order isn't served
    res = await client.post("/api/waiter/tables/t7/clear", headers=_staff())
    assert res.status_code == 400

    order_id = tab["orders"][0]["id"]
    for s in ("preparing", "ready", "served"):
        r = await client.patch(f"/api/orders/{order_id}/status", json={"status": s}, headers=_staff())
        assert r.status_code == 200
    assert (await client.post("/api/waiter/tables/t7/clear", headers=_staff())).status_code == 200

    tab = (await client.get("/api/guest/tables/7/tab", headers=_h())).json()
    assert tab["total"] == 0 and tab["orders"] == []


@pytest.mark.asyncio
async def test_service_requests_flow(client: AsyncClient, seeded):
    assert (await client.post("/api/guest/tables/7/requests", json={"kind": "bill"}, headers=_h())).status_code == 400

    r1 = await client.post("/api/guest/tables/7/requests", json={"kind": "waiter"}, headers=_h())
    r2 = await client.post("/api/guest/tables/7/requests", json={"kind": "waiter"}, headers=_h())
    assert r1.status_code == 201 and r1.json()["id"] == r2.json()["id"]  # no duplicates

    bill = await client.post(
        "/api/guest/tables/7/requests", json={"kind": "bill", "payment_method": "card"}, headers=_h()
    )
    assert bill.json()["payment_method"] == "card"

    open_ = (await client.get("/api/waiter/requests", headers=_staff())).json()
    assert {r["kind"] for r in open_} == {"waiter", "bill"} and open_[0]["table_number"] == 7

    done = await client.post(f"/api/waiter/requests/{r1.json()['id']}/done", headers=_staff())
    assert done.json()["status"] == "done"

    cancel = await client.delete(f"/api/guest/tables/7/requests/{bill.json()['id']}", headers=_h())
    assert cancel.status_code == 204
    assert (await client.get("/api/guest/tables/7/requests", headers=_h())).json() == []


@pytest.mark.asyncio
async def test_feedback(client: AsyncClient, seeded):
    ok = await client.post("/api/guest/tables/7/feedback", json={"rating": 5, "tags": ["Atmosfera"]}, headers=_h())
    assert ok.status_code == 201
    bad = await client.post("/api/guest/tables/7/feedback", json={"rating": 9}, headers=_h())
    assert bad.status_code == 422


@pytest.mark.asyncio
async def test_public_table_list_hides_device_key(client: AsyncClient, seeded):
    rows = (await client.get("/api/tables/")).json()
    assert rows[0]["number"] == 7 and "device_key" not in rows[0]
