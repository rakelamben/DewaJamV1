"""Product catalog SQLAlchemy models."""

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID

from app.core.database import Base

VALID_CATEGORIES = (
    "Jam Tangan Pria",
    "Jam Tangan Wanita",
    "Jam Tangan Anak-anak",
    "Smartwatch",
    "Jam Tangan Luxury",
    "Strap & Aksesoris",
)


class Product(Base):
    """
    Model produk pada schema toko_jam.
    """

    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint(
            f"kategori IN {tuple(VALID_CATEGORIES)}",
            name="products_kategori_check",
        ),
        {"schema": "toko_jam"},
    )

    product_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    nama_barang = Column(String, nullable=False)
    brand = Column(String(120), nullable=True)
    kategori = Column(String, nullable=False)
    harga = Column(Numeric(12, 2), nullable=False)
    stok = Column(Integer, nullable=False, server_default=text("0"))
    deskripsi = Column(Text, nullable=True)
    gambar_url = Column(Text, nullable=True)
    tags = Column(
        ARRAY(String),
        nullable=False,
        server_default=text("'{}'::text[]"),
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
