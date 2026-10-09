"""
Konfigurasi pytest global.

Env var wajib di-set SEBELUM modul app diimpor karena main.py
memuat settings di level modul dan akan sys.exit(1) jika ada yang hilang.
"""

import os

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/testdb")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret-key-for-testing-only")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    """TestClient yang terikat ke instance FastAPI aplikasi."""
    return TestClient(app)
