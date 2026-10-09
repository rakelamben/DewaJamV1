import os
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import MetaData, create_engine, pool

# Auto-load .env dari direktori backend/ (satu level di atas migrations/)
try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path=_env_path, override=False)
except ImportError:
    pass  # python-dotenv tidak tersedia, gunakan env var yang sudah di-set manual

# ---------------------------------------------------------------------------
# Alembic Config object — provides access to values in alembic.ini
# ---------------------------------------------------------------------------
config = context.config

# Set up Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---------------------------------------------------------------------------
# target_metadata: gunakan Base dari app.core.database jika sudah ada.
# Fallback ke MetaData kosong agar env.py tidak crash sebelum task 3.2 selesai.
# ---------------------------------------------------------------------------
try:
    from app.core.database import Base  # noqa: F401 — diimport untuk side-effects

    target_metadata = Base.metadata
except ImportError:
    # app/core/database.py belum dibuat (akan dibuat di task 3.2).
    # Gunakan MetaData kosong sebagai placeholder.
    target_metadata = MetaData()

# ---------------------------------------------------------------------------
# URL database dibaca dari environment variable, bukan dari alembic.ini.
# Ini memastikan secret tidak tersimpan di file konfigurasi yang di-commit.
# ---------------------------------------------------------------------------


def _get_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "Environment variable DATABASE_URL harus di-set "
            "sebelum menjalankan Alembic."
        )
    return url


# ---------------------------------------------------------------------------
# Offline mode — generate SQL script tanpa koneksi DB aktif
# ---------------------------------------------------------------------------


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    Menghasilkan SQL script yang bisa dijalankan secara manual.
    URL dibaca dari environment variable DATABASE_URL.
    """
    url = _get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        # Set search_path ke schema toko_jam
        version_table_schema="toko_jam",
    )

    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online mode — koneksi DB aktif
# ---------------------------------------------------------------------------


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    Membuat Engine dari DATABASE_URL (env var) dan menjalankan migrasi
    langsung ke database. search_path dikonfigurasi ke schema toko_jam.
    """
    url = _get_url()

    connectable = create_engine(
        url,
        poolclass=pool.NullPool,
        # Set search_path ke toko_jam agar DDL default ke schema yang benar
        connect_args={},
        execution_options={"schema_translate_map": None},
    )

    with connectable.connect() as connection:
        # Set search_path secara eksplisit di level koneksi
        connection.exec_driver_sql("SET search_path TO toko_jam, public")

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            version_table_schema="toko_jam",
        )

        with context.begin_transaction():
            context.run_migrations()
        connection.commit()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
