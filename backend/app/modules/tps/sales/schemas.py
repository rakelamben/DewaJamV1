"""Pydantic contracts for order preview, creation and mock payment."""

from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.tps.fulfillment.schemas import ShippingAddress


class OrderItemRequest(BaseModel):
    product_id: UUID
    qty: int = Field(..., ge=1)


class OrderRequest(BaseModel):
    source: Literal["cart", "buy_now"] = "cart"
    channel: Literal["marketplace", "inplace"]
    items: list[OrderItemRequest] = Field(default_factory=list)
    cart_item_ids: list[UUID] = Field(default_factory=list)
    fulfillment_method: Literal["delivery", "pickup"]
    shipping_address: ShippingAddress | None = None
    address_id: UUID | None = None
    store_id: UUID | None = None
    shipping_method: str | None = Field(default=None, max_length=50)


class OrderPreviewResponse(BaseModel):
    items: list[OrderItemRequest] = Field(default_factory=list)
    item_names: list[str] = Field(default_factory=list)
    subtotal: Decimal
    distance_km: Decimal | None
    rate_per_km: Decimal | None
    shipping_fee: Decimal
    total_harga: Decimal
    fulfillment_method: str
    shipping_method: str | None = None
    store_id: UUID | None = None


class OrderResponse(OrderPreviewResponse):
    transaction_id: UUID
    no_invoice: str
    channel: str
    order_status: str
    payment_status: str


class PaymentRequest(BaseModel):
    payment_method: Literal["virtual_account", "e_wallet", "store_payment"] = "virtual_account"
