"""Contracts for the personnel point-of-sale flow."""

from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class POSItemRequest(BaseModel):
    product_id: UUID
    qty: int = Field(..., ge=1)


class POSTransactionRequest(BaseModel):
    items: list[POSItemRequest] = Field(..., min_length=1)
    customer_phone: str | None = Field(default=None, max_length=50)
    customer_name: str | None = Field(default=None, max_length=150)
    paid_amount: Decimal = Field(..., ge=0)
    payment_method: Literal["cash", "card", "qris"] = "cash"


class POSCustomerResponse(BaseModel):
    customer_id: UUID
    nama: str
    no_hp: str

    model_config = ConfigDict(from_attributes=True)


class POSReceiptItem(BaseModel):
    product_id: UUID
    nama_barang: str
    harga_satuan: Decimal
    qty: int
    subtotal: Decimal


class POSTransactionResponse(BaseModel):
    transaction_id: UUID
    no_invoice: str
    customer_name: str
    customer_phone: str
    items: list[POSReceiptItem]
    subtotal: Decimal
    total_harga: Decimal
    paid_amount: Decimal
    change_amount: Decimal
    payment_method: str
