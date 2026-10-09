"""Pydantic contracts for placeholder shipping and fulfillment."""

from decimal import Decimal
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ShippingQuoteRequest(BaseModel):
    address: str = Field(..., min_length=5, max_length=1000)


class ShippingQuoteResponse(BaseModel):
    provider: str
    distance_km: Decimal
    rate_per_km: Decimal
    shipping_fee: Decimal
    estimated_delivery_days: int


class ShippingAddress(BaseModel):
    recipient_name: str = Field(..., min_length=1, max_length=150)
    recipient_phone: str = Field(..., min_length=5, max_length=50)
    address: str = Field(..., min_length=5, max_length=1000)


class FulfillmentResponse(BaseModel):
    method: Literal["delivery", "pickup"]
    status: str
    shipping_fee: Decimal
    distance_km: Decimal | None = None
    tracking_number: str | None = None


class CustomerAddressCreate(BaseModel):
    label: str = Field(default="Alamat utama", min_length=1, max_length=60)
    recipient_name: str = Field(..., min_length=1, max_length=150)
    recipient_phone: str = Field(..., min_length=5, max_length=50)
    address: str = Field(..., min_length=5, max_length=1000)
    is_default: bool = False


class CustomerAddressResponse(CustomerAddressCreate):
    address_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class StoreResponse(BaseModel):
    store_id: UUID
    name: str
    address: str
    google_maps_url: str
    opening_hours: str | None = None

    model_config = {"from_attributes": True}
