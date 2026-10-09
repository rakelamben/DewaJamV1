"""SQLAlchemy model for delivery and pickup fulfillment."""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Fulfillment(Base):
    __tablename__ = "fulfillments"
    __table_args__ = {"schema": "toko_jam"}

    fulfillment_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    transaction_id = Column(
        UUID(as_uuid=True),
        ForeignKey("toko_jam.transactions.transaction_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    store_id = Column(
        UUID(as_uuid=True), ForeignKey("toko_jam.stores.store_id"), nullable=True
    )
    shipping_method = Column(String(50), nullable=True)
    method = Column(String(20), nullable=False)
    status = Column(String(30), nullable=False, server_default="pending")
    recipient_name = Column(String(150), nullable=True)
    recipient_phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    distance_km = Column(Numeric(10, 2), nullable=True)
    rate_per_km = Column(Numeric(12, 2), nullable=True)
    shipping_fee = Column(Numeric(12, 2), nullable=False, server_default="0")
    tracking_number = Column(String(120), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
