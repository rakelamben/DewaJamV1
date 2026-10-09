"""Order, stock and placeholder-payment business logic."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import (
    ERR_BAD_REQUEST,
    ERR_FORBIDDEN,
    ERR_NOT_FOUND,
    error_response,
)
from app.modules.tps.cart import repository as cart_repository
from app.modules.tps.fulfillment.models import Fulfillment
from app.modules.tps.fulfillment.checkout_models import CustomerAddress, Payment, Store
from app.modules.tps.catalog.models import Product
from app.modules.tps.fulfillment.service import calculate_shipping_quote

from . import repository
from .models import Transaction, TransactionItem
from .schemas import OrderItemRequest, OrderPreviewResponse, OrderRequest, OrderResponse


def _customer_id(user: dict) -> UUID:
    if user.get("role") != "customer":
        raise HTTPException(
            status_code=403,
            detail=error_response(ERR_FORBIDDEN, "Aksi ini hanya untuk customer"),
        )
    return UUID(str(user["entity_id"]))


def _validate_request(payload: OrderRequest) -> None:
    if payload.channel == "inplace" and payload.fulfillment_method != "pickup":
        raise HTTPException(
            status_code=400,
            detail=error_response(ERR_BAD_REQUEST, "Inplace hanya mendukung pickup"),
        )
    if payload.fulfillment_method == "delivery" and payload.shipping_address is None:
        raise HTTPException(
            status_code=400,
            detail=error_response(ERR_BAD_REQUEST, "Alamat wajib untuk delivery"),
        )
    if payload.source == "buy_now" and not payload.items:
        raise HTTPException(
            status_code=400,
            detail=error_response(ERR_BAD_REQUEST, "Item Buy Now wajib diisi"),
        )


def _items_from_request(
    db: Session, user: dict, payload: OrderRequest
) -> tuple[list[OrderItemRequest], list]:
    if payload.source == "buy_now":
        return payload.items, []
    cart = cart_repository.get_or_create_cart(db, _customer_id(user))
    rows = (
        cart_repository.get_items_by_ids(db, cart.cart_id, payload.cart_item_ids)
        if payload.cart_item_ids
        else cart_repository.get_cart_items(db, cart.cart_id)
    )
    if not rows:
        raise HTTPException(
            status_code=400, detail=error_response(ERR_BAD_REQUEST, "Cart masih kosong")
        )
    if payload.cart_item_ids and len(rows) != len(set(payload.cart_item_ids)):
        raise HTTPException(
            status_code=404,
            detail=error_response(ERR_NOT_FOUND, "Sebagian item cart tidak ditemukan"),
        )
    return [OrderItemRequest(product_id=item.product_id, qty=item.qty) for item, _product in rows], [item for item, _product in rows]


def _resolve_address(db: Session, user: dict, payload: OrderRequest):
    if payload.address_id is None:
        return payload.shipping_address
    address = db.scalar(
        select(CustomerAddress).where(
            CustomerAddress.address_id == payload.address_id,
            CustomerAddress.customer_id == _customer_id(user),
        )
    )
    if address is None:
        raise HTTPException(status_code=404, detail=error_response(ERR_NOT_FOUND, "Alamat tidak ditemukan"))
    from app.modules.tps.fulfillment.schemas import ShippingAddress

    return ShippingAddress(
        recipient_name=address.recipient_name,
        recipient_phone=address.recipient_phone,
        address=address.address,
    )


def _validate_checkout(db: Session, user: dict, payload: OrderRequest):
    if payload.channel != "marketplace":
        raise HTTPException(status_code=400, detail=error_response(ERR_BAD_REQUEST, "Checkout ini hanya untuk marketplace"))
    address = _resolve_address(db, user, payload)
    if payload.fulfillment_method == "delivery" and address is None:
        raise HTTPException(status_code=400, detail=error_response(ERR_BAD_REQUEST, "Alamat wajib untuk delivery"))
    if payload.fulfillment_method == "pickup":
        if payload.store_id is None:
            raise HTTPException(status_code=400, detail=error_response(ERR_BAD_REQUEST, "Toko pickup wajib dipilih"))
        if db.scalar(select(Store).where(Store.store_id == payload.store_id, Store.is_active.is_(True))) is None:
            raise HTTPException(status_code=404, detail=error_response(ERR_NOT_FOUND, "Toko pickup tidak ditemukan"))
    return address


def _calculate(
    db: Session, items: list[OrderItemRequest], method: str, address: str | None
) -> tuple[Decimal, Decimal | None, Decimal | None, Decimal]:
    subtotal = Decimal("0")
    for requested in items:
        product = repository.get_locked_product(db, requested.product_id)
        if product is None:
            raise HTTPException(
                status_code=404,
                detail=error_response(ERR_NOT_FOUND, "Produk tidak ditemukan"),
            )
        if product.stok < requested.qty:
            raise HTTPException(
                status_code=409,
                detail=error_response(
                    ERR_BAD_REQUEST, f"Stok {product.nama_barang} tidak mencukupi"
                ),
            )
        subtotal += Decimal(product.harga) * requested.qty
    if method == "pickup":
        return subtotal, None, None, Decimal("0")
    quote = calculate_shipping_quote(address or "")
    return subtotal, quote.distance_km, quote.rate_per_km, quote.shipping_fee


def preview(db: Session, user: dict, payload: OrderRequest) -> OrderPreviewResponse:
    _validate_request(payload)
    address = _validate_checkout(db, user, payload)
    items, _cart_items = _items_from_request(db, user, payload)
    subtotal, distance, rate, fee = _calculate(
        db,
        items,
        payload.fulfillment_method,
        address.address if address else None,
    )
    product_names = {
        product.product_id: product.nama_barang
        for product in db.scalars(
            select(Product).where(Product.product_id.in_([item.product_id for item in items]))
        ).all()
    }
    return OrderPreviewResponse(
        items=items,
        item_names=[product_names[item.product_id] for item in items],
        subtotal=subtotal,
        distance_km=distance,
        rate_per_km=rate,
        shipping_fee=fee,
        total_harga=subtotal + fee,
        fulfillment_method=payload.fulfillment_method,
        shipping_method=payload.shipping_method,
        store_id=payload.store_id,
    )


def create_order(db: Session, user: dict, payload: OrderRequest) -> OrderResponse:
    _validate_request(payload)
    address = _validate_checkout(db, user, payload)
    customer_id = _customer_id(user)
    items, cart_items = _items_from_request(db, user, payload)
    subtotal, distance, rate, fee = _calculate(
        db,
        items,
        payload.fulfillment_method,
        address.address if address else None,
    )
    transaction = Transaction(
        no_invoice=f"DJ-{uuid.uuid4().hex[:12].upper()}",
        customer_id=customer_id,
        total_harga=subtotal + fee,
        channel=payload.channel,
        order_status="pending",
        payment_status="unpaid",
        fulfillment_method=payload.fulfillment_method,
        subtotal=subtotal,
        shipping_fee=fee,
    )
    db.add(transaction)
    db.flush()
    for requested in items:
        product = repository.get_locked_product(db, requested.product_id)
        db.add(
            TransactionItem(
                transaction_id=transaction.transaction_id,
                product_id=product.product_id,
                nama_barang_snapshot=product.nama_barang,
                harga_satuan=product.harga,
                qty=requested.qty,
                subtotal=Decimal(product.harga) * requested.qty,
            )
        )
    if payload.source == "cart":
        cart_repository.delete_items(db, cart_items)
    if payload.fulfillment_method == "delivery":
        address = payload.shipping_address
        db.add(
            Fulfillment(
                transaction_id=transaction.transaction_id,
                method="delivery",
                status="pending",
                recipient_name=address.recipient_name,
                recipient_phone=address.recipient_phone,
                address=address.address,
                distance_km=distance,
                rate_per_km=rate,
                shipping_fee=fee,
                store_id=None,
                shipping_method=payload.shipping_method,
            )
        )
    else:
        db.add(
            Fulfillment(
                transaction_id=transaction.transaction_id,
                method="pickup",
                status="pending",
                shipping_fee=0,
                store_id=payload.store_id,
                shipping_method=None,
            )
        )
    db.commit()
    db.refresh(transaction)
    return _response(transaction, distance, rate)


def pay(
    db: Session, user: dict, transaction_id: UUID, payment_method: str
) -> OrderResponse:
    transaction = repository.get_transaction(db, transaction_id)
    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail=error_response(ERR_NOT_FOUND, "Order tidak ditemukan"),
        )
    if transaction.customer_id != _customer_id(user):
        raise HTTPException(
            status_code=403,
            detail=error_response(ERR_FORBIDDEN, "Order bukan milik customer ini"),
        )
    if transaction.payment_status == "paid":
        return _response(transaction, None, None)
    if transaction.fulfillment_method == "delivery" and payment_method == "store_payment":
        raise HTTPException(status_code=400, detail=error_response(ERR_BAD_REQUEST, "Pembayaran di toko hanya tersedia untuk pickup"))
    items = repository.get_items(db, transaction_id)
    for item in items:
        product = repository.get_locked_product(db, item.product_id)
        if product is None or product.stok < item.qty:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail=error_response(
                    ERR_BAD_REQUEST, "Stok berubah dan tidak mencukupi"
                ),
            )
        product.stok -= item.qty
    payment_status = "pending" if payment_method == "store_payment" else "paid"
    transaction.payment_method = payment_method
    transaction.payment_status = payment_status
    transaction.order_status = "pending" if payment_status == "pending" else "paid"
    payment = db.scalar(
        select(Payment).where(Payment.transaction_id == transaction.transaction_id)
    )
    if payment is None:
        payment = Payment(transaction_id=transaction.transaction_id)
        db.add(payment)
    payment.payment_method = payment_method
    payment.amount = transaction.total_harga
    payment.status = payment_status
    payment.reference = payment.reference or f"MOCK-{uuid.uuid4().hex[:12].upper()}"
    payment.paid_at = datetime.now(timezone.utc) if payment_status == "paid" else None
    db.commit()
    db.refresh(transaction)
    return _response(transaction, None, None)


def _response(
    transaction: Transaction, distance: Decimal | None, rate: Decimal | None
) -> OrderResponse:
    return OrderResponse(
        transaction_id=transaction.transaction_id,
        no_invoice=transaction.no_invoice,
        channel=transaction.channel,
        order_status=transaction.order_status,
        payment_status=transaction.payment_status,
        subtotal=transaction.subtotal,
        distance_km=distance,
        rate_per_km=rate,
        shipping_fee=transaction.shipping_fee,
        total_harga=transaction.total_harga,
        fulfillment_method=transaction.fulfillment_method or "pickup",
    )
