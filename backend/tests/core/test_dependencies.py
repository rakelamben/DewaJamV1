"""
Unit test untuk app/core/dependencies.py.

Mencakup:
- require_role: ValueError saat inisialisasi dengan role tidak valid
- get_current_user: 401 tanpa header, token expired, token invalid
- resolve_role: mapping personnel_type dan entity_type ke role sistem

Requirements: 3.2, 3.3, 4.1, 4.4
"""

import time
from unittest.mock import MagicMock

import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.dependencies import (
    VALID_ROLES,
    Personnel,
    Staff,
    UserProfile,
    get_current_user,
    require_role,
    resolve_role,
)
from app.core.errors import global_exception_handler, http_exception_handler

# ---------------------------------------------------------------------------
# Konstanta test
# ---------------------------------------------------------------------------

TEST_JWT_SECRET = "test-secret-key-for-testing-only"
TEST_USER_UUID = "11111111-1111-1111-1111-111111111111"


# ---------------------------------------------------------------------------
# Helper: minimal FastAPI app untuk test get_current_user via HTTP
# ---------------------------------------------------------------------------


def _make_test_app() -> FastAPI:
    """Buat app minimal dengan endpoint yang memerlukan get_current_user."""
    test_app = FastAPI()

    # Daftarkan exception handler yang sama dengan app produksi
    # agar format error response konsisten ({"error": {"code": ..., ...}})
    test_app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    test_app.add_exception_handler(Exception, global_exception_handler)

    @test_app.get("/me")
    async def me(user: dict = Depends(get_current_user)):
        return user

    return test_app


# ---------------------------------------------------------------------------
# Tests: require_role
# ---------------------------------------------------------------------------


class TestRequireRole:
    """Test validasi role pada require_role factory."""

    def test_valid_roles_tidak_raise(self):
        """Semua role valid tidak memunculkan exception saat inisialisasi."""
        for role in VALID_ROLES:
            # Tidak boleh raise ValueError
            dep = require_role(role)
            assert callable(dep)

    def test_semua_valid_roles_sekaligus(self):
        """Kombinasi beberapa role valid tidak raise."""
        dep = require_role("kasir", "manager", "admin")
        assert callable(dep)

    def test_role_tidak_valid_raise_value_error(self):
        """Role yang tidak ada di VALID_ROLES harus raise ValueError."""
        with pytest.raises(ValueError, match="Role tidak valid"):
            require_role("superuser")

    def test_role_typo_raise_value_error(self):
        """Typo pada nama role harus raise ValueError."""
        with pytest.raises(ValueError, match="Role tidak valid"):
            require_role("Kasir")  # huruf kapital

    def test_role_kosong_string_raise_value_error(self):
        """String kosong bukan role valid."""
        with pytest.raises(ValueError, match="Role tidak valid"):
            require_role("")

    def test_role_campuran_valid_tidak_valid_raise_value_error(self):
        """Jika satu role tidak valid di antara yang valid, tetap raise."""
        with pytest.raises(ValueError, match="Role tidak valid"):
            require_role("kasir", "bukan_role")


# ---------------------------------------------------------------------------
# Tests: get_current_user via HTTP (TestClient)
# ---------------------------------------------------------------------------


class TestGetCurrentUserHTTP:
    """Test get_current_user melalui HTTP endpoint menggunakan TestClient."""

    @pytest.fixture()
    def client(self):
        app = _make_test_app()
        return TestClient(app, raise_server_exceptions=False)

    def test_tanpa_header_authorization_returns_401(self, client):
        """Request tanpa header Authorization harus mengembalikan 401."""
        response = client.get("/me")
        assert response.status_code == 401
        body = response.json()
        assert body["error"]["code"] == "unauthorized"

    def test_token_expired_returns_401(self, client):
        """Token JWT yang sudah kedaluwarsa harus mengembalikan 401."""
        expired_token = jwt.encode(
            {"sub": TEST_USER_UUID, "exp": time.time() - 3600},
            TEST_JWT_SECRET,
            algorithm="HS256",
        )
        response = client.get(
            "/me", headers={"Authorization": f"Bearer {expired_token}"}
        )
        assert response.status_code == 401
        body = response.json()
        assert body["error"]["code"] == "unauthorized"

    def test_token_invalid_signature_returns_401(self, client):
        """Token dengan signature tidak valid harus mengembalikan 401."""
        invalid_token = (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
            ".eyJzdWIiOiJ1c2VyLXV1aWQifQ"
            ".invalid_signature_here"
        )
        response = client.get(
            "/me", headers={"Authorization": f"Bearer {invalid_token}"}
        )
        assert response.status_code == 401
        body = response.json()
        assert body["error"]["code"] == "unauthorized"

    def test_token_malformed_returns_401(self, client):
        """Token yang tidak bisa di-decode sama sekali harus mengembalikan 401."""
        response = client.get("/me", headers={"Authorization": "Bearer bukantoken"})
        assert response.status_code == 401

    def test_header_bearer_tanpa_token_returns_401(self, client):
        """Header 'Bearer ' tanpa token harus mengembalikan 401."""
        # Token kosong setelah Bearer masih masuk sebagai string kosong
        # jwt.decode akan fail → 401
        response = client.get("/me", headers={"Authorization": "Bearer "})
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Tests: resolve_role
# ---------------------------------------------------------------------------


class TestResolveRole:
    """Test pemetaan entity_type / personnel_type ke role sistem."""

    def _make_profile(self, entity_type: str, entity_id: str = TEST_USER_UUID):
        profile = MagicMock(spec=UserProfile)
        profile.entity_type = entity_type
        profile.entity_id = entity_id
        return profile

    def _make_personnel(self, personnel_type: str):
        personnel = MagicMock(spec=Personnel)
        personnel.personnel_type = personnel_type
        return personnel

    def _make_staff(self, role: str):
        staff = MagicMock(spec=Staff)
        staff.role = role
        return staff

    # --- customer ---

    def test_customer_returns_customer(self):
        """entity_type='customer' harus mengembalikan 'customer'."""
        mock_db = MagicMock()
        profile = self._make_profile("customer")
        assert resolve_role(mock_db, profile) == "customer"

    def test_customer_tidak_query_db(self):
        """Untuk customer, resolve_role tidak boleh menyentuh database."""
        mock_db = MagicMock()
        profile = self._make_profile("customer")
        resolve_role(mock_db, profile)
        mock_db.query.assert_not_called()

    # --- admin ---

    def test_personnel_type_admin_returns_admin(self):
        """personnel_type='admin' harus mengembalikan 'admin'."""
        mock_db = MagicMock()
        profile = self._make_profile("personnel")
        personnel = self._make_personnel("admin")
        mock_db.query.return_value.filter.return_value.first.return_value = personnel

        assert resolve_role(mock_db, profile) == "admin"

    # --- manager ---

    def test_personnel_type_manager_returns_manager(self):
        """personnel_type='manager' harus mengembalikan 'manager'."""
        mock_db = MagicMock()
        profile = self._make_profile("personnel")
        personnel = self._make_personnel("manager")
        mock_db.query.return_value.filter.return_value.first.return_value = personnel

        assert resolve_role(mock_db, profile) == "manager"

    # --- kasir ---

    def test_staff_operasional_returns_kasir(self):
        """personnel_type='staff' + role='staf_operasional' → 'kasir'."""
        mock_db = MagicMock()
        profile = self._make_profile("personnel")
        personnel = self._make_personnel("staff")
        staff = self._make_staff("staf_operasional")

        # Query pertama (Personnel), kedua (Staff)
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            personnel,
            staff,
        ]

        assert resolve_role(mock_db, profile) == "kasir"

    # --- gudang ---

    def test_staff_gudang_returns_gudang(self):
        """personnel_type='staff' + role='staf_gudang' → 'gudang'."""
        mock_db = MagicMock()
        profile = self._make_profile("personnel")
        personnel = self._make_personnel("staff")
        staff = self._make_staff("staf_gudang")

        mock_db.query.return_value.filter.return_value.first.side_effect = [
            personnel,
            staff,
        ]

        assert resolve_role(mock_db, profile) == "gudang"

    # --- edge cases ---

    def test_personnel_tidak_ditemukan_raises_403(self):
        """Jika personnel tidak ditemukan di DB, harus raise HTTPException 403."""
        from fastapi import HTTPException

        mock_db = MagicMock()
        profile = self._make_profile("personnel")
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            resolve_role(mock_db, profile)

        assert exc_info.value.status_code == 403

    def test_personnel_type_tidak_valid_raises_403(self):
        """personnel_type yang tidak dikenali harus raise HTTPException 403."""
        from fastapi import HTTPException

        mock_db = MagicMock()
        profile = self._make_profile("personnel")
        personnel = self._make_personnel("unknown_type")
        mock_db.query.return_value.filter.return_value.first.return_value = personnel

        with pytest.raises(HTTPException) as exc_info:
            resolve_role(mock_db, profile)

        assert exc_info.value.status_code == 403
