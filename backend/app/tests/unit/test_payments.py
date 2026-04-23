"""Tests for payment endpoints with mocked Stripe provider."""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import ASGITransport, AsyncClient

from app.payments import PaymentIntentResult, WebhookEvent


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
MOCK_INTENT = PaymentIntentResult(
    provider_intent_id="pi_test_123",
    client_secret="pi_test_123_secret_abc",
    amount=2500,
    currency="usd",
)

MOCK_WEBHOOK_EVENT = WebhookEvent(
    event_type="payment_intent.succeeded",
    intent_id="pi_test_123",
    status="succeeded",
)


def _mock_provider():
    provider = MagicMock()
    provider.create_intent = AsyncMock(return_value=MOCK_INTENT)
    provider.verify_webhook = MagicMock(return_value=MOCK_WEBHOOK_EVENT)
    return provider


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def auth_header(client):
    """Register + login a user, return Authorization header."""
    await client.post("/api/auth/register", json={
        "email": "pay@test.com", "password": "StrongPass1!", "role": "customer"
    })
    resp = await client.post("/api/auth/login", json={
        "email": "pay@test.com", "password": "StrongPass1!"
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def seed_order(client, auth_header, db_session):
    """Create a table, category, menu item, and order for payment tests."""
    from app.models.table import Table
    from app.models.menu import MenuCategory, MenuItem
    from app.models.order import Order, OrderItem

    table = Table(id="t1", number=1, seats=4)
    cat = MenuCategory(id="c1", name="Mains")
    item = MenuItem(id="mi1", category_id="c1", name="Burger", price=12.50, available=True)
    db_session.add_all([table, cat, item])
    await db_session.flush()

    order = Order(id="ord1", table_id="t1")
    db_session.add(order)
    await db_session.flush()

    oi = OrderItem(
        id="oi1", order_id="ord1", menu_item_id="mi1",
        quantity=2, unit_price=12.50, subtotal=25.00,
    )
    db_session.add(oi)
    await db_session.commit()
    return "ord1"


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
class TestCreatePaymentIntent:
    @patch("app.api.payments.get_payment_provider", _mock_provider)
    async def test_create_intent_success(self, client, auth_header, seed_order):
        resp = await client.post(
            "/api/payments/create-intent",
            json={"order_id": seed_order},
            headers=auth_header,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "client_secret" in data
        assert data["amount"] == 25.0
        assert data["currency"] == "usd"

    @patch("app.api.payments.get_payment_provider", _mock_provider)
    async def test_create_intent_order_not_found(self, client, auth_header):
        resp = await client.post(
            "/api/payments/create-intent",
            json={"order_id": "nonexistent"},
            headers=auth_header,
        )
        assert resp.status_code == 404

    @patch("app.api.payments.get_payment_provider", _mock_provider)
    async def test_create_intent_duplicate(self, client, auth_header, seed_order):
        await client.post(
            "/api/payments/create-intent",
            json={"order_id": seed_order},
            headers=auth_header,
        )
        resp = await client.post(
            "/api/payments/create-intent",
            json={"order_id": seed_order},
            headers=auth_header,
        )
        assert resp.status_code == 409

    async def test_create_intent_unauthenticated(self, client):
        resp = await client.post(
            "/api/payments/create-intent",
            json={"order_id": "ord1"},
        )
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestWebhook:
    @patch("app.api.payments.get_payment_provider", _mock_provider)
    async def test_webhook_updates_payment(self, client, auth_header, seed_order):
        # First create a payment
        await client.post(
            "/api/payments/create-intent",
            json={"order_id": seed_order},
            headers=auth_header,
        )
        # Then simulate webhook
        resp = await client.post(
            "/api/payments/webhook",
            content=b'{"type":"payment_intent.succeeded"}',
            headers={"stripe-signature": "valid_sig"},
        )
        assert resp.status_code == 200
        assert resp.json()["payment_status"] == "succeeded"

    async def test_webhook_invalid_signature(self, client):
        with patch("app.api.payments.get_payment_provider") as mock:
            provider = MagicMock()
            provider.verify_webhook.side_effect = ValueError("bad sig")
            mock.return_value = provider
            resp = await client.post(
                "/api/payments/webhook",
                content=b"{}",
                headers={"stripe-signature": "bad"},
            )
            assert resp.status_code == 400


@pytest.mark.asyncio
class TestGetPayment:
    @patch("app.api.payments.get_payment_provider", _mock_provider)
    async def test_get_payment_success(self, client, auth_header, seed_order):
        await client.post(
            "/api/payments/create-intent",
            json={"order_id": seed_order},
            headers=auth_header,
        )
        resp = await client.get(f"/api/payments/{seed_order}", headers=auth_header)
        assert resp.status_code == 200
        assert resp.json()["order_id"] == seed_order

    async def test_get_payment_not_found(self, client, auth_header):
        resp = await client.get("/api/payments/nope", headers=auth_header)
        assert resp.status_code == 404
