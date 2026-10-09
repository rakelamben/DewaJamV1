"""Database operations for transactions and transaction items."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.tps.catalog.models import Product

from .models import Transaction, TransactionItem


def get_transaction(db: Session, transaction_id: UUID) -> Transaction | None:
    return db.scalar(
        select(Transaction)
        .where(Transaction.transaction_id == transaction_id)
        .with_for_update()
    )


def get_items(db: Session, transaction_id: UUID) -> list[TransactionItem]:
    return list(
        db.scalars(
            select(TransactionItem).where(
                TransactionItem.transaction_id == transaction_id
            )
        ).all()
    )


def get_locked_product(db: Session, product_id: UUID) -> Product | None:
    return db.scalar(
        select(Product).where(Product.product_id == product_id).with_for_update()
    )
