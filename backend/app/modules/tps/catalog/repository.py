"""Repository layer for Product catalog data access."""

from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.tps.catalog.models import Product
from app.modules.tps.catalog.schemas import (
    ProductCategory,
    ProductCreate,
    ProductUpdate,
)


def get_products(
    db: Session,
    kategori: Optional[ProductCategory] = None,
    tag: Optional[str] = None,
    q: Optional[str] = None,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[Product], int]:
    """Retrieve filtered products and total count."""
    query = select(Product)

    if kategori:
        query = query.where(Product.kategori == kategori.value)
    if tag:
        # Postgres array contains operator: tags @> ARRAY[tag]
        # or any element matches
        query = query.where(Product.tags.contains([tag]))
    if q:
        query = query.where(Product.nama_barang.ilike(f"%{q.strip()}%"))
    if min_price is not None:
        query = query.where(Product.harga >= min_price)
    if max_price is not None:
        query = query.where(Product.harga <= max_price)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_query) or 0

    # Paginate and order by created_at desc
    query = query.order_by(Product.created_at.desc()).offset(skip).limit(limit)
    items = list(db.scalars(query).all())

    return items, total


def get_product_by_id(db: Session, product_id: UUID) -> Optional[Product]:
    """Retrieve product by its UUID."""
    return db.scalar(select(Product).where(Product.product_id == product_id))


def create_product(db: Session, data: ProductCreate) -> Product:
    """Create a new product."""
    product = Product(
        nama_barang=data.nama_barang,
        brand=data.brand,
        kategori=data.kategori.value,
        harga=data.harga,
        stok=data.stok,
        deskripsi=data.deskripsi,
        gambar_url=data.gambar_url,
        tags=data.tags or [],
    )
    db.add(product)
    db.flush()
    db.refresh(product)
    return product


def update_product(db: Session, product: Product, data: ProductUpdate) -> Product:
    """Update existing product fields."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "kategori" and value is not None:
            setattr(
                product, field, value.value if hasattr(value, "value") else str(value)
            )
        elif field == "tags" and value is not None:
            setattr(product, field, list(value))
        else:
            setattr(product, field, value)

    db.flush()
    db.refresh(product)
    return product


def delete_product(db: Session, product: Product) -> None:
    """Delete a product."""
    db.delete(product)
    db.flush()
