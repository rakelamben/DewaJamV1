"""Pydantic contracts for persistent carts."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class CartItemUpsert(BaseModel):
    product_id: UUID
    qty: int = Field(..., ge=1)


class CartItemUpdate(BaseModel):
    qty: int = Field(..., ge=1)


class CartItemResponse(BaseModel):
    cart_item_id: UUID
    product_id: UUID
    nama_barang: str
    brand: str | None = None
    harga: Decimal
    stok_tersedia: int
    qty: int
    subtotal: Decimal
    gambar_url: str | None = None


class CartResponse(BaseModel):
    cart_id: UUID
    items: list[CartItemResponse]
    total_items: int
    subtotal: Decimal
    updated_at: datetime | None = None


class CartMergeItem(BaseModel):
    product_id: UUID
    qty: int = Field(..., ge=1)


class CartMergeRequest(BaseModel):
    items: list[CartMergeItem]
