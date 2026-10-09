"""SQLAlchemy models for customer carts."""

import uuid

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Cart(Base):
    __tablename__ = "carts"
    __table_args__ = {"schema": "toko_jam"}

    cart_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    customer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("toko_jam.customers.customer_id"),
        nullable=False,
        unique=True,
    )
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (
        CheckConstraint("qty > 0", name="cart_items_qty_positive"),
        {"schema": "toko_jam"},
    )

    cart_item_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    cart_id = Column(
        UUID(as_uuid=True),
        ForeignKey("toko_jam.carts.cart_id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id = Column(
        UUID(as_uuid=True), ForeignKey("toko_jam.products.product_id"), nullable=False
    )
    qty = Column(Integer, nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
