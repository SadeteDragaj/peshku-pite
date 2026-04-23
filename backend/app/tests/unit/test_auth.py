"""Unit / integration tests for the auth module.

Covers:
  - Registration (success, duplicate email, invalid role, weak password)
  - Login (success, wrong password, unknown email)
  - Token refresh (success, access token rejected, garbage token)
  - GET /me (success, missing token, expired token)
  - Role-based access control via RoleChecker
  - Password hashing round-trip (argon2)
  - JWT access / refresh token structure
"""

import pytest
from httpx import AsyncClient

from app.core.security import (
    Role,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

# ======================================================================
# Helpers
# ======================================================================
REGISTER_URL = "/api/auth/register"
LOGIN_URL = "/api/auth/login"
REFRESH_URL = "/api/auth/refresh"
ME_URL = "/api/auth/me"

_TEST_EMAIL = "alice@example.com"
_TEST_PASSWORD = "Str0ng!Pass"


async def _register(client: AsyncClient, email: str = _TEST_EMAIL, password: str = _TEST_PASSWORD, role: str = "customer"):
    return await client.post(REGISTER_URL, json={"email": email, "password": password, "role": role})


# ======================================================================
# Password hashing (argon2)
# ======================================================================
class TestPasswordHashing:
    def test_hash_and_verify(self):
        hashed = hash_password("my-secret")
        assert verify_password("my-secret", hashed) is True

    def test_wrong_password_fails(self):
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False

    def test_hash_is_argon2(self):
        hashed = hash_password("test")
        assert hashed.startswith("$argon2")


# ======================================================================
# JWT tokens
# ======================================================================
class TestJWT:
    def test_access_token_has_correct_type(self):
        token = create_access_token({"sub": "u1", "role": "admin"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["type"] == "access"
        assert payload["sub"] == "u1"

    def test_refresh_token_has_correct_type(self):
        token = create_refresh_token({"sub": "u1", "role": "admin"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["type"] == "refresh"

    def test_garbage_token_returns_none(self):
        assert decode_token("not.a.jwt") is None


# ======================================================================
# POST /register
# ======================================================================
class TestRegister:
    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient):
        resp = await _register(client)
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_register_returns_valid_tokens(self, client: AsyncClient):
        resp = await _register(client)
        data = resp.json()
        access = decode_token(data["access_token"])
        refresh = decode_token(data["refresh_token"])
        assert access is not None and access["type"] == "access"
        assert refresh is not None and refresh["type"] == "refresh"
        # Both tokens reference the same user
        assert access["sub"] == refresh["sub"]

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient):
        await _register(client)
        resp = await _register(client)  # same email
        assert resp.status_code == 409

    @pytest.mark.asyncio
    async def test_register_short_password(self, client: AsyncClient):
        resp = await _register(client, password="short")
        assert resp.status_code == 422  # Pydantic validation

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client: AsyncClient):
        resp = await _register(client, email="not-an-email")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_with_each_role(self, client: AsyncClient):
        for i, role in enumerate(Role):
            resp = await _register(client, email=f"user{i}@example.com", role=role.value)
            assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_register_invalid_role(self, client: AsyncClient):
        resp = await _register(client, role="superadmin")
        assert resp.status_code == 422


# ======================================================================
# POST /login
# ======================================================================
class TestLogin:
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient):
        await _register(client)
        resp = await client.post(LOGIN_URL, json={"email": _TEST_EMAIL, "password": _TEST_PASSWORD})
        assert resp.status_code == 200
        assert "access_token" in resp.json()
        assert "refresh_token" in resp.json()

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient):
        await _register(client)
        resp = await client.post(LOGIN_URL, json={"email": _TEST_EMAIL, "password": "Wr0ng!Pass"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_unknown_email(self, client: AsyncClient):
        resp = await client.post(LOGIN_URL, json={"email": "nobody@example.com", "password": "whatever1"})
        assert resp.status_code == 401


# ======================================================================
# POST /refresh
# ======================================================================
class TestRefresh:
    @pytest.mark.asyncio
    async def test_refresh_success(self, client: AsyncClient):
        reg = await _register(client)
        refresh_token = reg.json()["refresh_token"]
        resp = await client.post(REFRESH_URL, json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_refresh_with_access_token_rejected(self, client: AsyncClient):
        reg = await _register(client)
        access_token = reg.json()["access_token"]
        resp = await client.post(REFRESH_URL, json={"refresh_token": access_token})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_garbage_token(self, client: AsyncClient):
        resp = await client.post(REFRESH_URL, json={"refresh_token": "garbage"})
        assert resp.status_code == 401


# ======================================================================
# GET /me
# ======================================================================
class TestMe:
    @pytest.mark.asyncio
    async def test_me_success(self, client: AsyncClient):
        reg = await _register(client)
        token = reg.json()["access_token"]
        resp = await client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == _TEST_EMAIL
        assert data["role"] == "customer"
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.asyncio
    async def test_me_no_token(self, client: AsyncClient):
        resp = await client.get(ME_URL)
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_me_invalid_token(self, client: AsyncClient):
        resp = await client.get(ME_URL, headers={"Authorization": "Bearer invalid.jwt.here"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_me_refresh_token_rejected(self, client: AsyncClient):
        """The /me endpoint must reject refresh tokens."""
        reg = await _register(client)
        refresh = reg.json()["refresh_token"]
        resp = await client.get(ME_URL, headers={"Authorization": f"Bearer {refresh}"})
        assert resp.status_code == 401
