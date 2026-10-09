"""Business logic for personnel POS transactions."""

import uuid
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.models import Customer
from app.modules.tps.catalog.models import Product

from .models import Transaction, TransactionItem
from .pos_schemas import POSReceiptItem, POSTransactionRequest, POSTransactionResponse

CUSTOMER_GENERAL_PHONE = "9999"
CUSTOMER_GENERAL_NAME = "Customer Umum"


def find_customer(db: Session, phone: str) -> Customer | None:
    return db.scalar(select(Customer).where(Customer.no_hp == phone.strip()))


def _customer(db: Session, phone: str | None, name: str | None) -> Customer:
    normalized_phone = (phone or "").strip()
    if not normalized_phone or normalized_phone == CUSTOMER_GENERAL_PHONE:
        normalized_phone = CUSTOMER_GENERAL_PHONE
        name = CUSTOMER_GENERAL_NAME

    customer = db.scalar(select(Customer).where(Customer.no_hp == normalized_phone))
    if customer is not None:
        return customer
    if not name or len(name.strip()) < 2:
        raise HTTPException(status_code=422, detail="Nama pembeli minimal 2 karakter untuk customer baru")
    customer = Customer(nama=name.strip(), no_hp=normalized_phone)
    db.add(customer)
    db.flush()
    return customer


def create_transaction(db: Session, user: dict, payload: POSTransactionRequest) -> POSTransactionResponse:
    customer = _customer(db, payload.customer_phone, payload.customer_name)
    receipt_items: list[POSReceiptItem] = []
    subtotal = Decimal("0")

    try:
        transaction = Transaction(
            no_invoice=f"POS-{uuid.uuid4().hex[:12].upper()}",
            customer_id=customer.customer_id,
            personnel_id=UUID(str(user["entity_id"])),
            total_harga=Decimal("0"),
            channel="pos",
            order_status="paid",
            payment_status="paid",
            payment_method=payload.payment_method,
        )
        db.add(transaction)
        db.flush()

        for requested in payload.items:
            product = db.scalar(
                select(Product).where(Product.product_id == requested.product_id).with_for_update()
            )
            if product is None:
                raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
            if product.stok < requested.qty:
                raise HTTPException(status_code=409, detail=f"Stok {product.nama_barang} tidak mencukupi")

            unit_price = Decimal(product.harga)
            line_total = unit_price * requested.qty
            subtotal += line_total
            product.stok -= requested.qty
            db.add(TransactionItem(
                transaction_id=transaction.transaction_id,
                product_id=product.product_id,
                nama_barang_snapshot=product.nama_barang,
                harga_satuan=unit_price,
                qty=requested.qty,
                subtotal=line_total,
            ))
            receipt_items.append(POSReceiptItem(
                product_id=product.product_id,
                nama_barang=product.nama_barang,
                harga_satuan=unit_price,
                qty=requested.qty,
                subtotal=line_total,
            ))

        if payload.paid_amount < subtotal:
            raise HTTPException(status_code=422, detail="Nominal pembayaran kurang dari total harga")

        change = payload.paid_amount - subtotal
        transaction.total_harga = subtotal
        transaction.paid_amount = payload.paid_amount
        transaction.change_amount = change
        db.commit()
        db.refresh(transaction)
        return POSTransactionResponse(
            transaction_id=transaction.transaction_id,
            no_invoice=transaction.no_invoice,
            customer_name=customer.nama,
            customer_phone=customer.no_hp,
            items=receipt_items,
            subtotal=subtotal,
            total_harga=subtotal,
            paid_amount=payload.paid_amount,
            change_amount=change,
            payment_method=payload.payment_method,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
