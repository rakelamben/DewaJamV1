import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import CustomerLoginModal from "@/modules/auth/CustomerLoginModal";
import {
  getCustomerCart,
  removeCustomerCartItem,
  updateCustomerCartItem,
  type ApiCart,
} from "@/shared/cart-api";
import { useAuthContext } from "@/shared/use-auth-context";
import { MarketplaceFooter } from "./components/MarketplaceFooter";
import { MarketplaceHeader } from "./components/MarketplaceHeader";

function formatRupiah(value: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function MarketplaceCartPage() {
  const navigate = useNavigate();
  const { authContext } = useAuthContext();
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const loadCart = async () => {
    setLoading(true);
    try {
      const nextCart = await getCustomerCart();
      setCart(nextCart);
      setSelectedIds((current) => current.filter((id) => nextCart.items.some((item) => item.cart_item_id === id)));
      setError(null);
    } catch {
      setError("Keranjang gagal dimuat. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authContext === "customer") {
      void Promise.resolve().then(() => loadCart());
    } else if (authContext === null) {
      const timer = window.setTimeout(() => {
        setLoading(false);
        setLoginOpen(true);
      }, 0);
      return () => window.clearTimeout(timer);
    } else {
      const timer = window.setTimeout(() => setLoading(false), 0);
      return () => window.clearTimeout(timer);
    }
  }, [authContext]);

  const selectedItems = useMemo(
    () => cart?.items.filter((item) => selectedIds.includes(item.cart_item_id)) ?? [],
    [cart, selectedIds],
  );
  const selectedSubtotal = selectedItems.reduce((sum, item) => sum + Number(item.subtotal), 0);

  const updateQty = async (itemId: string, qty: number) => {
    try {
      setCart(await updateCustomerCartItem(itemId, qty));
    } catch {
      setError("Jumlah tidak dapat diperbarui. Stok mungkin sudah berubah.");
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      setCart(await removeCustomerCartItem(itemId));
      setSelectedIds((current) => current.filter((id) => id !== itemId));
    } catch {
      setError("Item gagal dihapus dari keranjang.");
    }
  };

  const toggleItem = (itemId: string) => {
    setSelectedIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-primary">
      <MarketplaceHeader searchQuery="" onSearchChange={() => undefined} onOpenLoginModal={() => setLoginOpen(true)} cartCount={cart?.total_items ?? 0} />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-4 lg:px-10 pb-12">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-teal"><ArrowLeft className="h-4 w-4" />Kembali ke katalog</Link>
        <div><h1 className="mt-2 font-serif text-3xl">Keranjang saya</h1></div>
        {loading && <p className="text-neutral-secondary">Memuat keranjang…</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {!loading && authContext === "personnel" && <p className="text-neutral-secondary">Akun staf hanya dapat melihat katalog.</p>}
        {!loading && authContext === "customer" && cart?.items.length === 0 && <Card className="border-border/50 bg-white"><CardContent className="flex flex-col items-center gap-4 py-16 text-center"><ShoppingBag className="h-14 w-14 text-brand-orange" /><h2 className="font-serif text-2xl">Keranjang masih kosong</h2><Button asChild><Link to="/">Lihat katalog</Link></Button></CardContent></Card>}
        {!loading && authContext === "customer" && cart && cart.items.length > 0 && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="border-border/50 bg-white">
              <CardContent className="divide-y divide-border/50 p-0">
                <label className="p-5 flex items-center gap-4 text-sm"><Checkbox id="select-all-cart-items" checked={selectedIds.length === cart.items.length} onCheckedChange={(checked) => setSelectedIds(checked === true ? cart.items.map((item) => item.cart_item_id) : [])} />Pilih semua</label>
                {cart.items.map((item) => (
                  <div key={item.cart_item_id} className="grid gap-4 p-5 sm:grid-cols-[24px_96px_minmax(0,1fr)_auto] sm:items-center">
                    <Checkbox id={`cart-item-${item.cart_item_id}`} aria-label={`Pilih ${item.nama_barang}`} checked={selectedIds.includes(item.cart_item_id)} onCheckedChange={() => toggleItem(item.cart_item_id)} />
                    <div className="flex h-24 items-center justify-center rounded-md bg-neutral-light p-2">{item.gambar_url && <img src={item.gambar_url} alt="" className="max-h-full max-w-full object-contain" />}</div>
                    <div><div className="font-semibold font-sm">{item.nama_barang}</div><p className="mt-1 text-sm text-neutral-secondary">{formatRupiah(item.harga)}</p><div className="mt-3 flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Kurangi jumlah" disabled={item.qty <= 1} onClick={() => void updateQty(item.cart_item_id, item.qty - 1)}><Minus className="h-4 w-4" /></Button><Input aria-label={`Jumlah ${item.nama_barang}`} value={item.qty} onChange={(event) => void updateQty(item.cart_item_id, Number(event.target.value) || 1)} className="w-16 text-center" /><Button variant="outline" size="icon" aria-label="Tambah jumlah" disabled={item.qty >= item.stok_tersedia} onClick={() => void updateQty(item.cart_item_id, item.qty + 1)}><Plus className="h-4 w-4" /></Button></div></div>
                    <div className="flex items-center justify-between gap-4 sm:block sm:text-right"><p className="font-bold">{formatRupiah(item.subtotal)}</p><Button variant="ghost" size="sm" className="mt-2 text-red-700" onClick={() => void removeItem(item.cart_item_id)}><Trash2 className="mr-1 h-4 w-4" />Hapus</Button></div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="h-fit border-border/50 bg-white"><CardHeader><CardTitle className="text-2xl">Preview Harga</CardTitle></CardHeader><CardContent className="space-y-5"><div className="flex justify-between text-sm text-neutral-secondary"><span>{selectedItems.length} produk dipilih</span><span>{formatRupiah(selectedSubtotal)}</span></div><div className="flex justify-between border-t border-border/50 pt-5 text-lg font-bold"><span>Total sementara</span><span>{formatRupiah(selectedSubtotal)}</span></div><Button className="w-full" disabled={!selectedIds.length} onClick={() => navigate("/checkout", { state: { source: "cart", cartItemIds: selectedIds } })}>Lanjut ke checkout</Button></CardContent></Card>
          </div>
        )}
      </main>
      <MarketplaceFooter />
      <CustomerLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={() => { setLoginOpen(false); void loadCart(); }} message="Masuk untuk mengakses keranjang Marketplace Anda." />
    </div>
  );
}
