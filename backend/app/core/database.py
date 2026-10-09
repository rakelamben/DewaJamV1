"""
Database engine, session factory, dan Base SQLAlchemy untuk Dewa Jam.

Semua model SQLAlchemy yang mewarisi ``Base`` secara otomatis menggunakan
schema ``toko_jam``.
"""

from collections.abc import Generator

from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from .config import settings

# ---------------------------------------------------------------------------
# Engine dan session factory (sync — bukan async)
# ---------------------------------------------------------------------------

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ---------------------------------------------------------------------------
# Base dengan schema toko_jam
# ---------------------------------------------------------------------------

# Base dengan schema toko_jam agar semua model yang mewarisi Base
# secara otomatis menggunakan schema ini.
Base = declarative_base(metadata=MetaData(schema="toko_jam"))


# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yang menyediakan database session per-request.

    Session di-close secara otomatis via ``finally``, baik request berhasil
    maupun gagal.

    Yields:
        Session: SQLAlchemy session yang siap dipakai.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
