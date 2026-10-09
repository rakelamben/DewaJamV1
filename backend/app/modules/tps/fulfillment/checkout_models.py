"""Models used by the marketplace checkout flow."""

import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class CustomerAddress(Base):
    __tablename__ = "customer_addresses"
    __table_args__ = {"schema": "toko_jam"}

    address_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    customer_id = Column(UUID(as_uuid=True), ForeignKey("toko_jam.customers.customer_id", ondelete="CASCADE"), nullable=False)
    label = Column(String(60), nullable=False, server_default="Alamat utama")
    recipient_name = Column(String(150), nullable=False)
    recipient_phone = Column(String(50), nullable=False)
    address = Column(Text, nullable=False)
    is_default = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class Store(Base):
    __tablename__ = "stores"
    __table_args__ = {"schema": "toko_jam"}

    store_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    name = Column(String(150), nullable=False)
    address = Column(Text, nullable=False)
    google_maps_url = Column(Text, nullable=False)
    opening_hours = Column(String(150), nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="true")


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = {"schema": "toko_jam"}

    payment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("toko_jam.transactions.transaction_id", ondelete="CASCADE"), nullable=False, unique=True)
    payment_method = Column(String(30), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), nullable=False, server_default="pending")
    reference = Column(String(120), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
