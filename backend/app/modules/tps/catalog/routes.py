"""FastAPI endpoints for Product Catalog module."""

from decimal import Decimal
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.modules.tps.catalog import service
from app.modules.tps.catalog.schemas import (
    ImageUploadResponse,
    ProductCategory,
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter()


@router.get(
    "/products",
    response_model=ProductListResponse,
    summary="Daftar produk publik dengan filter kategori, tag, harga, dan pencarian",
)
def list_products(
    db: Session = Depends(get_db),
    kategori: Optional[ProductCategory] = Query(default=None, description="Kategori jam"),
    tag: Optional[str] = Query(default=None, description="Tag spesifik produk"),
    q: Optional[str] = Query(default=None, description="Pencarian nama produk"),
    min_price: Optional[Decimal] = Query(default=None, description="Harga minimum"),
    max_price: Optional[Decimal] = Query(default=None, description="Harga maksimum"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
):
    items, total = service.list_products(
        db,
        kategori=kategori,
        tag=tag,
        q=q,
        min_price=min_price,
        max_price=max_price,
        skip=skip,
        limit=limit,
    )
    return ProductListResponse(items=items, total=total)


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
    summary="Detail produk publik berdasarkan ID",
)
def get_product(
    product_id: UUID,
    db: Session = Depends(get_db),
):
    return service.get_product(db, product_id)


@router.post(
    "/upload-image",
    response_model=ImageUploadResponse,
    summary="Upload gambar produk (Admin, Manager, Gudang)",
)
async def upload_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role("admin", "manager", "gudang")),
):
    return await service.handle_image_upload(file)


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tambah produk baru (Admin, Manager)",
)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "manager")),
):
    personnel_id = UUID(str(current_user["entity_id"]))
    return service.create_product(db, payload, personnel_id)


@router.put(
    "/products/{product_id}",
    response_model=ProductResponse,
    summary="Perbarui data produk (Admin, Manager)",
)
def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "manager")),
):
    personnel_id = UUID(str(current_user["entity_id"]))
    return service.update_product(db, product_id, payload, personnel_id)


@router.delete(
    "/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Hapus produk (Admin saja)",
)
def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    personnel_id = UUID(str(current_user["entity_id"]))
    service.delete_product(db, product_id, personnel_id)
