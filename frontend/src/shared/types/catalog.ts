export type ProductCategory =
  | 'Jam Tangan Pria'
  | 'Jam Tangan Wanita'
  | 'Jam Tangan Anak-anak'
  | 'Smartwatch'
  | 'Jam Tangan Luxury'
  | 'Strap & Aksesoris';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Jam Tangan Pria',
  'Jam Tangan Wanita',
  'Jam Tangan Anak-anak',
  'Smartwatch',
  'Jam Tangan Luxury',
  'Strap & Aksesoris',
];

export interface Product {
  product_id: string;
  nama_barang: string;
  kategori: ProductCategory;
  harga: number | string;
  stok: number;
  deskripsi?: string | null;
  gambar_url?: string | null;
  tags: string[];
  created_at: string;
  /** Optional until the catalog migration adds these fields. */
  brand?: string | null;
  sold_count?: number | null;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
}

export interface ProductFilterParams {
  kategori?: ProductCategory;
  tag?: string;
  q?: string;
  min_price?: number;
  max_price?: number;
  skip?: number;
  limit?: number;
}
