import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, LogOut, User as UserIcon } from "lucide-react";
import { supabase } from "@/shared/auth";

interface MarketplaceHeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenLoginModal: () => void;
  cartCount?: number;
  cartPath?: string;
}

export function MarketplaceHeader({
  searchQuery,
  onSearchChange,
  onOpenLoginModal,
  cartCount = 0,
  cartPath = "/cart",
}: MarketplaceHeaderProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUserEmail(session?.user?.email ?? null);
    }
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUserEmail(null);
      window.location.assign("/");
    } catch {
      // Tetap kembali ke halaman awal agar state session lama tidak tertinggal.
      window.location.assign("/");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between gap-6">
        {/* Brand Logo */}
        <Link
          to="/"
          aria-label="Jamtangan.com Beranda"
          className="flex items-center space-x-2.5 flex-shrink-0 group"
        >
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-neutral-900 leading-none">
              DEWAJAM<span className="text-orange-600">.COM</span>
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 mt-0.5">
              Official Watch Marketplace
            </span>
          </div>
        </Link>

        {/* Search Input Container */}
        <div className="flex-1 max-w-2xl hidden md:block">
          <div className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari jam tangan, brand (Seiko, Casio, Tissot), atau seri favorit..."
              className="w-full pl-11 pr-24 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition shadow-inner bg-gray-50/50"
            />
            <span className="absolute left-3.5 top-3 text-gray-400">
              <Search className="w-5 h-5" />
            </span>
            {/* <div className="absolute right-2 top-2">
              <button
                type="button"
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs px-2.5 py-1 rounded font-medium border border-gray-200 transition"
              >
                Cari
              </button>
            </div> */}
          </div>
        </div>

        {/* Action Buttons & Cart */}
        <div className="flex items-center space-x-3.5 flex-shrink-0">
          {/* Shopping Cart Icon Button */}
          <button
            type="button"
            onClick={() => {
              if (userEmail) {
                navigate(cartPath);
              } else {
                onOpenLoginModal();
              }
            }}
            aria-label="Keranjang Belanja"
            className="relative p-2 text-gray-700 hover:text-orange-600 transition"
          >
            <ShoppingCart className="w-6 h-6 stroke-[1.8]" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 bg-orange-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white">
                {cartCount}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          {/* Authentication Actions */}
          {userEmail ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-800 font-medium bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                <UserIcon className="w-3.5 h-3.5 text-orange-600" />
                <span className="max-w-[120px] truncate">{userEmail}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:text-red-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="px-5 py-2 text-sm font-semibold text-gray-800 hover:text-black border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Masuk
              </button>
              <Link
                to="/signup"
                className="px-5 py-2 text-sm font-semibold text-white bg-black hover:bg-neutral-800 rounded-lg shadow transition"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
