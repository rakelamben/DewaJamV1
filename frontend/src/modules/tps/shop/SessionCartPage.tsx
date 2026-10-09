import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  readSessionCart,
  removeFromSessionCart,
  writeSessionCart,
  type SessionCartItem,
} from "@/shared/cart";
import { useAuthContext } from "@/shared/use-auth-context";
import { MarketplaceFooter } from "./components/MarketplaceFooter";
import { MarketplaceHeader } from "./components/MarketplaceHeader";
import MarketplaceCartPage from "./MarketplaceCartPage";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SessionCartPage() {
  const location = useLocation();
  return location.pathname.startsWith("/inplace/") ? (
    <InplaceSessionCartPage />
  ) : (
    <MarketplaceCartPage />
  );
}

function InplaceSessionCartPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authContext } = useAuthContext();
  const isInplace = location.pathname.startsWith("/inplace/");
  const catalogPath = isInplace ? "/inplace" : "/";
  const [items, setItems] = useState<SessionCartItem[]>(() => readSessionCart());

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.product.harga) * item.qty, 0),
    [items],
  );
  const count = items.reduce((sum, item) => sum + item.qty, 0);

  useEffect(() => {
    const refresh = () => setItems(readSessionCart());
    window.addEventListener("dewa-jam:cart-updated", refresh);
    return () => window.removeEventListener("dewa-jam:cart-updated", refresh);
  }, []);

  const updateQuantity = (productId: string, nextQty: number) => {
    const next = items
      .map((item) =>
        item.product.product_id === productId
          ? { ...item, qty: Math.min(item.product.stok, Math.max(1, nextQty)) }
          : item,
      )
      .filter((item) => item.qty > 0);
    setItems(next);
    writeSessionCart(next);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-primary">
      <MarketplaceHeader
        searchQuery=""
        onSearchChange={() => undefined}
        onOpenLoginModal={() => undefined}
        cartCount={count}
        cartPath={isInplace ? "/inplace/cart" : "/cart"}
      />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 lg:px-10">
        <Link to={catalogPath} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40">
          <ArrowLeft className="h-4 w-4" /> Kembali ke katalog
        </Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-teal">Keranjang</p>
          <h1 className="mt-2 font-serif text-4xl text-neutral-primary">Produk pilihan Anda</h1>
          <p className="mt-2 text-neutral-secondary">{count} item dalam keranjang sesi ini.</p>
        </div>

        {!items.length ? (
          <Card className="border-border/50 bg-white"><CardContent className="flex flex-col items-center gap-4 py-16 text-center"><ShoppingBag className="h-14 w-14 text-brand-orange" /><h2 className="font-serif text-2xl">Keranjang masih kosong</h2><p className="text-neutral-secondary">Pilih produk dari katalog untuk mulai berbelanja.</p><Button asChild><Link to={catalogPath}>Lihat katalog</Link></Button></CardContent></Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="border-border/50 bg-white"><CardContent className="divide-y divide-border/50 p-0">
              {items.map(({ product, qty }) => (
                <div key={product.product_id} className="grid gap-4 p-5 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex h-24 items-center justify-center rounded-md bg-neutral-light p-2"><img src={product.gambar_url || undefined} alt="" className="max-h-full max-w-full object-contain" /></div>
                  <div className="min-w-0"><h2 className="font-semibold text-neutral-primary">{product.nama_barang}</h2><p className="mt-1 text-sm text-neutral-secondary">{formatRupiah(Number(product.harga))}</p><div className="mt-3 flex items-center gap-2"><Button variant="outline" size="icon" aria-label={`Kurangi ${product.nama_barang}`} disabled={qty <= 1} onClick={() => updateQuantity(product.product_id, qty - 1)}><Minus className="h-4 w-4" /></Button><Input aria-label={`Jumlah ${product.nama_barang}`} value={qty} onChange={(event) => updateQuantity(product.product_id, Number(event.target.value) || 1)} className="w-16 text-center" /><Button variant="outline" size="icon" aria-label={`Tambah ${product.nama_barang}`} disabled={qty >= product.stok} onClick={() => updateQuantity(product.product_id, qty + 1)}><Plus className="h-4 w-4" /></Button></div></div>
                  <div className="flex items-center justify-between gap-4 sm:block sm:text-right"><p className="font-bold">{formatRupiah(Number(product.harga) * qty)}</p><Button variant="ghost" size="sm" className="mt-2 text-red-700 hover:text-red-800" onClick={() => { setItems(removeFromSessionCart(product.product_id)); }}><Trash2 className="mr-1 h-4 w-4" />Hapus</Button></div>
                </div>
              ))}
            </CardContent></Card>
             <Card className="h-fit border-border/50 bg-white"><CardHeader><CardTitle className="text-2xl">Ringkasan</CardTitle></CardHeader><CardContent className="space-y-5"><div className="flex justify-between text-sm text-neutral-secondary"><span>Subtotal</span><span>{formatRupiah(total)}</span></div><div className="flex justify-between border-t border-border/50 pt-5 text-lg font-bold"><span>Total sementara</span><span>{formatRupiah(total)}</span></div><p className="text-sm leading-6 text-neutral-secondary">Ongkir dan metode pickup/delivery ditentukan saat checkout.</p><Button className="w-full" disabled={authContext === "personnel"} onClick={() => navigate("/inplace/checkout", { state: { source: "buy_now", items: items.map(({ product, qty }) => ({ product_id: product.product_id, qty, nama_barang: product.nama_barang, harga: product.harga })) } })}>Lanjut ke checkout</Button>{authContext === "personnel" && <p className="text-xs text-neutral-secondary">Akun staf hanya dapat melihat katalog.</p>}</CardContent></Card>
          </div>
        )}
      </main>
      <MarketplaceFooter />
    </div>
  );
}
