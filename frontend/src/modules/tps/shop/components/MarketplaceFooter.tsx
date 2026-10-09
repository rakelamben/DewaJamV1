
export function MarketplaceFooter() {
  const paymentPartners = [
    "BCA",
    "Mandiri",
    "BNI",
    "BRI",
    "QRIS",
    "GoPay",
    "OVO",
    "Kredivo",
    "Visa / Mastercard",
  ];

  const deliveryPartners = [
    "JNE Express",
    "SiCepat",
    "J&T Cargo",
    "GrabExpress Instant",
    "Gosend Sameday",
  ];

  return (
    <footer
      className="bg-neutral-950 text-neutral-300 pt-16 pb-12 border-t border-neutral-800"
      data-purpose="comprehensive-footer"
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Footer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-neutral-800">
          {/* Col 1: About and Contacts */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-2.5">
              <span className="text-xl font-extrabold text-white">
                DEWAJAM<span className="text-orange-600">.COM</span>
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
              Pusat perbelanjaan jam tangan online dan offline terpercaya sejak
              2014. Menyediakan koleksi jam original terlengkap dengan garansi
              resmi dan kemudahan berbelanja online.
            </p>
            <div className="text-xs text-neutral-300 space-y-1.5 pt-1">
              <p>
                <strong>WhatsApp CS:</strong> xxx
              </p>
              <p>
                <strong>Email:</strong> xxx
              </p>
              <p>
                <strong>Head Office:</strong> xxx
              </p>
            </div>
          </div>

          {/* Col 2: Kategori Populer */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Kategori Pilihan
            </h4>
            <ul className="text-xs space-y-2 text-neutral-400">
              {/* <li>
                <a href="#katalog-produk" className="hover:text-orange-500 transition">
                  Jam Tangan Pria Original
                </a>
              </li>
              <li>
                <a href="#katalog-produk" className="hover:text-orange-500 transition">
                  Jam Tangan Wanita Elegant
                </a>
              </li>
              <li>
                <a href="#katalog-produk" className="hover:text-orange-500 transition">
                  Smartwatch &amp; GPS Running
                </a>
              </li>
              <li>
                <a href="#katalog-produk" className="hover:text-orange-500 transition">
                  Jam Tangan Automatic
                </a>
              </li>
              <li>
                <a href="#katalog-produk" className="hover:text-orange-500 transition">
                  Chronograph Watch
                </a>
              </li>
              <li>
                <a href="#katalog-produk" className="hover:text-orange-500 transition">
                  Strap Kulit &amp; Rantai Stainless
                </a>
              </li> */}
            </ul>
          </div>

          {/* Col 3: Layanan Pelanggan */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Bantuan &amp; Layanan
            </h4>
            {/* <ul className="text-xs space-y-2 text-neutral-400">
              <li>
                <span className="cursor-pointer hover:text-orange-500 transition">
                  Klaim Garansi Resmi
                </span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-orange-500 transition">
                  Lacak Pengiriman Pesanan
                </span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-orange-500 transition">
                  Kebijakan Pengembalian Produk
                </span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-orange-500 transition">
                  Daftar 24 Toko Offline
                </span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-orange-500 transition">
                  Panduan Pembayaran &amp; Cicilan
                </span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-orange-500 transition">
                  Syarat &amp; Ketentuan Layanan
                </span>
              </li>
            </ul> */}
          </div>
        </div>

        {/* Payment Partners & Delivery Logotypes */}
        <div className="py-8 border-b border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Partner Pembayaran */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-3">
              Partner Pembayaran Resmi:
            </span>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-neutral-400">
              {paymentPartners.map((partner) => (
                <span
                  key={partner}
                  className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded"
                >
                  {partner}
                </span>
              ))}
            </div>
          </div>

          {/* Partner Logistik */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-3">
              Jasa Ekspedisi Terpercaya:
            </span>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-neutral-400">
              {deliveryPartners.map((expedisi) => (
                <span
                  key={expedisi}
                  className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded"
                >
                  {expedisi}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright & Disclaimer */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <p>
            © 2026 PT Dewa Jam Tangan. Seluruh Hak Cipta Dilindungi
            Undang-Undang.
          </p>
          <div className="flex space-x-6 text-neutral-400">
            <span className="cursor-pointer hover:text-white transition">
              Kebijakan Privasi
            </span>
            <span className="cursor-pointer hover:text-white transition">
              Syarat Penggunaan
            </span>
            <span className="cursor-pointer hover:text-white transition">
              Peta Situs
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
