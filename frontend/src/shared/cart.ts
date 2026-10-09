import type { Product } from "./types/catalog";

export interface SessionCartItem {
  product: Product;
  qty: number;
}

const CART_KEY = "dewa-jam:inplace-cart";

export function readSessionCart(): SessionCartItem[] {
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeSessionCart(items: SessionCartItem[]): void {
  sessionStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("dewa-jam:cart-updated"));
}

export function addToSessionCart(product: Product, qty: number): SessionCartItem[] {
  const items = readSessionCart();
  const existing = items.find((item) => item.product.product_id === product.product_id);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, product.stok);
  } else {
    items.push({ product, qty: Math.min(qty, product.stok) });
  }
  writeSessionCart(items.filter((item) => item.qty > 0));
  return items;
}

export function getCartCount(items = readSessionCart()): number {
  return items.reduce((total, item) => total + item.qty, 0);
}

export function removeFromSessionCart(productId: string): SessionCartItem[] {
  const items = readSessionCart().filter((item) => item.product.product_id !== productId);
  writeSessionCart(items);
  return items;
}
