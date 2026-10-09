import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatedTabs } from "@/components/kokonutui/AnimatedTabs";
import { ProductCard } from "./ProductCard";
import { type Product } from "@/shared/types/catalog";

interface ProductCarouselRowProps {
  title: string;
  categoryFilterName?: string;
  products: Product[];
  totalCountText?: string;
  onViewAll?: () => void;
  onAddToCart?: (product: Product) => void;
  onOpenProduct?: (product: Product) => void;
}

const PAGE_SIZE = 4;
const MAX_PRODUCTS = 15;

export function ProductCarouselRow({
  title,
  categoryFilterName,
  products,
  totalCountText = "1.000+ Koleksi",
  onViewAll,
  onAddToCart,
  onOpenProduct,
}: ProductCarouselRowProps) {
  const [activeTab, setActiveTab] = useState("terbaru");
  const [currentPage, setCurrentPage] = useState(0);

  const tabs = [
    { id: "terbaru", label: "Terbaru" },
    { id: "terlaris", label: "Terlaris" },
  ];

  const displayProducts = [...products]
    .sort((a, b) => {
      if (activeTab === "terlaris") {
        return (b.stok || 0) - (a.stok || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, MAX_PRODUCTS);

  const pageCount = Math.ceil(displayProducts.length / PAGE_SIZE);
  const safePage = Math.min(currentPage, Math.max(pageCount - 1, 0));
  const pageProducts = displayProducts.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE
  );
  const showViewAllCard = displayProducts.length === MAX_PRODUCTS;
  const isLastPage = safePage === pageCount - 1;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 lg:px-8">
      <div className="flex items-center justify-between border-b border-gray-200 pb-3 pt-2">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-6 w-2.5 rounded-full bg-orange-600" />
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center text-sm font-semibold text-orange-600 transition hover:text-orange-700"
        >
          Lihat Semua
          <ArrowRight className="ml-1 h-4 w-4" />
        </button>
      </div>

      {displayProducts.length === 0 ? (
        <p className="py-4 text-sm text-neutral-500">Produk belum tersedia</p>
      ) : (
        <>
          <div className="mb-2">
            <AnimatedTabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(id) => {
                setActiveTab(id);
                setCurrentPage(0);
              }}
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 0))}
              disabled={safePage === 0}
              aria-label="Halaman produk sebelumnya"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {pageProducts.map((prod) => (
                <ProductCard
                  key={prod.product_id}
                  product={prod}
                  badgeText={activeTab === "terlaris" ? "Terlaris" : "Terbaru"}
                  onAddToCart={onAddToCart}
                  onOpenProduct={onOpenProduct}
                />
              ))}

              {showViewAllCard && isLastPage && (
                <button
                  type="button"
                  onClick={onViewAll}
                  className="flex min-h-full min-w-0 flex-col items-center justify-center rounded-xl border border-orange-200 bg-orange-50 p-3 text-center text-orange-600 transition hover:border-orange-600 hover:bg-orange-600 hover:text-white sm:p-4"
                >
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-orange-600 shadow-sm sm:h-12 sm:w-12">
                    <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <span className="text-xs font-bold leading-tight sm:text-sm">
                    Lihat Semua Produk {categoryFilterName || title} →
                  </span>
                  <span className="mt-1 text-[10px] font-medium opacity-80 sm:text-[11px]">
                    {totalCountText}
                  </span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(page + 1, pageCount - 1))}
              disabled={pageCount === 0 || safePage >= pageCount - 1}
              aria-label="Halaman produk berikutnya"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {Array.from({ length: pageCount }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentPage(index)}
                  aria-label={`Tampilkan halaman produk ${index + 1}`}
                  aria-current={safePage === index ? "true" : undefined}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    safePage === index
                      ? "w-6 bg-orange-600"
                      : "w-2 bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
