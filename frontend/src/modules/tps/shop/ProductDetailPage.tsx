import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Check,
  Minus,
  PackageCheck,
  Plus,
  ShoppingCart,
  Watch as WatchIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomerLoginModal from "@/modules/auth/CustomerLoginModal";
import { addToSessionCart, getCartCount, readSessionCart } from "@/shared/cart";
import { addCustomerCartItem, getCustomerCart } from "@/shared/cart-api";
import { useAuthContext } from "@/shared/use-auth-context";
import publicApiClient from "@/shared/public-api-client";
import type { Product } from "@/shared/types/catalog";
import { MarketplaceFooter } from "./components/MarketplaceFooter";
import { MarketplaceHeader } from "./components/MarketplaceHeader";

function formatRupiah(value: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(typeof value === "string" ? Number(value) : value);
}

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { authContext } = useAuthContext();
  const isInplace = location.pathname.startsWith("/inplace/");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [cartCount, setCartCount] = useState(() => (isInplace ? getCartCount() : 0));
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"cart" | "buy" | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProduct() {
      if (!productId) {
        setError("Produk tidak ditemukan.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await publicApiClient.get<Product>(
          `/api/v1/tps/catalog/products/${productId}`,
        );
        if (active) {
          setProduct(response.data);
          setQty(response.data.stok > 0 ? 1 : 0);
          setError(null);
        }
      } catch {
        if (active) setError("Produk tidak ditemukan atau gagal dimuat.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProduct();
    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    if (!isInplace && authContext === "customer") {
      void getCustomerCart().then((cart) => setCartCount(cart.total_items)).catch(() => undefined);
      return;
    }
    const updateCart = () => setCartCount(getCartCount(readSessionCart()));
    window.addEventListener("dewa-jam:cart-updated", updateCart);
    return () => window.removeEventListener("dewa-jam:cart-updated", updateCart);
  }, [authContext, isInplace]);

  const maxQty = product?.stok ?? 0;
  const brandLabel = product?.brand?.trim() || "Brand belum ditentukan";
  const soldLabel = product?.sold_count == null ? null : `${product.sold_count} terjual`;
  const detailBackPath = isInplace ? "/inplace" : "/";
  const loginMessage = isInplace
    ? "Masuk untuk melanjutkan ke checkout."
    : "Masuk untuk menambahkan produk ke keranjang dan melanjutkan pembelian.";

  const performAction = async (action: "cart" | "buy") => {
    if (!product || product.stok < 1) return;
    if (action === "buy" && !isInplace) {
      navigate("/checkout", {
        state: {
          source: "buy_now",
           items: [{ product_id: product.product_id, qty, nama_barang: product.nama_barang, harga: product.harga }],
        },
      });
      return;
    }
    if (isInplace) {
      addToSessionCart(product, qty);
      setCartCount(getCartCount());
    } else {
      const cart = await addCustomerCartItem(product.product_id, qty);
      setCartCount(cart.total_items);
    }
    setAdded(true);
    if (action === "buy") navigate(isInplace ? "/inplace/cart" : "/cart");
  };

  const requestAction = (action: "cart" | "buy") => {
    if (!product || product.stok < 1) return;
    if (authContext === "personnel") return;
    if (!isInplace && !authContext) {
      setPendingAction(action);
      setLoginOpen(true);
      return;
    }
    if (isInplace && action === "buy" && !authContext) {
      setPendingAction(action);
      setLoginOpen(true);
      return;
    }
    void performAction(action);
  };

  const scrollToDetail = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (loading) {
    return <div className="min-h-screen bg-bg-cream p-8 text-neutral-secondary">Memuat detail produk…</div>;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-bg-cream px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error ?? "Produk tidak tersedia."}</AlertDescription>
          </Alert>
          <Button asChild variant="secondary" className="mt-6">
            <Link to={detailBackPath}><ArrowLeft className="mr-2 h-4 w-4" />Kembali ke katalog</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-primary">
      <MarketplaceHeader
        searchQuery=""
        onSearchChange={() => undefined}
        onOpenLoginModal={() => setLoginOpen(true)}
        cartCount={cartCount}
        cartPath={isInplace ? "/inplace/cart" : "/cart"}
      />
      <main className="mx-auto max-w-7xl px-4 pt-4 pb-14 lg:px-10">
        <Link to={detailBackPath} className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-teal hover:text-accent-teal-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40">
          <ArrowLeft className="h-4 w-4" /> Kembali ke katalog
        </Link>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" aria-labelledby="product-title">
          <Card className="overflow-hidden border-border/50 bg-white">
            <div className="flex min-h-[360px] items-center justify-center bg-neutral-light sm:min-h-[520px]">
              {product.gambar_url ? (
                <img src={product.gambar_url} alt={product.nama_barang} className="max-h-[460px] w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-neutral-secondary">
                  <WatchIcon className="h-24 w-24 stroke-1 text-brand-orange" />
                  <span className="text-sm">Foto produk belum tersedia</span>
                </div>
              )}
            </div>
          </Card>

          <div>
          {/* <Card className="border-border/50 bg-white"> */}
            <div className="space-y-4">
            {/* <CardHeader className="space-y-4"> */}
              {/* <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{product.kategori}</Badge>
                {product.stok > 0 && <Badge className="border-transparent bg-accent-teal-light text-accent-teal">Tersedia</Badge>}
              </div> */}
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-teal">{brandLabel}</p>
              <CardTitle id="product-title" className="text-2xl leading-tight  font-semibold sm:text-3xl">{product.nama_barang}</CardTitle>
              <div className="flex flex-wrap gap-2 text-sm text-neutral-secondary">
                {soldLabel && <span>{soldLabel}</span>}
                {soldLabel && <span aria-hidden="true">·</span>}
                <span>{product.stok} stok tersedia</span>
              </div>
            {/* </CardHeader> */}
            </div>
            <div className="mt-4 space-y-4">
            {/* <CardContent className="space-y-6"> */}
              <p className="text-3xl font-bold text-neutral-primary">{formatRupiah(product.harga)}</p>
              <div className="space-y-2">
                <div
                  role="group"
                  aria-label="Pilih jumlah produk"
                  className="inline-flex h-10 items-center overflow-hidden rounded-md border border-input"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Kurangi jumlah"
                    disabled={qty <= 1 || !maxQty}
                    onClick={() => setQty((value) => Math.max(1, value - 1))}
                    className="h-full w-10 rounded-none border-r border-input"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span
                    aria-live="polite"
                    className="flex min-w-12 items-center justify-center px-3 text-sm font-medium tabular-nums"
                  >
                    {qty}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Tambah jumlah"
                    disabled={qty >= maxQty || !maxQty}
                    onClick={() => setQty((value) => Math.min(maxQty, value + 1))}
                    className="h-full w-10 rounded-none border-l border-input"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {authContext === "personnel" && <Alert><AlertDescription>Akun staf hanya dapat melihat katalog. Aksi pembelian dinonaktifkan.</AlertDescription></Alert>}
              {added && <Alert><Check className="h-4 w-4" /><AlertDescription>Produk berhasil ditambahkan ke keranjang.</AlertDescription></Alert>}
              <div className="grid gap-3 sm:grid-cols-2 pb-4">
                <Button type="button" variant="secondary" disabled={!maxQty || authContext === "personnel"} onClick={() => requestAction("cart")}><ShoppingCart className="mr-2 h-5 w-5" />Keranjang</Button>
                <Button type="button" disabled={!maxQty || authContext === "personnel"} onClick={() => requestAction("buy")}>Beli sekarang</Button>
              </div>

              <Separator />
              <div className="flex items-start gap-3 text-sm text-neutral-secondary"><PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" /><span>{isInplace ? "Pembayaran online dan pickup di pickup point toko." : "Pembayaran online dengan pilihan delivery atau pickup di toko."}</span></div>
            {/* </CardContent> */}
            </div>
          {/* </Card> */}
          </div>
        </section>

        <section className="grid scroll-mt-24 gap-5" aria-label="Informasi tambahan produk" >
          <div className="sticky top-[72px] z-40 -mx-4 bg-white/95 px-4 py-2 backdrop-blur lg:-mx-10 lg:px-10">
            <Tabs
              defaultValue="spesifikasi"
              onValueChange={(value) => scrollToDetail(`detail-${value}`)}
            >
              <TabsList variant="line" className="mb-0 w-full gap-1 sm:gap-5">
                <TabsTrigger
                  value="spesifikasi"
                  className="rounded-none border-b-2 border-transparent px-2 py-2.5 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-3 sm:text-sm"
                >
                  Spesifikasi
                </TabsTrigger>
                <TabsTrigger
                  value="deskripsi"
                  className="rounded-none border-b-2 border-transparent px-2 py-2.5 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-3 sm:text-sm"
                >
                  Deskripsi
                </TabsTrigger>
                <TabsTrigger
                  value="review"
                  className="rounded-none border-b-2 border-transparent px-2 py-2.5 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-3 sm:text-sm"
                >
                  Review
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Card id="detail-spesifikasi" className="p-8 scroll-mt-24 border-border/50 bg-white">
            <CardHeader><CardTitle className="text-2xl">Spesifikasi</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4 border-b border-border/50 pb-2"><span className="text-neutral-secondary">Brand</span><span className="font-medium text-right">{brandLabel}</span></div>
              <div className="flex justify-between gap-4 border-b border-border/50 pb-2"><span className="text-neutral-secondary">Kategori</span><span className="font-medium text-right">{product.kategori}</span></div>
              <div className="flex justify-between gap-4 border-b border-border/50 pb-2"><span className="text-neutral-secondary">Stok</span><span className="font-medium text-right">{product.stok} tersedia</span></div>
              <div className="flex justify-between gap-4 border-b border-border/50 pb-2"><span className="text-neutral-secondary">Terjual</span><span className="font-medium text-right">{product.sold_count ?? 0} produk</span></div>
            </CardContent>
          </Card>

          <Card id="detail-deskripsi" className="p-8 scroll-mt-24 border-border/50 bg-white">
            <CardHeader><CardTitle className="text-2xl">Deskripsi produk</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-line leading-8 text-neutral-secondary">{product.deskripsi || "Deskripsi produk belum tersedia."}</p></CardContent>
          </Card>

          <Card id="detail-review" className="p-8 scroll-mt-24 border-border/50 bg-white">
            <CardHeader><CardTitle className="text-2xl">Review</CardTitle></CardHeader>
            <CardContent><p className="text-neutral-secondary">Belum ada review untuk produk ini.</p></CardContent>
          </Card>
        </section>
      </main>
      <MarketplaceFooter />
      <CustomerLoginModal open={loginOpen} onClose={() => { setLoginOpen(false); setPendingAction(null); }} onSuccess={() => { if (pendingAction) void performAction(pendingAction); setPendingAction(null); }} message={loginMessage} />
    </div>
  );
}
