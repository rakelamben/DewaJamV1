"""Tests untuk endpoint modul Auth (/api/v1/auth/me dan /api/v1/auth/register).

Requirements: 1.1-1.5, 2.1-2.8
"""

import time
import uuid
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.dependencies import UserProfile
from app.core.models import Customer
from app.main import app

TEST_JWT_SECRET = "test-secret-key-for-testing-only"
TEST_AUTH_USER_ID = "550e8400-e29b-41d4-a716-446655440000"
TEST_CUSTOMER_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"


def _make_jwt(sub: str, exp_delta: int = 3600) -> str:
    payload = {"sub": sub, "exp": int(time.time()) + exp_delta}
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


@pytest.fixture
def mock_db():
    db = MagicMock()
    app.dependency_overrides[get_db] = lambda: db
    yield db
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# GET /api/v1/auth/me
# ---------------------------------------------------------------------------


def test_me_without_token_returns_401(client: TestClient):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_me_expired_token_returns_401(client: TestClient):
    token = _make_jwt(TEST_AUTH_USER_ID, exp_delta=-100)
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert "kedaluwarsa" in response.json()["error"]["message"]


def test_me_unregistered_user_returns_403(client: TestClient, mock_db):
    token = _make_jwt(TEST_AUTH_USER_ID)
    # mock_db query returns None
    mock_db.query.return_value.filter.return_value.first.return_value = None

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_me_valid_customer_returns_200(client: TestClient, mock_db):
    token = _make_jwt(TEST_AUTH_USER_ID)

    profile = UserProfile(
        auth_user_id=uuid.UUID(TEST_AUTH_USER_ID),
        entity_type="customer",
        entity_id=uuid.UUID(TEST_CUSTOMER_ID),
    )
    mock_db.query.return_value.filter.return_value.first.return_value = profile

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["auth_user_id"] == TEST_AUTH_USER_ID
    assert data["role"] == "customer"
    assert data["entity_type"] == "customer"
    assert data["entity_id"] == TEST_CUSTOMER_ID


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------


def test_register_without_token_returns_401(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "auth_user_id": TEST_AUTH_USER_ID,
            "nama": "Budi Santoso",
            "no_hp": "+6281234567890",
        },
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_register_mismatched_sub_returns_403(client: TestClient):
    token = _make_jwt("11111111-1111-1111-1111-111111111111")
    response = client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "auth_user_id": TEST_AUTH_USER_ID,
            "nama": "Budi Santoso",
            "no_hp": "+6281234567890",
        },
    )
    assert response.status_code == 403
    assert "tidak sesuai dengan token" in response.json()["error"]["message"]


def test_register_duplicate_account_returns_409(client: TestClient, mock_db):
    token = _make_jwt(TEST_AUTH_USER_ID)
    existing_profile = UserProfile(
        auth_user_id=uuid.UUID(TEST_AUTH_USER_ID),
        entity_type="customer",
        entity_id=uuid.UUID(TEST_CUSTOMER_ID),
    )

    with patch(
        "app.modules.auth.service.get_user_profile_by_auth_id",
        return_value=existing_profile,
    ):
        response = client.post(
            "/api/v1/auth/register",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "auth_user_id": TEST_AUTH_USER_ID,
                "nama": "Budi Santoso",
                "no_hp": "+6281234567890",
            },
        )
    assert response.status_code == 409
    assert "Akun sudah terdaftar" in response.json()["error"]["message"]


def test_register_duplicate_phone_returns_409(client: TestClient, mock_db):
    token = _make_jwt(TEST_AUTH_USER_ID)
    existing_customer = Customer(
        customer_id=uuid.UUID(TEST_CUSTOMER_ID),
        nama="User Lain",
        no_hp="+6281234567890",
    )

    with patch(
        "app.modules.auth.service.get_user_profile_by_auth_id",
        return_value=None,
    ), patch(
        "app.modules.auth.service.get_customer_by_phone",
        return_value=existing_customer,
    ):
        response = client.post(
            "/api/v1/auth/register",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "auth_user_id": TEST_AUTH_USER_ID,
                "nama": "Budi Santoso",
                "no_hp": "+6281234567890",
            },
        )
    assert response.status_code == 409
    assert "Nomor HP sudah terdaftar" in response.json()["error"]["message"]


def test_register_invalid_name_whitespace_returns_422(client: TestClient):
    token = _make_jwt(TEST_AUTH_USER_ID)
    response = client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "auth_user_id": TEST_AUTH_USER_ID,
            "nama": "   ",
            "no_hp": "+6281234567890",
        },
    )
    assert response.status_code == 422


def test_register_invalid_phone_returns_422(client: TestClient):
    token = _make_jwt(TEST_AUTH_USER_ID)
    response = client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "auth_user_id": TEST_AUTH_USER_ID,
            "nama": "Budi",
            "no_hp": "invalid-phone",
        },
    )
    assert response.status_code == 422


def test_register_success_returns_201(client: TestClient, mock_db):
    token = _make_jwt(TEST_AUTH_USER_ID)
    created_customer = Customer(
        customer_id=uuid.UUID(TEST_CUSTOMER_ID),
        nama="Budi Santoso",
        no_hp="+6281234567890",
    )
    created_profile = UserProfile(
        auth_user_id=uuid.UUID(TEST_AUTH_USER_ID),
        entity_type="customer",
        entity_id=uuid.UUID(TEST_CUSTOMER_ID),
    )

    with patch(
        "app.modules.auth.service.get_user_profile_by_auth_id",
        return_value=None,
    ), patch(
        "app.modules.auth.service.get_customer_by_phone",
        return_value=None,
    ), patch(
        "app.modules.auth.service.create_customer_and_profile_with_audit",
        return_value=(created_customer, created_profile),
    ) as mock_create:
        response = client.post(
            "/api/v1/auth/register",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "auth_user_id": TEST_AUTH_USER_ID,
                "nama": "Budi Santoso",
                "no_hp": "+6281234567890",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["customer_id"] == TEST_CUSTOMER_ID
        assert data["auth_user_id"] == TEST_AUTH_USER_ID
        assert data["role"] == "customer"
        assert mock_create.called
