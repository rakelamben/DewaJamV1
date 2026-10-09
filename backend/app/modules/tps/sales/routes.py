"""Order and mock-payment HTTP endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user

from . import service
from .schemas import OrderPreviewResponse, OrderRequest, OrderResponse, PaymentRequest
from .pos_schemas import POSCustomerResponse, POSTransactionRequest, POSTransactionResponse
from .pos_service import create_transaction, find_customer
from app.core.dependencies import require_role

router = APIRouter()
CurrentUser = Annotated[dict, Depends(get_current_user)]
POSUser = Annotated[dict, Depends(require_role("kasir", "manager", "admin"))]


@router.get("/pos/customers", response_model=POSCustomerResponse | None)
def get_pos_customer(
    phone: str,
    current_user: POSUser,
    db: Session = Depends(get_db),
):
    customer = find_customer(db, phone)
    return customer


@router.post("/pos/transactions", response_model=POSTransactionResponse, status_code=status.HTTP_201_CREATED)
def create_pos_transaction(
    payload: POSTransactionRequest,
    current_user: POSUser,
    db: Session = Depends(get_db),
):
    return create_transaction(db, current_user, payload)


@router.post("/orders/preview", response_model=OrderPreviewResponse)
def preview(
    payload: OrderRequest, current_user: CurrentUser, db: Session = Depends(get_db)
):
    return service.preview(db, current_user, payload)


@router.post(
    "/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED
)
def create_order(
    payload: OrderRequest, current_user: CurrentUser, db: Session = Depends(get_db)
):
    return service.create_order(db, current_user, payload)


@router.post("/orders/{transaction_id}/pay", response_model=OrderResponse)
def pay(
    transaction_id: UUID,
    payload: PaymentRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    return service.pay(db, current_user, transaction_id, payload.payment_method)
