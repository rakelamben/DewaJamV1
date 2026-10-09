import type { ReactNode } from "react";
import { type ProductCategory } from "@/shared/types/catalog";
import { cn } from "@/lib/utils";

interface CategoryNavStripProps {
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}

interface NavCategoryItem {
  id: string;
  label: string;
  kategoriValue: ProductCategory | null;
  badge?: string;
  badgeColor?: string;
  bgColor: string;
  textColor: string;
  icon: ReactNode;
}

export function CategoryNavStrip({
  selectedCategory,
  onSelectCategory,
}: CategoryNavStripProps) {
  const categories: NavCategoryItem[] = [
    {
      id: "jam-pria",
      label: "Jam Pria",
      kategoriValue: "Jam Tangan Pria",
      bgColor: "bg-gray-100 border-gray-200 text-gray-700 group-hover:bg-orange-600 group-hover:text-white",
      textColor: "group-hover:text-orange-600",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="7"></circle>
          <path d="M12 9v3l1.5 1.5M9 5V2h6v3M9 19v3h6v-3" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
      ),
    },
    {
      id: "jam-wanita",
      label: "Jam Wanita",
      kategoriValue: "Jam Tangan Wanita",
      bgColor: "bg-gray-100 border-gray-200 text-gray-700 group-hover:bg-orange-600 group-hover:text-white",
      textColor: "group-hover:text-orange-600",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="6"></circle>
          <path d="M10 6V3h4v3M10 18v3h4v-3M12 9v3l1 1" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
      ),
    },
    {
      id: "jam-anak",
      label: "Jam Anak",
      kategoriValue: "Jam Tangan Anak-anak",
      bgColor: "bg-gray-100 border-gray-200 text-gray-700 group-hover:bg-orange-600 group-hover:text-white",
      textColor: "group-hover:text-orange-600",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
      ),
    },
    {
      id: "smartwatch",
      label: "Smartwatch",
      kategoriValue: "Smartwatch",
      bgColor: "bg-gray-100 border-gray-200 text-gray-700 group-hover:bg-orange-600 group-hover:text-white",
      textColor: "group-hover:text-orange-600",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect height="16" rx="3" width="10" x="7" y="4"></rect>
          <path d="M11 8h2M11 16h2" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
      ),
    },
    {
      id: "luxurywatch",
      label: "Luxury Watch",
      kategoriValue: "Jam Tangan Luxury",
      bgColor: "bg-yellow-50 border-yellow-300 text-yellow-700 group-hover:bg-yellow-600 group-hover:text-white",
      textColor: "group-hover:text-yellow-700",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      ),
    },
    {
      id: "strap",
      label: "Strap & Aksesoris",
      kategoriValue: "Strap & Aksesoris",
      bgColor: "bg-gray-100 border-gray-200 text-gray-700 group-hover:bg-orange-600 group-hover:text-white",
      textColor: "group-hover:text-orange-600",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 3v18M15 3v18M9 9h6M9 15h6" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
      ),
    },
    {
      id: "all",
      label: "Semua Koleksi",
      kategoriValue: null,
      bgColor: "bg-gray-100 border-gray-200 text-gray-700 group-hover:bg-black group-hover:text-white",
      textColor: "group-hover:text-black",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect height="7" width="7" x="3" y="3"></rect>
          <rect height="7" width="7" x="14" y="3"></rect>
          <rect height="7" width="7" x="14" y="14"></rect>
          <rect height="7" width="7" x="3" y="14"></rect>
        </svg>
      ),
    },
  ];

  return (
    <div className="py-2 mb-6 overflow-x-auto scrollbar-none">
      <div className="flex items-center justify-evenly min-w-[760px] gap-4">
        {categories.map((cat) => {
          const isSelected =
            (cat.kategoriValue === null && selectedCategory === null && cat.id === "all") ||
            (cat.kategoriValue !== null && selectedCategory === cat.kategoriValue);

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.kategoriValue)}
              className="flex flex-col items-center group cursor-pointer w-20 focus:outline-none"
            >
              <div
                className={cn(
                  "relative w-12 h-12 rounded-full border flex items-center justify-center transition shadow-sm",
                  cat.bgColor,
                  isSelected && "ring-2 ring-orange-500 ring-offset-2 scale-105"
                )}
              >
                {cat.icon}
                {cat.badge && (
                  <span
                    className={cn(
                      "absolute -top-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-tighter",
                      cat.badgeColor
                    )}
                  >
                    {cat.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium mt-2 text-gray-800 text-center transition",
                  cat.textColor,
                  isSelected && "font-bold text-orange-600"
                )}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
