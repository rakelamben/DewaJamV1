import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroSlide {
  imageUrl: string;
  alt: string;
  href: string;
}

// Banner sengaja berupa aset gambar utuh. URL dapat diganti dengan PNG/GIF
// final saat aset dan tujuan link dari marketing sudah tersedia.
const HERO_SLIDES: HeroSlide[] = [
  {
    imageUrl:
      "https://placehold.co/2100x900/171717/fbbf24/png?text=OKTOBERKAH+FEST",
    alt: "OKTOBERKAH FEST - Promo jam tangan hingga 85 persen",
    href: "#",
  },
  {
    imageUrl:
      "https://placehold.co/2100x900/20252d/f5f5f4/png?text=GENTLEMAN%27S+CHOICE",
    alt: "Gentleman's Choice - Koleksi horologi Swiss dan Jepang",
    href: "#",
  },
  {
    imageUrl:
      "https://placehold.co/2100x900/164e63/ecfeff/png?text=SMART+HOROLOGY+2026",
    alt: "Smart Horology 2026 - Koleksi smartwatch pilihan",
    href: "#",
  },
];

export function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div
      className="flex w-full flex-col gap-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex w-full items-center gap-2 sm:gap-3">
        {/* Arrow berada di luar container agar tidak menutupi bagian banner. */}
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Slide sebelumnya"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-md transition hover:border-orange-300 hover:bg-orange-50 sm:h-11 sm:w-11"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-orange-100 bg-gray-100 shadow-xl sm:rounded-2xl">
          <a href={slide.href} aria-label={slide.alt} className="block">
            <img
              src={slide.imageUrl}
              alt={slide.alt}
              className="block aspect-[21/9] h-auto w-full object-cover"
            />
          </a>
        </div>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Slide selanjutnya"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-md transition hover:border-orange-300 hover:bg-orange-50 sm:h-11 sm:w-11"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>

      {/* Indikator posisi slideshow berada di bawah container banner. */}
      <div className="flex items-center justify-center gap-1.5 py-1">
        {HERO_SLIDES.map((slideItem, index) => (
          <button
            key={slideItem.imageUrl}
            type="button"
            onClick={() => setCurrentSlide(index)}
            aria-label={`Tampilkan slide ${index + 1}`}
            aria-current={currentSlide === index ? "true" : undefined}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              currentSlide === index
                ? "w-6 bg-orange-600"
                : "w-2 bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
