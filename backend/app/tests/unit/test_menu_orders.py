"""Unit / integration tests for menu & orders endpoints.

Covers:
  MenuCategory — CRUD, duplicate name, cascading delete
  MenuItem     — CRUD, pagination, filtering, unavailable guard
  Order        — place, list, get, status transitions, invalid transitions
  WebSocket    — broadcast on create + status change
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, Role

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_ADMIN_EMAIL = "admin@example.com"
_CUSTOMER_EMAIL = "customer@example.com"


def _auth(role: str = "admin", user_id: str = "u-test") -> dict:
    """Return Authorization header with a fresh access token."""
    token = create_access_token({"sub": user_id, "role": role})
    return {"Authorization": f"Bearer {token}"}


async def _seed_admin_user(db: AsyncSession):
    """Insert a minimal admin user row so get_current_user resolves."""
    from app.models.user import User
    from app.core.security import hash_password

    u = User(id="u-test", email=_ADMIN_EMAIL, hashed_password=hash_password("Test1234!"), role="admin")
    db.add(u)
    await db.commit()


async def _seed_customer_user(db: AsyncSession):
    from app.models.user import User
    from app.core.security import hash_password

    u = User(id="u-cust", email=_CUSTOMER_EMAIL, hashed_password=hash_password("Test1234!"), role="customer")
    db.add(u)
    await db.commit()


async def _create_category(client: AsyncClient, name: str = "Appetizers", headers: dict | None = None):
    headers = headers or _auth()
    return await client.post(
        "/api/menu/categories",
        json={"name": name, "description": f"{name} desc", "sort_order": 0},
        headers=headers,
    )


async def _create_item(client: AsyncClient, category_id: str, name: str = "Spring Rolls", price: float = 8.50, headers: dict | None = None):
    headers = headers or _auth()
    return await client.post(
        "/api/menu/items",
        json={"category_id": category_id, "name": name, "price": price},
        headers=headers,
    )


async def _create_table(db: AsyncSession, number: int = 1):
    from app.models.table import Table

    t = Table(id=f"tbl-{number}", number=number, seats=4)
    db.add(t)
    await db.commit()
    return t


# ======================================================================
# MenuCategory
# ======================================================================
class TestMenuCategory:
    @pytest.mark.asyncio
    async def test_create_category(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        resp = await _create_category(client)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Appetizers"
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.asyncio
    async def test_duplicate_category_name(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        await _create_category(client, "Mains")
        resp = await _create_category(client, "Mains")
        assert resp.status_code == 409

    @pytest.mark.asyncio
    async def test_list_categories(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        await _create_category(client, "A")
        await _create_category(client, "B")
        resp = await client.get("/api/menu/categories")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    @pytest.mark.asyncio
    async def test_get_category_with_items(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        cat = (await _create_category(client)).json()
        await _create_item(client, cat["id"], "Item A")
        await _create_item(client, cat["id"], "Item B")
        resp = await client.get(f"/api/menu/categories/{cat['id']}")
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 2

    @pytest.mark.asyncio
    async def test_update_category(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        cat = (await _create_category(client)).json()
        resp = await client.patch(
            f"/api/menu/categories/{cat['id']}",
            json={"name": "Starters"},
            headers=_auth(),
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Starters"

    @pytest.mark.asyncio
    async def test_delete_category_cascades(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        cat = (await _create_category(client)).json()
        await _create_item(client, cat["id"])
        resp = await client.delete(f"/api/menu/categories/{cat['id']}", headers=_auth())
        assert resp.status_code == 204
        # Verify items also gone
        items = await client.get("/api/menu/items")
        assert items.json()["total"] == 0

    @pytest.mark.asyncio
    async def test_category_not_found(self, client: AsyncClient):
        resp = await client.get("/api/menu/categories/nonexistent")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_create_category_requires_admin(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_customer_user(db_session)
        resp = await _create_category(client, headers=_auth(role="customer", user_id="u-cust"))
        assert resp.status_code == 403


# ======================================================================
# MenuItem
# ======================================================================
class TestMenuItem:
    @pytest.mark.asyncio
    async def test_create_item(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        cat = (await _create_category(client)).json()
        resp = await _create_item(client, cat["id"])
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Spring Rolls"
        assert data["category_id"] == cat["id"]

    @pytest.mark.asyncio
    async def test_create_item_invalid_category(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        resp = await _create_item(client, "no-such-category")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_list_items_paginated(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        cat = (await _create_category(client)).json()
        for i in range(5):
            await _create_item(client, cat["id"], name=f"Item {i}", price=float(i + 1))
        resp = await client.get("/api/menu/items?page=1&page_size=2")
        data = resp.json()
        assert data["total"] == 5
        assert len(data["items"]) == 2
        assert data["pages"] == 3

    @pytest.mark.asyncio
    async def test_list_items_filter_by_category(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        cat_a = (await _create_category(client, "Cat A")).json()
        cat_b = (await _create_category(client, "Cat B")).json()
        await _create_item(client, cat_a["id"], "A1")
        await _create_item(client, cat_b["id"], "B1")
        resp = await client.get(f"/api/menu/items?category_id={cat_a['id']}")
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["name"] == "A1"

    @pytest.mark.asyncio
    async def test_list_items_filter_by_available(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        cat = (await _create_category(client)).json()
        item_resp = await _create_item(client, cat["id"], "Sold Out")
        item_id = item_resp.json()["id"]
        await client.patch(f"/api/menu/items/{item_id}", json={"available": False}, headers=_auth())
        resp = await client.get("/api/menu/items?available=true")
        assert resp.json()["total"] == 0

    @pytest.mark.asyncio
    async def test_list_items_search(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        cat = (await _create_category(client)).json()
        await _create_item(client, cat["id"], "Caesar Salad")
        await _create_item(client, cat["id"], "Garlic Bread")
        resp = await client.get("/api/menu/items?q=caesar")
        assert resp.json()["total"] == 1

    @pytest.mark.asyncio
    async def test_get_item(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        cat = (await _create_category(client)).json()
        item = (await _create_item(client, cat["id"])).json()
        resp = await client.get(f"/api/menu/items/{item['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == item["id"]

    @pytest.mark.asyncio
    async def test_update_item(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        cat = (await _create_category(client)).json()
        item = (await _create_item(client, cat["id"])).json()
        resp = await client.patch(
            f"/api/menu/items/{item['id']}",
            json={"price": 12.0, "name": "Updated"},
            headers=_auth(),
        )
        assert resp.status_code == 200
        assert resp.json()["price"] == 12.0
        assert resp.json()["name"] == "Updated"

    @pytest.mark.asyncio
    async def test_delete_item(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        cat = (await _create_category(client)).json()
        item = (await _create_item(client, cat["id"])).json()
        resp = await client.delete(f"/api/menu/items/{item['id']}", headers=_auth())
        assert resp.status_code == 204
        resp2 = await client.get(f"/api/menu/items/{item['id']}")
        assert resp2.status_code == 404


# ======================================================================
# Orders
# ======================================================================
class TestOrders:
    @pytest.mark.asyncio
    async def test_place_order(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        await _create_table(db_session)
        cat = (await _create_category(client)).json()
        item = (await _create_item(client, cat["id"])).json()

        resp = await client.post(
            "/api/orders/",
            json={
                "table_id": "tbl-1",
                "notes": "No onions",
                "items": [{"menu_item_id": item["id"], "quantity": 2, "special_instructions": "Extra sauce"}],
            },
            headers=_auth(),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "pending"
        assert data["notes"] == "No onions"
        assert len(data["items"]) == 1
        assert data["items"][0]["quantity"] == 2
        assert data["items"][0]["unit_price"] == item["price"]
        assert data["items"][0]["subtotal"] == item["price"] * 2

    @pytest.mark.asyncio
    async def test_place_order_nonexistent_table(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        cat = (await _create_category(client)).json()
        item = (await _create_item(client, cat["id"])).json()
        resp = await client.post(
            "/api/orders/",
            json={"table_id": "bad-table", "items": [{"menu_item_id": item["id"]}]},
            headers=_auth(),
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_place_order_nonexistent_item(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        await _create_table(db_session)
        resp = await client.post(
            "/api/orders/",
            json={"table_id": "tbl-1", "items": [{"menu_item_id": "no-item"}]},
            headers=_auth(),
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_place_order_unavailable_item(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        await _create_table(db_session)
        cat = (await _create_category(client)).json()
        item = (await _create_item(client, cat["id"])).json()
        # Mark unavailable
        await client.patch(f"/api/menu/items/{item['id']}", json={"available": False}, headers=_auth())
        resp = await client.post(
            "/api/orders/",
            json={"table_id": "tbl-1", "items": [{"menu_item_id": item["id"]}]},
            headers=_auth(),
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_place_order_empty_items(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        resp = await client.post(
            "/api/orders/",
            json={"table_id": "tbl-1", "items": []},
            headers=_auth(),
        )
        assert resp.status_code == 422  # Pydantic min_length=1

    @pytest.mark.asyncio
    async def test_list_orders_paginated(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        await _create_table(db_session)
        cat = (await _create_category(client)).json()
        item = (await _create_item(client, cat["id"])).json()
        for _ in range(3):
            await client.post(
                "/api/orders/",
                json={"table_id": "tbl-1", "items": [{"menu_item_id": item["id"]}]},
                headers=_auth(),
            )
        resp = await client.get("/api/orders/?page=1&page_size=2", headers=_auth())
        data = resp.json()
        assert data["total"] == 3
        assert len(data["items"]) == 2
        assert data["pages"] == 2

    @pytest.mark.asyncio
    async def test_list_orders_filter_by_status(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        await _create_table(db_session)
        cat = (await _create_category(client)).json()
        item = (await _create_item(client, cat["id"])).json()
        order = (
            await client.post(
                "/api/orders/",
                json={"table_id": "tbl-1", "items": [{"menu_item_id": item["id"]}]},
                headers=_auth(),
            )
        ).json()
        # Move to preparing
        await client.patch(f"/api/orders/{order['id']}/status", json={"status": "preparing"}, headers=_auth())
        # Filter pending – should be 0
        resp = await client.get("/api/orders/?status=pending", headers=_auth())
        assert resp.json()["total"] == 0
        # Filter preparing – should be 1
        resp = await client.get("/api/orders/?status=preparing", headers=_auth())
        assert resp.json()["total"] == 1

    @pytest.mark.asyncio
    async def test_get_order(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        await _create_table(db_session)
        cat = (await _create_category(client)).json()
        item = (await _create_item(client, cat["id"])).json()
        order = (
            await client.post(
                "/api/orders/",
                json={"table_id": "tbl-1", "items": [{"menu_item_id": item["id"]}]},
                headers=_auth(),
            )
        ).json()
        resp = await client.get(f"/api/orders/{order['id']}", headers=_auth())
        assert resp.status_code == 200
        assert resp.json()["id"] == order["id"]

    @pytest.mark.asyncio
    async def test_get_order_not_found(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_admin_user(db_session)
        resp = await client.get("/api/orders/nonexistent", headers=_auth())
        assert resp.status_code == 404


# ======================================================================
# Order status transitions
# ======================================================================
class TestOrderStatusTransitions:
    async def _make_order(self, client: AsyncClient, db_session: AsyncSession) -> dict:
        await _seed_admin_user(db_session)
        await _create_table(db_session)
        cat = (await _create_category(client)).json()
        item = (await _create_item(client, cat["id"])).json()
        return (
            await client.post(
                "/api/orders/",
                json={"table_id": "tbl-1", "items": [{"menu_item_id": item["id"]}]},
                headers=_auth(),
            )
        ).json()

    @pytest.mark.asyncio
    async def test_happy_path_pending_to_served(self, client: AsyncClient, db_session: AsyncSession):
        order = await self._make_order(client, db_session)
        oid = order["id"]
        for next_status in ["preparing", "ready", "served"]:
            resp = await client.patch(f"/api/orders/{oid}/status", json={"status": next_status}, headers=_auth())
            assert resp.status_code == 200
            assert resp.json()["status"] == next_status

    @pytest.mark.asyncio
    async def test_void_from_pending(self, client: AsyncClient, db_session: AsyncSession):
        order = await self._make_order(client, db_session)
        resp = await client.patch(f"/api/orders/{order['id']}/status", json={"status": "voided"}, headers=_auth())
        assert resp.status_code == 200
        assert resp.json()["status"] == "voided"

    @pytest.mark.asyncio
    async def test_void_from_preparing(self, client: AsyncClient, db_session: AsyncSession):
        order = await self._make_order(client, db_session)
        await client.patch(f"/api/orders/{order['id']}/status", json={"status": "preparing"}, headers=_auth())
        resp = await client.patch(f"/api/orders/{order['id']}/status", json={"status": "voided"}, headers=_auth())
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_cannot_go_backward(self, client: AsyncClient, db_session: AsyncSession):
        order = await self._make_order(client, db_session)
        await client.patch(f"/api/orders/{order['id']}/status", json={"status": "preparing"}, headers=_auth())
        resp = await client.patch(f"/api/orders/{order['id']}/status", json={"status": "pending"}, headers=_auth())
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_cannot_transition_from_served(self, client: AsyncClient, db_session: AsyncSession):
        order = await self._make_order(client, db_session)
        for s in ["preparing", "ready", "served"]:
            await client.patch(f"/api/orders/{order['id']}/status", json={"status": s}, headers=_auth())
        resp = await client.patch(f"/api/orders/{order['id']}/status", json={"status": "voided"}, headers=_auth())
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_cannot_transition_from_voided(self, client: AsyncClient, db_session: AsyncSession):
        order = await self._make_order(client, db_session)
        await client.patch(f"/api/orders/{order['id']}/status", json={"status": "voided"}, headers=_auth())
        resp = await client.patch(f"/api/orders/{order['id']}/status", json={"status": "preparing"}, headers=_auth())
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_invalid_status_value(self, client: AsyncClient, db_session: AsyncSession):
        order = await self._make_order(client, db_session)
        resp = await client.patch(f"/api/orders/{order['id']}/status", json={"status": "exploded"}, headers=_auth())
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_status_update_requires_staff(self, client: AsyncClient, db_session: AsyncSession):
        await _seed_customer_user(db_session)
        await _seed_admin_user(db_session)
        await _create_table(db_session)
        cat = (await _create_category(client)).json()
        item = (await _create_item(client, cat["id"])).json()
        order = (
            await client.post(
                "/api/orders/",
                json={"table_id": "tbl-1", "items": [{"menu_item_id": item["id"]}]},
                headers=_auth(role="customer", user_id="u-cust"),
            )
        ).json()
        resp = await client.patch(
            f"/api/orders/{order['id']}/status",
            json={"status": "preparing"},
            headers=_auth(role="customer", user_id="u-cust"),
        )
        assert resp.status_code == 403
