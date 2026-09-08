"""
Integration Tests — Admin Operator Management Routes
Tests RBAC, operator creation, listing, status modification, and password reset.
"""
import pytest
from httpx import AsyncClient
from app.db.models import User


async def get_auth_token(client: AsyncClient, employee_id: str, password: str) -> str:
    res = await client.post(
        "/api/auth/login",
        json={"employee_id": employee_id, "password": password},
    )
    return res.json()["data"]["access_token"]


@pytest.mark.asyncio
async def test_admin_create_operator_success(
    client: AsyncClient, seed_admin: User
):
    token = await get_auth_token(client, seed_admin.employee_id, "AdminSecurePass123!")

    payload = {
        "employee_id": "OIL-OP-5000",
        "email": "op5000@polaris-oil.internal",
        "full_name": "New Field Operator",
        "password": "StrongPassword99!",
    }

    response = await client.post(
        "/api/admin/operators",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["employee_id"] == "OIL-OP-5000"
    assert data["role"] == "OPERATOR"
    assert data["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_operator_forbidden_from_admin_endpoints(
    client: AsyncClient, seed_operator: User
):
    token = await get_auth_token(client, seed_operator.employee_id, "OperatorPass123!")

    response = await client.get(
        "/api/admin/operators",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_admin_list_operators(
    client: AsyncClient, seed_admin: User, seed_operator: User
):
    token = await get_auth_token(client, seed_admin.employee_id, "AdminSecurePass123!")

    response = await client.get(
        "/api/admin/operators",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    items = response.json()["data"]
    assert any(item["employee_id"] == seed_operator.employee_id for item in items)


@pytest.mark.asyncio
async def test_admin_suspend_operator(
    client: AsyncClient, seed_admin: User, seed_operator: User
):
    token = await get_auth_token(client, seed_admin.employee_id, "AdminSecurePass123!")

    response = await client.patch(
        f"/api/admin/operators/{seed_operator.id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "DISABLED"},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


@pytest.mark.asyncio
async def test_admin_reset_operator_password(
    client: AsyncClient, seed_admin: User, seed_operator: User
):
    token = await get_auth_token(client, seed_admin.employee_id, "AdminSecurePass123!")

    new_password = "BrandNewSecurePassword123!"
    response = await client.post(
        f"/api/admin/operators/{seed_operator.id}/reset-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"new_password": new_password},
    )
    assert response.status_code == 200

    # Verify that the operator can log in with the new password
    login_res = await client.post(
        "/api/auth/login",
        json={
            "employee_id": seed_operator.employee_id,
            "password": new_password,
        },
    )
    assert login_res.status_code == 200
