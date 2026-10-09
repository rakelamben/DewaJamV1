import { useState } from "react";
import { Heart, Watch as WatchIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { CardSpotlight } from "@/components/kokonutui/CardSpotlight";
import { type Product } from "@/shared/types/catalog";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  badgeText?: string;
  perkText?: string;
  retailPrice?: number;
  onAddToCart?: (product: Product) => void;
  onOpenProduct?: (product: Product) => void;
}

export function ProductCard({
  product,
  badgeText = "Terbaru",
  perkText,
  retailPrice,
  onOpenProduct,
}: ProductCardProps) {
  const location = useLocation();
  const detailPrefix = location.pathname.startsWith("/inplace") ? "/inplace/products" : "/products";
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imgError, setImgError] = useState(false);

  const numPrice =
    typeof product.harga === "string" ? parseFloat(product.harga) : product.harga;

  // Compute calculated retail strike-through price if not given
  const calculatedRetail = retailPrice ?? Math.round(numPrice * 1.45);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Default perk text if not provided
  const resolvedPerk =
    perkText ||
    (product.tags && product.tags.length > 0
      ? product.tags[0]
      : "Free Box & Baterai");

  return (
    <CardSpotlight
      spotlightColor="rgba(249, 115, 22, 0.12)"
      className="group flex min-w-0 w-full max-w-none flex-col justify-between rounded-xl border border-gray-200 bg-white p-3 transition duration-200 hover:shadow-md select-none sm:p-4"
    >
      <div>
        {/* Image & Badges */}
        <div className="aspect-square relative rounded-lg bg-gray-50/50 p-3 h-auto flex items-center w-full justify-center overflow-hidden mb-3 border border-gray-100">
          <span className="absolute top-2 left-2 z-10 bg-neutral-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
            {badgeText}
          </span>

          <button
            type="button"
            aria-label="Simpan ke favorit"
            onClick={(e) => {
              e.stopPropagation();
              setIsWishlisted(!isWishlisted);
            }}
            className="absolute top-2 right-2 z-10 text-gray-400 hover:text-rose-600 transition p-1 bg-white/80 rounded-full backdrop-blur-sm"
          >
            <Heart
              className={cn(
                "w-4 h-4 stroke-[2] transition-colors",
                isWishlisted
                  ? "fill-rose-600 text-rose-600"
                  : "text-gray-400 hover:text-rose-600"
              )}
            />
          </button>

          <Link
            to={`${detailPrefix}/${product.product_id}`}
            onClick={() => onOpenProduct?.(product)}
            aria-label={`Lihat detail ${product.nama_barang}`}
            className="flex h-full w-full items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
          >
            {product.gambar_url && !imgError ? (
              <img
                src={product.gambar_url}
                alt={product.nama_barang}
                onError={() => setImgError(true)}
                className="max-h-full object-contain group-hover:scale-105 transition duration-300 drop-shadow-sm aspect-square"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 gap-1.5">
                <WatchIcon className="w-12 h-12 stroke-[1.2] text-orange-400/80" />
                <span className="text-[10px] font-medium text-gray-400">
                  Original Watch
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Title */}
        <Link
          to={`${detailPrefix}/${product.product_id}`}
          onClick={() => onOpenProduct?.(product)}
          className="block text-xs font-semibold text-neutral-900 line-clamp-2 group-hover:text-orange-600 transition min-h-[32px] leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
        >
          {product.nama_barang}
        </Link>

        <p className="mt-1 text-[10px] font-medium text-gray-500">
          Terjual {new Intl.NumberFormat("id-ID").format(product.sold_count ?? 0)}
        </p>

        {/* Price Block */}
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-sm font-extrabold text-neutral-900">
            {formatRupiah(numPrice)}
          </span>
          <span className="text-[11px] text-gray-400 line-through">
            {formatRupiah(calculatedRetail)}
          </span>
        </div>

        {/* Perk Label */}
        {resolvedPerk && (
          <p className="mt-2 text-[10px] text-orange-600 font-semibold bg-orange-50 border border-orange-200 rounded px-2 py-0.5 inline-block capitalize">
            {resolvedPerk}
          </p>
        )}
      </div>

    </CardSpotlight>
  );
}
