"""Database access for persistent carts."""

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.tps.catalog.models import Product

from .models import Cart, CartItem


def get_or_create_cart(db: Session, customer_id: UUID) -> Cart:
    cart = db.scalar(select(Cart).where(Cart.customer_id == customer_id))
    if cart is None:
        cart = Cart(customer_id=customer_id)
        db.add(cart)
        db.flush()
    return cart


def get_cart_items(db: Session, cart_id: UUID):
    return list(
        db.execute(
            select(CartItem, Product)
            .join(Product, Product.product_id == CartItem.product_id)
            .where(CartItem.cart_id == cart_id)
            .order_by(CartItem.created_at.asc())
        ).all()
    )


def get_item(db: Session, cart_id: UUID, product_id: UUID) -> CartItem | None:
    return db.scalar(
        select(CartItem).where(
            CartItem.cart_id == cart_id, CartItem.product_id == product_id
        )
    )


def get_item_by_id(db: Session, cart_id: UUID, item_id: UUID) -> CartItem | None:
    return db.scalar(
        select(CartItem).where(
            CartItem.cart_id == cart_id, CartItem.cart_item_id == item_id
        )
    )


def get_items_by_ids(db: Session, cart_id: UUID, item_ids: list[UUID]):
    if not item_ids:
        return []
    return list(
        db.execute(
            select(CartItem, Product)
            .join(Product, Product.product_id == CartItem.product_id)
            .where(CartItem.cart_id == cart_id, CartItem.cart_item_id.in_(item_ids))
        ).all()
    )


def get_product(db: Session, product_id: UUID) -> Product | None:
    return db.scalar(select(Product).where(Product.product_id == product_id))


def delete_item(db: Session, item: CartItem) -> None:
    db.delete(item)


def clear_cart(db: Session, cart_id: UUID) -> None:
    db.execute(delete(CartItem).where(CartItem.cart_id == cart_id))


def delete_items(db: Session, items: list[CartItem]) -> None:
    for item in items:
        db.delete(item)
