# Product Overview

**Dewa Jam** adalah sistem informasi terpadu yang menjadi platform utama proses bisnis toko jam. Platform ini mengadopsi beberapa level sistem informasi dalam satu codebase:

- **TPS** (Transaction Processing System)
- **OAS** (Office Automation System)
- **KMS** (Knowledge Management System)
- **MIS** (Management Information System)
- **ISS** (Intelligent Support Systems): DSS (Decision Support System), EIS (Executive Information System), dan ES (Expert System)

Konteks proyek: tugas kuliah dan portofolio, tanpa tenggat. Prioritas utama adalah alur end-to-end yang berjalan benar dan terdokumentasi rapi, bukan kelengkapan fitur produksi.

# Permasalahan yang ingin diselesaikan

Pengguna mengalami cognitive load karena memakai beberapa platform terpisah untuk aktivitas bisnis jam. Contoh: komunikasi dan pengiriman berkas dilakukan lewat WhatsApp, lalu diupload ke Google Drive sebagai arsip. Dewa Jam menyelesaikan ini dengan satu sistem terpadu yang meng-cover digitalisasi seluruh proses bisnis usaha jam.

# Target pengguna dan peran

| Peran | Siapa | Area utama di aplikasi (bisa berubah) |
|---|---|---|
| `customer` | Pembeli jam | Marketplace online, Inplace |
| `kasir` | Staf kasir | POS |
| `gudang` | Staf gudang | fitur penggudangan |
| `manager` | Manager toko | Semua area staf + pengelolaan master data dan laporan |
| `admin` | superuser | Semua fitur

Catatan: `manager` adalah fungsional tertinggi di bisnis, ada peran admin (superuser) sebagai sistem manager. Satu aplikasi React melayani semua peran melalui role-based routing.

# Channel penjualan (TPS)

Ketiga channel memakai katalog, stok, dan data pesanan yang sama. Perbedaannya ada pada siapa yang bertransaksi, cara bayar, dan cara serah terima.

| Channel | Pengguna | Pembayaran | Serah terima |
|---|---|---|---|
| **POS** | Kasir melayani pembeli di toko | Instore | Langsung dibawa |
| **Marketplace** | Pembeli di web (online) | Online | Delivery atau pickup di toko |
| **Inplace** | Pembeli di toko lewat web (cek harga dan detail mandiri) | Online saja | Pickup di pickup point toko |

# Aturan bisnis dasar

- Satu toko (belum multi-cabang). Desain data sebaiknya tidak menutup kemungkinan multi-cabang di masa depan.
- Fokus jam baru. Jam bekas di luar cakupan.
- Inplace store system tidak menerima pembayaran instore dan tidak menyediakan delivery (pembayaran mandiri via online payment).
- Stok yang sama dipakai oleh ketiga channel, jadi harus tidak ada penjualan ganda untuk unit yang sama (race condition).

# Key features and goals

1. **TPS** (fase aktif): POS kasir, Marketplace client side, Inplace client side, serta pendukungnya: katalog produk, stok, penerimaan barang/pembelian, pembayaran, pickup dan delivery. fitur belum sampai: retur/refund, servis dan garansi.
2. **OAS**: chat, jadwal staf, manajemen berkas (menyusul).
3. **KMS**: FAQ, artikel, studi kasus, video panduan, dan lainnya (menyusul).
4. **MIS**: menyusul.
5. **ISS**: menyusul.

# Di luar cakupan saat ini

- OAS, KMS, MIS, ISS (termasuk chat OAS dan penyimpanan berkas)
- Multi-penjual (marketplace hanya untuk satu toko: dewa jam)
- Jam bekas dan konsinyasi
- Multi-cabang


