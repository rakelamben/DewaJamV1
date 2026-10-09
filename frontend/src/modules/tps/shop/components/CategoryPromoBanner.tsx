export type PromoVariant =
  | "brand-pilihanmu"
  | "jam-tangan-pria"
  | "jam-tangan-wanita"
  | "jam-tangan-anak"
  | "aksesoris"

interface CategoryPromoBannerProps {
  variant: PromoVariant;
}

interface PromoImage {
  imageUrl: string;
  alt: string;
  href: string;
}

// Ganti URL gambar dan href dengan aset/link final dari marketing.
const PROMO_DATA: Record<PromoVariant, PromoImage> = {
  "brand-pilihanmu": {
    imageUrl:
      "https://placehold.co/1600x320/171717/fbbf24/png?text=BRAND+PILIHANMU",
    alt: "Promo Brand Pilihanmu",
    href: "#",
  },
  "jam-tangan-pria": {
    imageUrl:
      "https://placehold.co/1600x320/20252d/f5f5f4/png?text=KOLEKSI+JAM+TANGAN+PRIA",
    alt: "Promo koleksi jam tangan pria",
    href: "#",
  },
  "jam-tangan-wanita": {
    imageUrl:
      "https://placehold.co/1600x320/4c1d35/fce7f3/png?text=KOLEKSI+JAM+TANGAN+WANITA",
    alt: "Promo koleksi jam tangan wanita",
    href: "#",
  },
  "jam-tangan-anak": {
    imageUrl:
      "https://placehold.co/1600x320/451a03/fef3c7/png?text=ANAK+%26+AKSESORIS",
    alt: "Promo jam tangan anak",
    href: "#",
  },
  "aksesoris": {
    imageUrl: "https://placehold.co/1600x320/451a03/fef3c7/png?text=ANAK+%26+AKSESORIS",
    alt: "Promo aksesoris",
    href:"#"
  }
};

export function CategoryPromoBanner({ variant }: CategoryPromoBannerProps) {
  const promo = PROMO_DATA[variant];

  return (
    <a href={promo.href} aria-label={promo.alt} className="block">
      <img
        src={promo.imageUrl}
        alt={promo.alt}
        className="block aspect-[5/1] w-full object-cover shadow-md"
      />
    </a>
  );
}
