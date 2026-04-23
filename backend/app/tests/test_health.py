"""Smoke test – ensure the app starts and Swagger is reachable."""

import pytest


@pytest.mark.asyncio
async def test_openapi_docs(client):
    resp = await client.get("/docs")
    assert resp.status_code == 200
