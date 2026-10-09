"""Tests for Product Catalog endpoints (/api/v1/tps/catalog/products and upload)."""

import io
import time
import uuid
from decimal import Decimal
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.main import app
from app.modules.tps.catalog.models import Product

TEST_JWT_SECRET = "test-secret-key-for-testing-only"
TEST_ADMIN_USER_ID = "11111111-1111-1111-1111-111111111111"
TEST_CUSTOMER_USER_ID = "22222222-2222-2222-2222-222222222222"


def _make_admin_user():
    return {
        "auth_user_id": uuid.UUID(TEST_ADMIN_USER_ID),
        "entity_type": "personnel",
        "entity_id": uuid.UUID(TEST_ADMIN_USER_ID),
        "role": "admin",
        "email": "admin@dewajam.com",
    }


def _make_customer_user():
    return {
        "auth_user_id": uuid.UUID(TEST_CUSTOMER_USER_ID),
        "entity_type": "customer",
        "entity_id": uuid.UUID(TEST_CUSTOMER_USER_ID),
        "role": "customer",
        "email": "customer@dewajam.com",
    }


@pytest.fixture
def mock_db():
    db = MagicMock()
    app.dependency_overrides[get_db] = lambda: db
    yield db
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# GET /api/v1/tps/catalog/products (Public)
# ---------------------------------------------------------------------------


def test_list_products_empty(client: TestClient, mock_db):
    mock_db.scalar.return_value = 0
    mock_db.scalars.return_value.all.return_value = []

    response = client.get("/api/v1/tps/catalog/products")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


def test_list_products_with_filter(client: TestClient, mock_db):
    product_mock = Product(
        product_id=uuid.uuid4(),
        nama_barang="Rolex Submariner Date",
        kategori="Jam Tangan Luxury",
        harga=Decimal("150000000"),
        stok=2,
        deskripsi="Jam tangan luxury mewah",
        gambar_url="https://example.com/rolex.png",
        tags=["luxury", "water resistant 300m"],
    )
    product_mock.created_at = "2024-01-01T00:00:00Z"

    mock_db.scalar.return_value = 1
    mock_db.scalars.return_value.all.return_value = [product_mock]

    response = client.get("/api/v1/tps/catalog/products?kategori=Jam%20Tangan%20Luxury&tag=luxury")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["nama_barang"] == "Rolex Submariner Date"
    assert data["items"][0]["kategori"] == "Jam Tangan Luxury"
    assert "luxury" in data["items"][0]["tags"]


# ---------------------------------------------------------------------------
# GET /api/v1/tps/catalog/products/{product_id}
# ---------------------------------------------------------------------------


def test_get_product_not_found(client: TestClient, mock_db):
    mock_db.scalar.return_value = None
    random_id = str(uuid.uuid4())

    response = client.get(f"/api/v1/tps/catalog/products/{random_id}")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_get_product_success(client: TestClient, mock_db):
    p_id = uuid.uuid4()
    product_mock = Product(
        product_id=p_id,
        nama_barang="Casio G-Shock GA-2100",
        kategori="Jam Tangan Pria",
        harga=Decimal("1750000"),
        stok=15,
        deskripsi="Tough solar, carbon core guard",
        gambar_url="https://example.com/gshock.png",
        tags=["shock resist", "water resistant 200m"],
    )
    product_mock.created_at = "2024-01-01T00:00:00Z"
    mock_db.scalar.return_value = product_mock

    response = client.get(f"/api/v1/tps/catalog/products/{p_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["nama_barang"] == "Casio G-Shock GA-2100"
    assert data["kategori"] == "Jam Tangan Pria"
    assert float(data["harga"]) == 1750000.0


# ---------------------------------------------------------------------------
# POST /api/v1/tps/catalog/products (Requires Admin / Manager)
# ---------------------------------------------------------------------------


def test_create_product_forbidden_for_customer(client: TestClient):
    app.dependency_overrides[get_current_user] = _make_customer_user
    try:
        response = client.post(
            "/api/v1/tps/catalog/products",
            json={
                "nama_barang": "Apple Watch Series 9",
                "kategori": "Smartwatch",
                "harga": 6999000,
                "stok": 10,
                "tags": ["smartwatch", "gps"],
            },
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_create_product_invalid_category(client: TestClient):
    app.dependency_overrides[get_current_user] = _make_admin_user
    try:
        response = client.post(
            "/api/v1/tps/catalog/products",
            json={
                "nama_barang": "Jam Dinding Kuno",
                "kategori": "Jam Dinding",  # Not in the 6 categories!
                "harga": 250000,
                "stok": 5,
            },
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_create_product_success(client: TestClient, mock_db):
    app.dependency_overrides[get_current_user] = _make_admin_user
    try:
        payload = {
            "nama_barang": "Seiko 5 Sports SRPD55",
            "kategori": "Jam Tangan Pria",
            "harga": 3200000,
            "stok": 8,
            "deskripsi": "Automatic mechanical watch",
            "gambar_url": "https://example.com/seiko.png",
            "tags": ["automatic", "include strap cadangan", "garansi resmi 1 tahun"],
        }

        # Mocking add and refresh
        def fake_refresh(obj):
            if not getattr(obj, "product_id", None):
                obj.product_id = uuid.uuid4()
            if not getattr(obj, "created_at", None):
                obj.created_at = "2024-01-01T00:00:00Z"

        mock_db.refresh.side_effect = fake_refresh

        response = client.post("/api/v1/tps/catalog/products", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["nama_barang"] == payload["nama_barang"]
        assert data["kategori"] == payload["kategori"]
        assert "include strap cadangan" in data["tags"]
        assert mock_db.commit.called
    finally:
        app.dependency_overrides.pop(get_current_user, None)


# ---------------------------------------------------------------------------
# POST /api/v1/tps/catalog/upload-image
# ---------------------------------------------------------------------------


def test_upload_image_invalid_extension(client: TestClient):
    app.dependency_overrides[get_current_user] = _make_admin_user
    try:
        file_content = b"%PDF-1.4 test document"
        files = {"file": ("manual.pdf", io.BytesIO(file_content), "application/pdf")}

        response = client.post("/api/v1/tps/catalog/upload-image", files=files)
        assert response.status_code == 400
        assert "Format gambar tidak didukung" in response.json()["error"]["message"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_upload_image_success(client: TestClient, tmp_path):
    app.dependency_overrides[get_current_user] = _make_admin_user
    try:
        file_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
        files = {"file": ("watch.png", io.BytesIO(file_content), "image/png")}

        with patch("app.modules.tps.catalog.service.UPLOAD_DIR", tmp_path):
            response = client.post("/api/v1/tps/catalog/upload-image", files=files)
            assert response.status_code == 200
            data = response.json()
            assert data["url"].startswith("/static/uploads/products/")
            assert data["filename"].endswith(".png")
    finally:
        app.dependency_overrides.pop(get_current_user, None)
