"""Fulfillment routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user

from .checkout_models import CustomerAddress, Store
from .schemas import (
    CustomerAddressCreate,
    CustomerAddressResponse,
    ShippingQuoteRequest,
    ShippingQuoteResponse,
    StoreResponse,
)
from .service import calculate_shipping_quote

router = APIRouter()


@router.post("/shipping-quote", response_model=ShippingQuoteResponse)
def shipping_quote(payload: ShippingQuoteRequest):
    return calculate_shipping_quote(payload.address)


@router.get("/stores", response_model=list[StoreResponse])
def list_stores(db: Session = Depends(get_db)):
    return list(
        db.scalars(select(Store).where(Store.is_active.is_(True)).order_by(Store.name)).all()
    )


CurrentUser = Annotated[dict, Depends(get_current_user)]


@router.get("/addresses", response_model=list[CustomerAddressResponse])
def list_addresses(current_user: CurrentUser, db: Session = Depends(get_db)):
    customer_id = current_user["entity_id"]
    return list(
        db.scalars(
            select(CustomerAddress)
            .where(CustomerAddress.customer_id == customer_id)
            .order_by(CustomerAddress.is_default.desc(), CustomerAddress.created_at.desc())
        ).all()
    )


@router.post("/addresses", response_model=CustomerAddressResponse, status_code=status.HTTP_201_CREATED)
def create_address(
    payload: CustomerAddressCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    customer_id = current_user["entity_id"]
    if payload.is_default:
        db.execute(
            update(CustomerAddress)
            .where(CustomerAddress.customer_id == customer_id)
            .values(is_default=False)
        )
    address = CustomerAddress(customer_id=customer_id, **payload.model_dump())
    db.add(address)
    db.commit()
    db.refresh(address)
    return address
