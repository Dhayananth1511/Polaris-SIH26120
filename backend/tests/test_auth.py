"""
Integration Tests — Authentication Routes
Tests login, refresh, logout, and user profile endpoints.
"""
import pytest
from httpx import AsyncClient
from app.db.models import User


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, seed_operator: User):
    response = await client.post(
        "/api/auth/login",
        json={
            "employee_id": seed_operator.employee_id,
            "password": "OperatorPass123!",
        },
    )
    assert response.status_code == 200
    res_json = response.json()
    assert "access_token" in res_json["data"]
    assert res_json["user"]["employee_id"] == seed_operator.employee_id
    assert res_json["user"]["role"] == "OPERATOR"
    # Verify refresh token cookie is set
    assert "polaris_rt" in response.cookies


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, seed_operator: User):
    response = await client.post(
        "/api/auth/login",
        json={
            "employee_id": seed_operator.employee_id,
            "password": "WrongPassword999!",
        },
    )
    assert response.status_code == 401
    res_data = response.json()
    assert res_data["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    response = await client.post(
        "/api/auth/login",
        json={
            "employee_id": "NON-EXISTENT-999",
            "password": "SomePassword123!",
        },
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_get_current_user_me(client: AsyncClient, seed_operator: User):
    # Login first
    login_res = await client.post(
        "/api/auth/login",
        json={
            "employee_id": seed_operator.employee_id,
            "password": "OperatorPass123!",
        },
    )
    token = login_res.json()["data"]["access_token"]

    # Call /api/auth/me with Bearer token
    me_res = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    user_data = me_res.json()["user"]
    assert user_data["employee_id"] == seed_operator.employee_id
    assert user_data["role"] == "OPERATOR"


@pytest.mark.asyncio
async def test_me_unauthorized_without_token(client: AsyncClient):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout(client: AsyncClient, seed_operator: User):
    # Login
    login_res = await client.post(
        "/api/auth/login",
        json={
            "employee_id": seed_operator.employee_id,
            "password": "OperatorPass123!",
        },
    )
    token = login_res.json()["data"]["access_token"]
    cookies = login_res.cookies

    # Logout
    logout_res = await client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
        cookies=cookies,
    )
    assert logout_res.status_code == 200
