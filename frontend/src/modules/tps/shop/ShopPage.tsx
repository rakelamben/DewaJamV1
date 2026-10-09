import { useEffect, useState, useMemo } from "react";
import publicApiClient from "@/shared/public-api-client";
import { type Product, type ProductListResponse } from "@/shared/types/catalog";
import { getCustomerCart } from "@/shared/cart-api";
import { useAuthContext } from "@/shared/use-auth-context";
import CustomerLoginModal from "@/modules/auth/CustomerLoginModal";
import { MarketplaceHeader } from "./components/MarketplaceHeader";
import { CategoryNavStrip } from "./components/CategoryNavStrip";
import { HeroBanner } from "./components/HeroBanner";
import { BrandShowcase } from "./components/BrandShowcase";
import { CategoryPromoBanner } from "./components/CategoryPromoBanner";
import { ProductCarouselRow } from "./components/ProductCarouselRow";
import { ValuePropositions } from "./components/ValuePropositions";
import { MarketplaceFooter } from "./components/MarketplaceFooter";

// Rich fallback products matching reference HTML design
const INITIAL_FALLBACK_PRODUCTS: Product[] = [
  // {
  //   product_id: "fb-1",
  //   nama_barang: "Seiko 5 Sports SRPD51K1 Automatic Blue Sunray Stainless",
  //   kategori: "Jam Tangan Pria",
  //   harga: 2990000,
  //   stok: 24,
  //   deskripsi: "Automatic movement cal 4R36, kaca Hardlex, 100m water resistant.",
  //   gambar_url:
  //     "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
  //   tags: ["Ekstra Strap Nato", "automatic", "seiko"],
  //   created_at: new Date().toISOString(),
  // },
  // {
  //   product_id: "fb-2",
  //   nama_barang: "Casio G-Shock GA-B2100-1A Carbon Core Tough Solar Bluetooth",
  //   kategori: "Jam Tangan Pria",
  //   harga: 1950000,
  //   stok: 18,
  //   deskripsi: "Carbon Core Guard, Tough Solar, Bluetooth smartphone link.",
  //   gambar_url:
  //     "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80",
  //   tags: ["Free Box & Baterai", "solar", "g-shock"],
  //   created_at: new Date().toISOString(),
  // },
  // {
  //   product_id: "fb-3",
  //   nama_barang: "Tissot PRX Powermatic 80 Dark Emerald Green Dial Automatic",
  //   kategori: "Jam Tangan Pria",
  //   harga: 10290000,
  //   stok: 6,
  //   deskripsi: "Swiss automatic movement, power reserve 80 jam, sapphire crystal.",
  //   gambar_url:
  //     "https://images.unsplash.com/photo-1547996160-71dfabb1d9ef?w=600&auto=format&fit=crop&q=80",
  //   tags: ["Bonus Obeng Strap", "swiss made", "automatic"],
  //   created_at: new Date().toISOString(),
  // },
  // {
  //   product_id: "fb-4",
  //   nama_barang: "Alba Mechanical AL4247X1 Automatic Rubber Strap Black Dial",
  //   kategori: "Jam Tangan Pria",
  //   harga: 1050000,
  //   stok: 15,
  //   deskripsi: "Automatic day-date, 100m water resistant, luminous hands.",
  //   gambar_url:
  //     "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80",
  //   tags: ["Free Leather Pouch", "alba", "diver"],
  //   created_at: new Date().toISOString(),
  // },
  // {
  //   product_id: "fb-5",
  //   nama_barang: "Alexandre Christie Passion AC 2A28 Stainless Steel Rose Gold",
  //   kategori: "Jam Tangan Wanita",
  //   harga: 1120000,
  //   stok: 12,
  //   deskripsi: "Rose gold case dengan dial mutiara elegan dan aksen kristal.",
  //   gambar_url:
  //     "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80",
  //   tags: ["Free Box & Baterai", "rose gold", "wanita"],
  //   created_at: new Date().toISOString(),
  // },
  // {
  //   product_id: "fb-6",
  //   nama_barang: "Casio Baby-G BA-110RG Pastel Pink Gold Shock Resistant",
  //   kategori: "Jam Tangan Wanita",
  //   harga: 1450000,
  //   stok: 20,
  //   deskripsi: "Shock resistant tahan benturan, water resistant 100 meter, sporty.",
  //   gambar_url:
  //     "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80",
  //   tags: ["Ekstra Strap Nato", "baby-g", "sporty"],
  //   created_at: new Date().toISOString(),
  // },
  // {
  //   product_id: "fb-7",
  //   nama_barang: "Tissot PRX 35mm Emerald Dial Powermatic 80 Unisex Classic",
  //   kategori: "Jam Tangan Wanita",
  //   harga: 9850000,
  //   stok: 5,
  //   deskripsi: "Ukuran proporsional 35mm, dial hijau zamrud, movement otomatis.",
  //   gambar_url:
  //     "https://images.unsplash.com/photo-1547996160-71dfabb1d9ef?w=600&auto=format&fit=crop&q=80",
  //   tags: ["Bonus Obeng Strap", "swiss made", "luxury"],
  //   created_at: new Date().toISOString(),
  // },
  // {
  //   product_id: "fb-8",
  //   nama_barang: "Garmin Venu Sq 2 Shadow Gray AMOLED Smartwatch Health",
  //   kategori: "Smartwatch",
  //   harga: 3399000,
  //   stok: 14,
  //   deskripsi: "Layar cerah AMOLED, pelacak tidur, detak jantung, baterai 11 hari.",
  //   gambar_url:
  //     "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80",
  //   tags: ["Garansi 2 Tahun", "garmin", "smartwatch"],
  //   created_at: new Date().toISOString(),
  // },
  // {
  //   product_id: "fb-9",
  //   nama_barang: "Strap Kulit Asli Vintage Horween Crazy Horse Quick Release 20mm",
  //   kategori: "Strap & Aksesoris",
  //   harga: 1750000,
  //   stok: 35,
  //   deskripsi: "Kulit sapi asli Horween vintage, jahitan tangan, quick release pin.",
  //   gambar_url:
  //     "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=600&auto=format&fit=crop&q=80",
  //   tags: ["Bonus Obeng Strap", "genuine leather", "horween"],
  //   created_at: new Date().toISOString(),
  // },
  // {
  //   product_id: "fb-10",
  //   nama_barang: "Casio Baby-G BA-110RG Shock Resistant Jam Tangan Anak & Remaja",
  //   kategori: "Jam Tangan Anak-anak",
  //   harga: 1450000,
  //   stok: 16,
  //   deskripsi: "Resin band tahan banting, display analog-digital ganda, LED light.",
  //   gambar_url:
  //     "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80",
  //   tags: ["Free Box & Baterai", "tahan banting", "anak"],
  //   created_at: new Date().toISOString(),
  // },
  // {
  //   product_id: "fb-11",
  //   nama_barang: "Casio Tough Resin Shock Proof Compact Sport Series",
  //   kategori: "Jam Tangan Anak-anak",
  //   harga: 890000,
  //   stok: 22,
  //   deskripsi: "Desain kokoh dan ringan, cocok untuk aktivitas harian dan olahraga.",
  //   gambar_url:
  //     "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80",
  //   tags: ["Ekstra Strap Nato", "water resistant", "sport"],
  //   created_at: new Date().toISOString(),
  // },
  // {
  //   product_id: "fb-12",
  //   nama_barang: "Strap Rubber Silicone Quick Release 18mm, 20mm & 22mm Sport",
  //   kategori: "Strap & Aksesoris",
  //   harga: 120000,
  //   stok: 40,
  //   deskripsi: "Bahan silikon lembut anti keringat, buckle stainless steel tahan karat.",
  //   gambar_url:
  //     "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=600&auto=format&fit=crop&q=80",
  //   tags: ["Garansi 2 Tahun", "waterproof", "silicone"],
  //   created_at: new Date().toISOString(),
  // },
];

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_FALLBACK_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [catalogError, setCatalogError] = useState(false);
  const { authContext } = useAuthContext();

  // Fetch product catalog from backend (Read-Only)
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const res = await publicApiClient.get<ProductListResponse>(
          "/api/v1/tps/catalog/products",
          { params: { limit: 15 } }
        );
        setProducts(res.data.items.slice(0, 15));
        setCatalogError(false);
      } catch (error) {
        console.error("Gagal memuat katalog produk:", error);
        setCatalogError(true);
      }
    }
    fetchCatalog();
  }, []);

  useEffect(() => {
    if (authContext !== "customer") {
      return;
    }

    let active = true;
    void getCustomerCart()
      .then((cart) => {
        if (active) setCartCount(cart.total_items);
      })
      .catch(() => {
        if (active) setCartCount(0);
      });

    return () => {
      active = false;
    };
  }, [authContext]);

  // Filter products by global search query and category nav
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory) {
      list = list.filter((p) => p.kategori === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.nama_barang.toLowerCase().includes(q) ||
          p.kategori.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, selectedCategory, searchQuery]);

  // Group products into the 4 structured carousel segments
  const brandPilihanProducts = useMemo(() => {
    return filteredProducts;
  }, [filteredProducts]);

  const priaProducts = useMemo(() => {
    const list = filteredProducts.filter((p) => p.kategori === "Jam Tangan Pria");
    return list.length > 0
      ? list
      : INITIAL_FALLBACK_PRODUCTS.filter((p) => p.kategori === "Jam Tangan Pria");
  }, [filteredProducts]);

  const wanitaProducts = useMemo(() => {
    const list = filteredProducts.filter((p) => p.kategori === "Jam Tangan Wanita");
    return list.length > 0
      ? list
      : INITIAL_FALLBACK_PRODUCTS.filter((p) => p.kategori === "Jam Tangan Wanita");
  }, [filteredProducts]);

  const anakProducts = useMemo(() => {
    const list = filteredProducts.filter(
      (p) =>
        p.kategori === "Jam Tangan Anak-anak"
        // p.kategori === "Strap & Aksesoris"
    );
    return list.length > 0
      ? list
      : INITIAL_FALLBACK_PRODUCTS.filter(
          (p) =>
            p.kategori === "Jam Tangan Anak-anak"
            // p.kategori === "Strap & Aksesoris"
        );
  }, [filteredProducts]);

  const aksesorisProducts = useMemo(() => {
    const list = filteredProducts.filter((p) => p.kategori === "Strap & Aksesoris");
    return list.length > 0
      ? list
      : INITIAL_FALLBACK_PRODUCTS.filter((p) => p.kategori === "Strap & Aksesoris");
  }, [filteredProducts]);

  const handleAddToCart = () => {
    void getCustomerCart()
      .then((cart) => setCartCount(cart.total_items))
      .catch(() => setCartCount(0));
  };

  const scrollToCatalog = () => {
    const el = document.getElementById("katalog-produk");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-[#f8fafc] text-neutral-800 min-h-screen selection:bg-orange-500 selection:text-white">
      {/* 1. Header & Navigation System */}
      <MarketplaceHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        cartCount={authContext === "customer" ? cartCount : 0}
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 pb-8 space-y-6">
        {/* 2. Category Quick-Nav Strip */}
        <CategoryNavStrip
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            if (cat) {
              scrollToCatalog();
            }
          }}
        />

        {/* 3. Hero Promotional Section */}
        <HeroBanner />

      </div>
      {/* 4. Featured Brands (Brand Terlaris) */}
      <BrandShowcase
        onSelectBrand={(brandName) => {
          setSearchQuery(brandName);
          if (brandName) {
            scrollToCatalog();
          }
        }}
      />

      {/* 5. Product Catalog Feeds (4 Segmen Komprehensif) */}
      <section
        id="katalog-produk"
        className="space-y-16 pt-4"
        data-purpose="comprehensive-product-catalog"
      >
        {catalogError && (
          <p role="alert" className="text-sm text-red-700">
            Katalog produk gagal dimuat. Silakan coba lagi nanti.
          </p>
        )}

        {/* KATEGORI 1: Brand Pilihanmu */}
        <div className="space-y-4">
          <CategoryPromoBanner variant="brand-pilihanmu" />
          <ProductCarouselRow
            title="Brand Pilihanmu"
            categoryFilterName="Brand Pilihanmu"
            products={brandPilihanProducts}
            totalCountText="1.200+ Seri Lengkap"
            onViewAll={scrollToCatalog}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* KATEGORI 2: Koleksi Jam Tangan Pria */}
        <div className="space-y-4">
          <CategoryPromoBanner variant="jam-tangan-pria" />
          <ProductCarouselRow
            title="Koleksi Jam Tangan Pria"
            categoryFilterName="Koleksi Pria"
            products={priaProducts}
            totalCountText="3.450+ Koleksi Pria"
            onViewAll={scrollToCatalog}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* KATEGORI 3: Koleksi Jam Tangan Wanita */}
        <div className="space-y-4">
          <CategoryPromoBanner variant="jam-tangan-wanita" />
          <ProductCarouselRow
            title="Koleksi Jam Tangan Wanita"
            categoryFilterName="Koleksi Wanita"
            products={wanitaProducts}
            totalCountText="2.180+ Koleksi Wanita"
            onViewAll={scrollToCatalog}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* KATEGORI 4: Koleksi Jam Tangan Anak-Anak & Aksesoris / Strap */}
        <div className="space-y-4">
          <CategoryPromoBanner variant="jam-tangan-anak" />
          <ProductCarouselRow
            title="Koleksi Jam Tangan Anak-Anak"
            categoryFilterName="Anak & Strap"
            products={anakProducts}
            totalCountText="1.890+ Pilihan Strap"
            onViewAll={scrollToCatalog}
            onAddToCart={handleAddToCart}
          />
        </div>
        
        {/* KATEGORI 5: Koleksi Aksesoris / Strap */}
        <div className="space-y-4">
          <CategoryPromoBanner variant="aksesoris" />
          <ProductCarouselRow
            title="Koleksi Aksesoris"
            categoryFilterName="Strap"
            products={aksesorisProducts}
            totalCountText="1.890+ Pilihan Strap"
            onViewAll={scrollToCatalog}
            onAddToCart={handleAddToCart}
          />
        </div>
      </section>

      {/* 6. Value Propositions (Keuntungan Belanja 5-Pilar) */}
      <ValuePropositions />

      {/* 7. Global Comprehensive Footer */}
      <MarketplaceFooter />

      {/* Modal Login Customer */}
      <CustomerLoginModal
        open={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
