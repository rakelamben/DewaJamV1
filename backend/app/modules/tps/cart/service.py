"""Business logic for customer-owned Marketplace carts."""

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.errors import ERR_BAD_REQUEST, ERR_NOT_FOUND, error_response

from . import repository
from .schemas import CartItemResponse, CartMergeRequest, CartResponse


def _customer_id(current_user: dict) -> UUID:
    if current_user.get("role") != "customer":
        raise HTTPException(
            status_code=403,
            detail=error_response("forbidden", "Aksi ini hanya untuk customer"),
        )
    return UUID(str(current_user["entity_id"]))


def _response(db: Session, cart) -> CartResponse:
    rows = repository.get_cart_items(db, cart.cart_id)
    items = [
        CartItemResponse(
            cart_item_id=item.cart_item_id,
            product_id=product.product_id,
            nama_barang=product.nama_barang,
            brand=product.brand,
            harga=product.harga,
            stok_tersedia=product.stok,
            qty=item.qty,
            subtotal=Decimal(product.harga) * item.qty,
            gambar_url=product.gambar_url,
        )
        for item, product in rows
    ]
    return CartResponse(
        cart_id=cart.cart_id,
        items=items,
        total_items=sum(item.qty for item in items),
        subtotal=sum((item.subtotal for item in items), Decimal("0")),
        updated_at=cart.updated_at,
    )


def get_cart(db: Session, current_user: dict) -> CartResponse:
    cart = repository.get_or_create_cart(db, _customer_id(current_user))
    db.commit()
    return _response(db, cart)


def upsert_item(
    db: Session, current_user: dict, product_id: UUID, qty: int
) -> CartResponse:
    cart = repository.get_or_create_cart(db, _customer_id(current_user))
    product = repository.get_product(db, product_id)
    if product is None:
        raise HTTPException(
            status_code=404,
            detail=error_response(ERR_NOT_FOUND, "Produk tidak ditemukan"),
        )
    item = repository.get_item(db, cart.cart_id, product_id)
    final_qty = (item.qty if item else 0) + qty
    if product.stok < final_qty:
        raise HTTPException(
            status_code=409,
            detail=error_response(ERR_BAD_REQUEST, "Jumlah melebihi stok tersedia"),
        )
    if item:
        item.qty = final_qty
    else:
        from .models import CartItem

        db.add(CartItem(cart_id=cart.cart_id, product_id=product_id, qty=qty))
    db.commit()
    db.refresh(cart)
    return _response(db, cart)


def update_item(
    db: Session, current_user: dict, item_id: UUID, qty: int
) -> CartResponse:
    cart = repository.get_or_create_cart(db, _customer_id(current_user))
    item = repository.get_item_by_id(db, cart.cart_id, item_id)
    if item is None:
        raise HTTPException(
            status_code=404,
            detail=error_response(ERR_NOT_FOUND, "Item cart tidak ditemukan"),
        )
    product = repository.get_product(db, item.product_id)
    if product is None or product.stok < qty:
        raise HTTPException(
            status_code=409,
            detail=error_response(ERR_BAD_REQUEST, "Jumlah melebihi stok tersedia"),
        )
    item.qty = qty
    db.commit()
    db.refresh(cart)
    return _response(db, cart)


def delete_item(db: Session, current_user: dict, item_id: UUID) -> CartResponse:
    cart = repository.get_or_create_cart(db, _customer_id(current_user))
    item = repository.get_item_by_id(db, cart.cart_id, item_id)
    if item is None:
        raise HTTPException(
            status_code=404,
            detail=error_response(ERR_NOT_FOUND, "Item cart tidak ditemukan"),
        )
    repository.delete_item(db, item)
    db.commit()
    db.refresh(cart)
    return _response(db, cart)


def clear_cart(db: Session, current_user: dict) -> CartResponse:
    cart = repository.get_or_create_cart(db, _customer_id(current_user))
    repository.clear_cart(db, cart.cart_id)
    db.commit()
    db.refresh(cart)
    return _response(db, cart)


def merge_cart(
    db: Session, current_user: dict, payload: CartMergeRequest
) -> CartResponse:
    for item in payload.items:
        upsert_item(db, current_user, item.product_id, item.qty)
    return get_cart(db, current_user)
