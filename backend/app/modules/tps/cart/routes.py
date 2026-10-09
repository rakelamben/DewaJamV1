"""HTTP endpoints for authenticated Marketplace carts."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user

from . import service
from .schemas import CartItemUpdate, CartItemUpsert, CartMergeRequest, CartResponse

router = APIRouter()
CurrentUser = Annotated[dict, Depends(get_current_user)]


@router.get("", response_model=CartResponse)
def get_cart(current_user: CurrentUser, db: Session = Depends(get_db)):
    return service.get_cart(db, current_user)


@router.post("/items", response_model=CartResponse, status_code=status.HTTP_200_OK)
def add_item(
    payload: CartItemUpsert, current_user: CurrentUser, db: Session = Depends(get_db)
):
    return service.upsert_item(db, current_user, payload.product_id, payload.qty)


@router.patch("/items/{item_id}", response_model=CartResponse)
def update_item(
    item_id: UUID,
    payload: CartItemUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    return service.update_item(db, current_user, item_id, payload.qty)


@router.delete("/items/{item_id}", response_model=CartResponse)
def delete_item(
    item_id: UUID, current_user: CurrentUser, db: Session = Depends(get_db)
):
    return service.delete_item(db, current_user, item_id)


@router.delete("", response_model=CartResponse)
def clear_cart(current_user: CurrentUser, db: Session = Depends(get_db)):
    return service.clear_cart(db, current_user)


@router.post("/merge", response_model=CartResponse)
def merge_cart(
    payload: CartMergeRequest, current_user: CurrentUser, db: Session = Depends(get_db)
):
    return service.merge_cart(db, current_user, payload)
