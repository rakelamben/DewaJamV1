import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import publicApiClient from "@/shared/public-api-client";
import apiClient from "@/shared/api-client";
import type { Product, ProductCategory, ProductListResponse } from "@/shared/types/catalog";

type CartLine = { product: Product; qty: number };
type Customer = { customer_id: string; nama: string; no_hp: string };
type Receipt = {
  transaction_id: string;
  no_invoice: string;
  customer_name: string;
  customer_phone: string;
  items: Array<{ product_id: string; nama_barang: string; harga_satuan: number | string; qty: number; subtotal: number | string }>;
  subtotal: number | string;
  total_harga: number | string;
  paid_amount: number | string;
  change_amount: number | string;
  payment_method: string;
};

const categories: Array<"Semua" | ProductCategory> = ["Semua", "Jam Tangan Pria", "Jam Tangan Wanita", "Jam Tangan Anak-anak", "Smartwatch", "Jam Tangan Luxury", "Strap & Aksesoris"];
const money = (value: number | string) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value));

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<"Semua" | ProductCategory>("Semua");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void publicApiClient.get<ProductListResponse>("/api/v1/tps/catalog/products", { params: { limit: 100 } }).then((response) => setProducts(response.data.items));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = category === "Semua" || product.kategori === category;
    const text = `${product.nama_barang} ${product.brand ?? ""}`.toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase());
  }), [category, products, query]);
  const subtotal = cart.reduce((sum, line) => sum + Number(line.product.harga) * line.qty, 0);
  const paid = Number(paidAmount) || 0;
  const change = Math.max(0, paid - subtotal);

  const addProduct = (product: Product) => {
    setCart((current) => {
      const existing = current.find((line) => line.product.product_id === product.product_id);
      if (existing) return current.map((line) => line.product.product_id === product.product_id ? { ...line, qty: Math.min(product.stok, line.qty + 1) } : line);
      return [...current, { product, qty: 1 }];
    });
  };

  const updateQty = (productId: string, qty: number) => setCart((current) => current.map((line) => line.product.product_id === productId ? { ...line, qty: Math.max(1, Math.min(line.product.stok, qty)) } : line));
  const removeLine = (productId: string) => setCart((current) => current.filter((line) => line.product.product_id !== productId));

  const lookupCustomer = async () => {
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) return;
    if (normalizedPhone === "9999") {
      setCustomer(null);
      setCustomerName("Customer Umum");
      return;
    }
    try {
      const response = await apiClient.get<Customer | null>("/api/v1/tps/sales/pos/customers", { params: { phone: normalizedPhone } });
      setCustomer(response.data);
      setCustomerName(response.data?.nama ?? customerName);
    } catch {
      setCustomer(null);
    }
  };

  const submitPayment = async () => {
    if (!cart.length) return;
    if (paid < subtotal) {
      setToast("Pembayaran gagal: nominal pembayaran kurang.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiClient.post<Receipt>("/api/v1/tps/sales/pos/transactions", {
        items: cart.map((line) => ({ product_id: line.product.product_id, qty: line.qty })),
        customer_phone: phone.trim() || undefined,
        customer_name: customerName.trim() || undefined,
        paid_amount: paid,
        payment_method: paymentMethod,
      });
      setReceipt(response.data);
      setCart([]);
      setCheckoutOpen(false);
      setReceiptOpen(true);
      setToast("Pembayaran berhasil disimpan.");
    } catch {
      setToast("Pembayaran gagal. Periksa stok dan data pembayaran.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetSale = () => {
    setReceiptOpen(false);
    setReceipt(null);
    setPhone("");
    setCustomerName("");
    setCustomer(null);
    setPaidAmount("");
    setPaymentMethod("cash");
  };

  return (
    <>
      <main className="min-w-0 flex-1 overflow-x-hidden bg-neutral-light p-4 text-neutral-primary sm:p-5 lg:p-6">
        <header className="mb-5 flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-widest text-brand-orange">Operasional</p><h1 className="font-serif text-3xl">Kasir POS</h1></div><span className="rounded-full bg-white px-3 py-1 text-sm text-neutral-secondary shadow-sm">Mode transaksi</span></header>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-secondary" /><Input className="pl-9" placeholder="Cari nama atau brand produk..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><Select value={category} onValueChange={(value) => setCategory(value as typeof category)}><SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectLabel>Kategori</SelectLabel>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
            <div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <Button key={item} type="button" size="sm" variant={category === item ? "default" : "outline"} onClick={() => setCategory(item)}>{item}</Button>)}</div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filteredProducts.map((product) => <Card key={product.product_id} className="overflow-hidden bg-white"><div className="flex h-36 items-center justify-center bg-neutral-light p-4">{product.gambar_url ? <img src={product.gambar_url} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-neutral-secondary">Tidak ada gambar</span>}</div><CardContent className="space-y-2 p-4"><h2 className="line-clamp-2 min-h-10 font-semibold">{product.nama_barang}</h2><p className="font-bold text-brand-orange">{money(product.harga)}</p><p className="text-xs text-neutral-secondary">Stok: {product.stok}</p><Button className="w-full" disabled={product.stok < 1} onClick={() => addProduct(product)}>{product.stok < 1 ? "Stok habis" : "Tambah ke cart"}</Button></CardContent></Card>)}</div>
          </section>
           <Card className="h-fit min-w-0 bg-white xl:sticky xl:top-6"><CardHeader><CardTitle>Cart ({cart.reduce((sum, line) => sum + line.qty, 0)})</CardTitle></CardHeader><CardContent className="min-w-0 space-y-4">{cart.length === 0 ? <p className="py-10 text-center text-sm text-neutral-secondary">Belum ada produk dipilih.</p> : <div className="max-h-[42vh] space-y-3 overflow-y-auto">{cart.map((line) => <div key={line.product.product_id} className="border-b border-border pb-3"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{line.product.nama_barang}</p><p className="text-sm text-neutral-secondary">{money(line.product.harga)}</p></div><button type="button" aria-label={`Hapus ${line.product.nama_barang}`} className="shrink-0 text-red-600" onClick={() => removeLine(line.product.product_id)}><Trash2 className="h-4 w-4" /></button></div><div className="mt-2 flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Kurangi quantity" onClick={() => updateQty(line.product.product_id, line.qty - 1)} disabled={line.qty <= 1}><Minus className="h-4 w-4" /></Button><span className="min-w-8 text-center">{line.qty}</span><Button variant="outline" size="icon" aria-label="Tambah quantity" onClick={() => updateQty(line.product.product_id, line.qty + 1)} disabled={line.qty >= line.product.stok}><Plus className="h-4 w-4" /></Button><span className="ml-auto shrink-0 font-semibold">{money(Number(line.product.harga) * line.qty)}</span></div></div>)}</div>}<div className="flex justify-between border-t border-border pt-4 text-lg font-bold"><span>Total</span><span>{money(subtotal)}</span></div><Button className="w-full" disabled={!cart.length} onClick={() => setCheckoutOpen(true)}>Checkout</Button></CardContent></Card>
        </div>
       </main>
       {toast && <div role="status" className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-2 rounded-md bg-neutral-primary px-4 py-3 text-sm text-white shadow-lg"><Check className="h-4 w-4 text-emerald-300" />{toast}</div>}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}><DialogContent><DialogHeader><DialogTitle>Checkout POS</DialogTitle><DialogDescription>Lengkapi pembayaran dan identitas pembeli.</DialogDescription></DialogHeader><div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Nomor HP (opsional, 9999 = anonim)" value={phone} onChange={(event) => { const nextPhone = event.target.value; setPhone(nextPhone); setCustomer(null); if (nextPhone.trim() === "9999") setCustomerName("Customer Umum"); else if (phone.trim() === "9999") setCustomerName(""); }} onBlur={() => void lookupCustomer()} /><Input placeholder="Nama pembeli" value={customerName} onChange={(event) => setCustomerName(event.target.value)} disabled={phone.trim() === "9999"} /></div>{customer && <p className="text-sm text-emerald-700">Customer ditemukan: {customer.nama}</p>}<div className="rounded-md bg-neutral-light p-3"><div className="flex justify-between"><span>Total harga</span><strong>{money(subtotal)}</strong></div><div className="mt-1 flex justify-between text-sm text-neutral-secondary"><span>Kembalian</span><span>{money(change)}</span></div></div><Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Tunai</SelectItem><SelectItem value="card">Kartu</SelectItem><SelectItem value="qris">QRIS</SelectItem></SelectContent></Select><div className="flex gap-2"><Input type="number" min="0" placeholder="Nominal pembayaran" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} /><Button type="button" variant="outline" onClick={() => setPaidAmount(String(subtotal))}>Exact</Button></div></div><DialogFooter><Button variant="outline" onClick={() => setCheckoutOpen(false)}>Kembali</Button><Button onClick={() => void submitPayment()} disabled={submitting}>{submitting ? "Menyimpan…" : "Submit pembayaran"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}><DialogContent><DialogHeader><DialogTitle>Struk pembelian</DialogTitle><DialogDescription>{receipt?.no_invoice} · {receipt?.customer_name}</DialogDescription></DialogHeader>{receipt && <div className="space-y-3 text-sm" id="pos-receipt"><div className="space-y-2">{receipt.items.map((item) => <div key={item.product_id} className="flex justify-between gap-3"><span>{item.nama_barang} × {item.qty}</span><span>{money(item.subtotal)}</span></div>)}</div><div className="space-y-1 border-t border-border pt-3"><div className="flex justify-between"><span>Total</span><strong>{money(receipt.total_harga)}</strong></div><div className="flex justify-between"><span>Dibayar</span><span>{money(receipt.paid_amount)}</span></div><div className="flex justify-between font-bold"><span>Kembalian</span><span>{money(receipt.change_amount)}</span></div></div></div>}<DialogFooter><Button variant="outline" onClick={resetSale}>Kembali ke catalog</Button><Button onClick={() => window.print()}>Cetak</Button></DialogFooter></DialogContent></Dialog>
      </>
  );
}
