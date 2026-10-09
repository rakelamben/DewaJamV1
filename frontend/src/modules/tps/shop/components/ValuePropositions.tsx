import { ShieldCheck, Truck, Wrench, Globe } from "lucide-react";

export function ValuePropositions() {
  const pillars = [
    {
      title: "100% Produk Original",
      desc: "Jaminan garansi uang kembali 200% jika terbukti barang tiruan atau rekondisi.",
      icon: <ShieldCheck className="w-6 h-6" />,
    },
    {
      title: "Gratis Ongkir & Asuransi",
      desc: "Pengiriman aman terlindungi asuransi menyeluruh hingga ke pelosok Indonesia.",
      icon: <Truck className="w-6 h-6" />,
    },
    {
      title: "Service Center Resmi",
      desc: "Didukung teknisi profesional bersertifikat internasional untuk after-sales service.",
      icon: <Wrench className="w-6 h-6" />,
    },
    {
      title: "100+ Brand Dunia",
      desc: "Koleksi ribuan seri jam tangan terlengkap mulai dari casual hingga luxury horology.",
      icon: <Globe className="w-6 h-6" />,
    },
  ];

  return (
    <section
      className="bg-neutral-900 text-white py-14 mt-12 border-t border-neutral-800"
      data-purpose="value-propositions-section"
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Section Title */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-orange-500 font-bold uppercase tracking-widest text-xs">
            Jaminan Belanja Nyaman & Tenang
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight mt-1.5 text-white">
            Keuntungan Belanja di DewaJam.com
          </h2>
        </div>

        {/* Feature Grid: 5 Pillars */}
        <div className="flex flex-row gap-6 mx-auto">
          {pillars.map((p, idx) => (
            <div
              key={idx}
              className="bg-neutral-800/80 p-5 rounded-xl border border-neutral-700/80 hover:border-orange-500/80 transition flex flex-col items-center text-center group"
            >
              <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 mb-4 group-hover:scale-110 transition duration-300">
                {p.icon}
              </div>
              <h3 className="font-bold text-sm text-neutral-100">{p.title}</h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
