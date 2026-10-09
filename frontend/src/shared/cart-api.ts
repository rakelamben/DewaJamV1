import apiClient from "./api-client";

export interface ApiCartItem {
  cart_item_id: string;
  product_id: string;
  nama_barang: string;
  brand?: string | null;
  harga: number | string;
  stok_tersedia: number;
  qty: number;
  subtotal: number | string;
  gambar_url?: string | null;
}

export interface ApiCart {
  cart_id: string;
  items: ApiCartItem[];
  total_items: number;
  subtotal: number | string;
  updated_at?: string | null;
}

export async function getCustomerCart(): Promise<ApiCart> {
  const response = await apiClient.get<ApiCart>("/api/v1/tps/cart");
  return response.data;
}

export async function addCustomerCartItem(
  productId: string,
  qty: number,
): Promise<ApiCart> {
  const response = await apiClient.post<ApiCart>("/api/v1/tps/cart/items", {
    product_id: productId,
    qty,
  });
  return response.data;
}

export async function updateCustomerCartItem(
  itemId: string,
  qty: number,
): Promise<ApiCart> {
  const response = await apiClient.patch<ApiCart>(
    `/api/v1/tps/cart/items/${itemId}`,
    { qty },
  );
  return response.data;
}

export async function removeCustomerCartItem(itemId: string): Promise<ApiCart> {
  const response = await apiClient.delete<ApiCart>(
    `/api/v1/tps/cart/items/${itemId}`,
  );
  return response.data;
}

export async function clearCustomerCart(): Promise<ApiCart> {
  const response = await apiClient.delete<ApiCart>("/api/v1/tps/cart");
  return response.data;
}
