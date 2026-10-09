import { ArrowRight } from "lucide-react";
import { CardSpotlight } from "@/components/kokonutui/CardSpotlight";

interface BrandItem {
  id: string;
  name: string;
  origin: string;
  bannerImg?: string;
}

const BRANDS: BrandItem[] = [
  {
    id: "gshock",
    name: "G-SHOCK",
    origin: "Tough & Indestructible",
    bannerImg:
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "gshock",
    name: "G-SHOCK",
    origin: "Tough & Indestructible",
    bannerImg:
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "gshock",
    name: "G-SHOCK",
    origin: "Tough & Indestructible",
    bannerImg:
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "gshock",
    name: "G-SHOCK",
    origin: "Tough & Indestructible",
    bannerImg:
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "gshock",
    name: "G-SHOCK",
    origin: "Tough & Indestructible",
    bannerImg:
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "gshock",
    name: "G-SHOCK",
    origin: "Tough & Indestructible",
    bannerImg:
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80",
  },
];

interface BrandShowcaseProps {
  onSelectBrand?: (brandName: string) => void;
}

export function BrandShowcase({ onSelectBrand }: BrandShowcaseProps) {
  return (
    <section className="py-8 bg-neutral-100" data-purpose="top-brands-section">
      {/* Header Brand Terlaris */}
      <div className="flex items-center justify-between mb-6 max-w-7xl mx-auto px-4 lg:px-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Brand Terlaris
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onSelectBrand?.("")}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:text-black transition shadow-sm"
        >
          Lihat Semua Brand
          <ArrowRight className="ml-2 w-4 h-4" />
        </button>
      </div>

      {/* Grid of Brands */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4 lg:px-8">
        {BRANDS.map((brand) => {
          return (
            <CardSpotlight
              key={brand.id}
              spotlightColor="rgba(249, 115, 22, 0.18)"
              className="group cursor-pointer rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition duration-300 relative h-36 bg-gradient-to-r from-neutral-900 to-neutral-800"
              onClick={() => onSelectBrand?.(brand.name)}
            >
              <div className="absolute inset-0 flex items-center justify-between p-5 z-10 text-white">
                <div>
                  <span className="text-3xl font-black tracking-tighter uppercase font-sans">
                    {brand.name}
                  </span>
                  <span className="block text-[10px] font-semibold tracking-wider text-orange-400 uppercase mt-1">
                    {brand.origin}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition duration-300">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </div>
              {brand.bannerImg && (
                <img
                  src={brand.bannerImg}
                  alt={brand.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay group-hover:scale-105 transition duration-500"
                />
              )}
            </CardSpotlight>
          );
        })}
      </div>
    </section>
  );
}
