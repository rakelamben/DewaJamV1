"""Model domain inti lintas modul untuk sistem Dewa Jam.

Mendefinisikan entitas yang perlu diakses oleh berbagai modul tanpa
melanggar batasan arsitektur (Core tidak mengimpor dari Modules).
"""

from sqlalchemy import Column, DateTime, String, func, text
from sqlalchemy.dialects.postgresql import UUID

from .database import Base


class Customer(Base):
    """
    Pembeli — memetakan ke tabel toko_jam.customers di Supabase.

    Model ini tidak membuat tabel; hanya memetakan ke tabel yang sudah ada.
    """

    __tablename__ = "customers"
    __table_args__ = {"schema": "toko_jam"}

    customer_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    nama = Column(String, nullable=False)
    no_hp = Column(String, nullable=False, unique=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
