import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthContext } from "@/shared/use-auth-context";
import apiClient from "@/shared/api-client";
import { getCustomerCart, type ApiCart } from "@/shared/cart-api";
import { MarketplaceFooter } from "./components/MarketplaceFooter";
import { MarketplaceHeader } from "./components/MarketplaceHeader";

type CheckoutItem = { product_id: string; qty: number; nama_barang?: string; harga?: number | string };
type CheckoutState = { source: "cart" | "buy_now"; cartItemIds?: string[]; items?: CheckoutItem[] };
type Address = { address_id: string; label: string; recipient_name: string; recipient_phone: string; address: string };
type Store = { store_id: string; name: string; address: string; google_maps_url: string; opening_hours?: string | null };
type Preview = { items: CheckoutItem[]; item_names: string[]; subtotal: number | string; shipping_fee: number | string; total_harga: number | string; distance_km?: number | string | null };

const money = (value: number | string) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value));

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authContext } = useAuthContext();
  const checkout = (location.state as CheckoutState | null) ?? null;
  const isInplace = location.pathname.startsWith("/inplace/");
  const [method, setMethod] = useState<"delivery" | "pickup">(isInplace ? "pickup" : "delivery");
  const [paymentMethod, setPaymentMethod] = useState<"virtual_account" | "e_wallet" | "store_payment">(isInplace ? "store_payment" : "virtual_account");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [addressId, setAddressId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [address, setAddress] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (authContext !== "customer") return;
    void Promise.all([
      apiClient.get<Address[]>("/api/v1/tps/fulfillment/addresses"),
      apiClient.get<Store[]>("/api/v1/tps/fulfillment/stores"),
      !isInplace && checkout?.source === "cart" ? getCustomerCart() : Promise.resolve(null),
    ]).then(([addressResponse, storeResponse, cartResponse]) => {
      setAddresses(addressResponse.data);
      setStores(storeResponse.data);
      setCart(cartResponse);
      if (addressResponse.data[0]) setAddressId(addressResponse.data[0].address_id);
      if (storeResponse.data[0]) setStoreId(storeResponse.data[0].store_id);
    }).catch(() => setError("Data checkout gagal dimuat."));
  }, [authContext, checkout?.source, isInplace]);

  const displayItems = useMemo(() => {
    if (cart && checkout?.cartItemIds) {
      return cart.items
        .filter((item) => checkout.cartItemIds?.includes(item.cart_item_id))
        .map((item) => ({ product_id: item.product_id, qty: item.qty, nama_barang: item.nama_barang, harga: item.harga }));
    }
    return checkout?.items ?? [];
  }, [cart, checkout]);

  const fallbackPreview = useMemo<Preview>(() => {
    const subtotal = displayItems.reduce((sum, item) => sum + Number(item.harga ?? 0) * item.qty, 0);
    return {
      items: displayItems,
      item_names: displayItems.map((item) => item.nama_barang ?? "Produk"),
      subtotal,
      shipping_fee: 0,
      total_harga: subtotal,
    };
  }, [displayItems]);

  const payload = useMemo(() => ({
    source: checkout?.source ?? "cart",
    channel: isInplace ? "inplace" : "marketplace",
    items: checkout?.items ?? [],
    cart_item_ids: checkout?.cartItemIds ?? [],
    fulfillment_method: isInplace ? "pickup" : method,
    address_id: method === "delivery" && addressId ? addressId : undefined,
    shipping_address: method === "delivery" && !addressId ? { recipient_name: recipientName.trim(), recipient_phone: recipientPhone.trim(), address: address.trim() } : undefined,
    store_id: method === "pickup" && storeId ? storeId : undefined,
    shipping_method: method === "delivery" ? "standard" : undefined,
  }), [address, addressId, checkout, isInplace, method, recipientName, recipientPhone, storeId]);

  const checkoutValidationError = useMemo(() => {
    if (!isInplace && method === "delivery" && !addressId) {
      if (recipientName.trim().length < 2) return "Nama penerima minimal 2 karakter.";
      if (recipientPhone.trim().length < 5) return "Nomor telepon minimal 5 karakter.";
      if (address.trim().length < 5) return "Alamat lengkap minimal 5 karakter.";
    }
    if ((isInplace || method === "pickup") && !storeId) {
      return stores.length > 0 ? "Pilih toko pickup terlebih dahulu." : "Toko pickup belum tersedia.";
    }
    return null;
  }, [address, addressId, isInplace, method, recipientName, recipientPhone, storeId, stores.length]);

  const validateCheckout = () => checkoutValidationError;
  const visiblePreview = checkoutValidationError ? fallbackPreview : (preview ?? fallbackPreview);

  const previewCheckout = useCallback(async () => {
    const validationError = checkoutValidationError;
    if (validationError) {
      setError(validationError);
      return;
    }
    setPreviewLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<Preview>("/api/v1/tps/sales/orders/preview", payload);
      setPreview(response.data);
    } catch {
      setError("Preview checkout gagal. Periksa produk, stok, dan data pengiriman.");
    } finally {
      setPreviewLoading(false);
    }
  }, [checkoutValidationError, payload]);

  useEffect(() => {
    if (!checkout || authContext !== "customer") return;
    if (checkoutValidationError) {
      return;
    }
    const timer = window.setTimeout(() => void previewCheckout(), 300);
    return () => window.clearTimeout(timer);
  }, [authContext, checkout, checkoutValidationError, previewCheckout]);

  const payNow = async () => {
    const validationError = validateCheckout();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const order = await apiClient.post<{ transaction_id: string }>("/api/v1/tps/sales/orders", payload);
      await apiClient.post(`/api/v1/tps/sales/orders/${order.data.transaction_id}/pay`, { payment_method: paymentMethod });
      navigate("/", { state: { orderSuccess: true } });
    } catch {
      setError("Pesanan belum dapat diproses. Silakan periksa stok dan data checkout.");
    } finally {
      setLoading(false);
    }
  };

  if (!checkout || authContext !== "customer") {
    return <div className="min-h-screen p-8 text-neutral-secondary">Silakan login dan pilih produk terlebih dahulu.</div>;
  }

  return (
    <div className="min-h-screen bg-white text-neutral-primary">
       <MarketplaceHeader searchQuery="" onSearchChange={() => undefined} onOpenLoginModal={() => undefined} cartCount={0} cartPath={isInplace ? "/inplace/cart" : "/cart"} />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-4 lg:px-10 pb-12">
         <Link to={isInplace ? "/inplace/cart" : "/cart"} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-teal"><ArrowLeft className="h-4 w-4" />Kembali ke keranjang</Link>
         <h1 className="font-serif text-3xl">Checkout {isInplace ? "Inplace" : "Marketplace"}</h1>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardContent className="space-y-5 pt-5">
               {!isInplace && <div className="grid grid-cols-2 gap-2"><Button type="button" size={"sm"} variant={method === "delivery" ? "default" : "outline"} onClick={() => { setMethod("delivery"); setPaymentMethod("virtual_account"); }}>Pengiriman</Button><Button type="button" size={"sm"} variant={method === "pickup" ? "default" : "outline"} onClick={() => { setMethod("pickup"); setPaymentMethod("store_payment"); }}>Pickup toko</Button></div>}
               {method === "delivery" && !isInplace ? <div className="space-y-3"><label className="text-sm font-semibold">Alamat pengiriman</label>{addresses.length > 0 && <Select value={addressId || "new"} onValueChange={(value) => setAddressId(value === "new" ? "" : value)}><SelectTrigger><SelectValue placeholder="Pilih alamat pengiriman" /></SelectTrigger><SelectContent><SelectGroup><SelectLabel>Alamat tersimpan</SelectLabel><SelectItem value="new">Gunakan alamat baru</SelectItem>{addresses.map((item) => <SelectItem key={item.address_id} value={item.address_id}>{item.label} — {item.address}</SelectItem>)}</SelectGroup></SelectContent></Select>}{!addressId && <div className="grid gap-3 sm:grid-cols-2"><Input className="text-sm" placeholder="Nama penerima" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} /><Input className="text-sm" placeholder="Nomor telepon" value={recipientPhone} onChange={(event) => setRecipientPhone(event.target.value)} /><Input className="sm:col-span-2 text-sm"  placeholder="Alamat lengkap" value={address} onChange={(event) => setAddress(event.target.value)} /></div>}<p className="text-sm text-neutral-secondary">Metode pengiriman: Standard delivery</p></div> : <div className="space-y-3"><label className="text-sm font-semibold">Pilih toko pickup</label><div className="space-y-2">{stores.map((store) => <label key={store.store_id} className="flex gap-3 rounded-md border p-3"><input type="radio" name="store" checked={storeId === store.store_id} onChange={() => setStoreId(store.store_id)} /><span><strong>{store.name}</strong><br /><span className="text-sm text-neutral-secondary">{store.address}</span><br /><a className="text-sm text-brand-orange underline" href={store.google_maps_url} target="_blank" rel="noreferrer">Buka Google Maps</a></span></label>)}</div></div>}
               <div className="space-y-2"><label className="text-sm font-semibold">Metode pembayaran</label><Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectLabel>Metode pembayaran</SelectLabel><SelectItem value="virtual_account">Virtual Account Bank</SelectItem><SelectItem value="e_wallet">Dompet Digital</SelectItem>{method === "pickup" && <SelectItem value="store_payment">Pembayaran di Toko</SelectItem>}</SelectGroup></SelectContent></Select></div>
            </CardContent>
          </Card>
           <Card className="h-fit"><CardHeader><CardTitle>Preview pesanan</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2 text-sm">{visiblePreview.items.map((item, index) => <div key={`${item.product_id}-${index}`} className="flex justify-between gap-3"><span>{visiblePreview.item_names[index] ?? "Produk"} × {item.qty}</span></div>)}</div><div className="flex justify-between border-t pt-3 text-sm"><span>Subtotal</span><span>{money(visiblePreview.subtotal)}</span></div><div className="flex justify-between text-sm"><span>Ongkir</span><span>{money(visiblePreview.shipping_fee)}</span></div><div className="flex justify-between text-lg font-bold"><span>Total pembayaran</span><span>{money(visiblePreview.total_harga)}</span></div>{previewLoading && <p className="text-xs text-neutral-secondary">Memperbarui total…</p>}<Button className="w-full" onClick={() => void payNow()} disabled={loading || previewLoading}>{loading ? "Memproses…" : "Bayar Sekarang"}</Button></CardContent></Card>
        </div>
      </main>
      <MarketplaceFooter />
    </div>
  );
}
