"""SQLAlchemy models for online orders."""

import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = {"schema": "toko_jam"}

    transaction_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    no_invoice = Column(String, nullable=False, unique=True)
    customer_id = Column(
        UUID(as_uuid=True), ForeignKey("toko_jam.customers.customer_id"), nullable=False
    )
    tanggal_transaksi = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    total_harga = Column(Numeric(12, 2), nullable=False, server_default="0")
    status = Column(String, nullable=False, server_default="selesai")
    personnel_id = Column(UUID(as_uuid=True), nullable=True)
    channel = Column(String(20), nullable=False, server_default="pos")
    order_status = Column(String(30), nullable=False, server_default="pending")
    payment_status = Column(String(30), nullable=False, server_default="unpaid")
    payment_method = Column(String(50), nullable=True)
    fulfillment_method = Column(String(20), nullable=True)
    subtotal = Column(Numeric(12, 2), nullable=False, server_default="0")
    shipping_fee = Column(Numeric(12, 2), nullable=False, server_default="0")
    paid_amount = Column(Numeric(12, 2), nullable=True)
    change_amount = Column(Numeric(12, 2), nullable=True)


class TransactionItem(Base):
    __tablename__ = "transaction_items"
    __table_args__ = {"schema": "toko_jam"}

    item_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    transaction_id = Column(
        UUID(as_uuid=True),
        ForeignKey("toko_jam.transactions.transaction_id"),
        nullable=False,
    )
    product_id = Column(
        UUID(as_uuid=True), ForeignKey("toko_jam.products.product_id"), nullable=True
    )
    nama_barang_snapshot = Column(String, nullable=False)
    harga_satuan = Column(Numeric(12, 2), nullable=False)
    qty = Column(Integer, nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)
