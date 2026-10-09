"""Service layer for Product catalog business logic, validation, audit logging, and file storage."""

import os
import uuid
from decimal import Decimal
from pathlib import Path
from typing import List, Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.core.errors import ERR_BAD_REQUEST, ERR_NOT_FOUND, error_response
from app.modules.tps.catalog import repository
from app.modules.tps.catalog.models import Product
from app.modules.tps.catalog.schemas import (
    ImageUploadResponse,
    ProductCategory,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
UPLOAD_DIR = Path("uploads/products")


def list_products(
    db: Session,
    kategori: Optional[ProductCategory] = None,
    tag: Optional[str] = None,
    q: Optional[str] = None,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[Product], int]:
    """Get list of products with optional filters."""
    return repository.get_products(
        db,
        kategori=kategori,
        tag=tag,
        q=q,
        min_price=min_price,
        max_price=max_price,
        skip=skip,
        limit=limit,
    )


def get_product(db: Session, product_id: UUID) -> Product:
    """Get product by ID or raise 404."""
    product = repository.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=404,
            detail=error_response(ERR_NOT_FOUND, f"Produk dengan ID {product_id} tidak ditemukan"),
        )
    return product


def create_product(db: Session, data: ProductCreate, personnel_id: UUID) -> Product:
    """Create a new product with audit logging."""
    product = repository.create_product(db, data)

    # Audit log
    write_audit_log(
        session=db,
        personnel_id=personnel_id,
        action="create",
        table_name="products",
        record_id=product.product_id,
        detail={"nama_barang": product.nama_barang, "kategori": product.kategori},
    )
    db.commit()
    db.refresh(product)
    return product


def update_product(
    db: Session, product_id: UUID, data: ProductUpdate, personnel_id: UUID
) -> Product:
    """Update product with audit logging."""
    product = get_product(db, product_id)
    updated = repository.update_product(db, product, data)

    # Audit log
    write_audit_log(
        session=db,
        personnel_id=personnel_id,
        action="update",
        table_name="products",
        record_id=updated.product_id,
        detail={"updated_fields": list(data.model_dump(exclude_unset=True).keys())},
    )
    db.commit()
    db.refresh(updated)
    return updated


def delete_product(db: Session, product_id: UUID, personnel_id: UUID) -> None:
    """Delete product with audit logging."""
    product = get_product(db, product_id)
    product_name = product.nama_barang

    repository.delete_product(db, product)

    # Audit log
    write_audit_log(
        session=db,
        personnel_id=personnel_id,
        action="delete",
        table_name="products",
        record_id=product_id,
        detail={"nama_barang": product_name},
    )
    db.commit()


async def handle_image_upload(file: UploadFile) -> ImageUploadResponse:
    """Validate and save product image locally (or Supabase Storage)."""
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=error_response(
                ERR_BAD_REQUEST,
                f"Format gambar tidak didukung ({ext}). Harap gunakan PNG, JPG, JPEG, atau WEBP.",
            ),
        )

    # Read content to check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=error_response(
                ERR_BAD_REQUEST,
                f"Ukuran file melebihi batas maksimum 5MB ({len(contents) / (1024*1024):.1f}MB).",
            ),
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    target_path = UPLOAD_DIR / unique_filename

    with open(target_path, "wb") as f:
        f.write(contents)

    # Return accessible relative URL
    file_url = f"/static/uploads/products/{unique_filename}"
    return ImageUploadResponse(url=file_url, filename=unique_filename)
