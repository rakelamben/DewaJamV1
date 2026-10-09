"""
Entry point aplikasi Dewa Jam.

Menginisialisasi FastAPI app menggunakan factory pattern.
Tangkap ValidationError pydantic-settings di level modul sehingga
proses langsung berhenti jika ada env var yang hilang.
"""

import sys
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# ---------------------------------------------------------------------------
# Startup check — gagal cepat jika env var wajib tidak ada
# ---------------------------------------------------------------------------

try:
    from .core.config import settings
except ValidationError as exc:
    missing = [str(err["loc"][0]) for err in exc.errors() if err["type"] == "missing"]
    var_list = ", ".join(missing) if missing else "(lihat detail di atas)"
    print(
        f"ERROR: Variabel environment yang diperlukan tidak ditemukan: {var_list}",
        file=sys.stderr,
    )
    sys.exit(1)

from .core.errors import (  # noqa: E402
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from .core.events import publish  # noqa: E402


def create_app() -> FastAPI:
    """
    Factory yang membuat dan mengkonfigurasi instance FastAPI.

    Returns:
        FastAPI: Instance aplikasi yang siap dijalankan Uvicorn.
    """
    app = FastAPI(
        title="Dewa Jam API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS — izinkan semua origin yang dikonfigurasi
    origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["*"],
    )

    # Exception handlers
    app.add_exception_handler(Exception, global_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    # Health check — tanpa autentikasi
    @app.get("/api/v1/health", tags=["system"])
    async def health_check() -> dict:
        """Kembalikan status operasional backend."""
        return {"status": "ok"}

    # Modul Auth router
    from .modules.auth.routes import router as auth_router

    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])

    # Modul Catalog router
    from .modules.tps.catalog.routes import router as catalog_router

    app.include_router(catalog_router, prefix="/api/v1/tps/catalog", tags=["catalog"])

    from .modules.tps.cart.routes import router as cart_router
    from .modules.tps.fulfillment.routes import router as fulfillment_router
    from .modules.tps.sales.routes import router as sales_router

    app.include_router(cart_router, prefix="/api/v1/tps/cart", tags=["cart"])
    app.include_router(sales_router, prefix="/api/v1/tps/sales", tags=["sales"])
    app.include_router(
        fulfillment_router, prefix="/api/v1/tps/fulfillment", tags=["fulfillment"]
    )

    # Mount static files for uploads
    from pathlib import Path
    from starlette.staticfiles import StaticFiles

    upload_dir = Path("uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/static/uploads", StaticFiles(directory="uploads"), name="uploads")

    # Publikasikan event startup — memverifikasi Event Bus berjalan
    publish(
        "app.started",
        {"timestamp": datetime.now(timezone.utc).isoformat()},
    )

    return app


# Buat instance untuk Uvicorn
app = create_app()
