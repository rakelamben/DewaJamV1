"""Pydantic schemas for the Product Catalog module."""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProductCategory(str, Enum):
    JAM_TANGAN_PRIA = "Jam Tangan Pria"
    JAM_TANGAN_WANITA = "Jam Tangan Wanita"
    JAM_TANGAN_ANAK = "Jam Tangan Anak-anak"
    SMARTWATCH = "Smartwatch"
    JAM_TANGAN_LUXURY = "Jam Tangan Luxury"
    STRAP_AKSESORIS = "Strap & Aksesoris"


class ProductBase(BaseModel):
    nama_barang: str = Field(
        ..., min_length=1, max_length=255, description="Nama produk jam/aksesoris"
    )
    brand: Optional[str] = Field(
        default=None, max_length=120, description="Merek produk"
    )
    kategori: ProductCategory = Field(..., description="Kategori produk")
    harga: Decimal = Field(..., ge=0, description="Harga produk (Rupiah)")
    stok: int = Field(default=0, ge=0, description="Jumlah stok fisik")
    deskripsi: Optional[str] = Field(
        default=None, description="Deskripsi detail produk"
    )
    gambar_url: Optional[str] = Field(default=None, description="URL gambar produk")
    tags: List[str] = Field(
        default_factory=list,
        description="Tag produk (e.g. garansi resmi, strap cadangan)",
    )


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    nama_barang: Optional[str] = Field(default=None, min_length=1, max_length=255)
    brand: Optional[str] = Field(default=None, max_length=120)
    kategori: Optional[ProductCategory] = None
    harga: Optional[Decimal] = Field(default=None, ge=0)
    stok: Optional[int] = Field(default=None, ge=0)
    deskripsi: Optional[str] = None
    gambar_url: Optional[str] = None
    tags: Optional[List[str]] = None


class ProductResponse(ProductBase):
    product_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    total: int


class ImageUploadResponse(BaseModel):
    url: str
    filename: str
