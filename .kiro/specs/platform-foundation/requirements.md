# Requirements Document

## Introduction

`platform-foundation` adalah fondasi teknis sistem Dewa Jam. Spec ini mendefinisikan kerangka backend (FastAPI), kerangka frontend (React + TypeScript + Vite), mekanisme autentikasi dan RBAC berbasis Supabase Auth, audit log terpusat, format error API yang seragam, dan tooling kualitas kode. Tujuannya adalah menyiapkan infrastruktur bersama sehingga spec fitur TPS berikutnya dapat dibangun di atasnya tanpa mengubah struktur dasar.

## Glossary

- **System**: Sistem Dewa Jam secara keseluruhan (backend + frontend).
- **Backend**: Aplikasi FastAPI yang berjalan di server, menyediakan REST API.
- **Frontend**: Aplikasi React + TypeScript + Vite yang berjalan di browser.
- **Core**: Paket `backend/app/core/` yang berisi konfigurasi, session database, auth/RBAC, audit log, event bus, dan error handler. `Core` tidak boleh mengimpor dari `modules/`.
- **Router**: `APIRouter` FastAPI yang didaftarkan ke `create_app()` di `main.py`.
- **Module**: Subfolder domain di `backend/app/modules/` atau `frontend/src/modules/`. Setiap module berdiri sendiri.
- **Supabase_Auth**: Layanan autentikasi Supabase yang menerbitkan JWT untuk setiap sesi pengguna.
- **JWT**: JSON Web Token yang diterbitkan oleh Supabase_Auth dan diverifikasi oleh Backend.
- **Personnel**: Entitas dalam tabel `toko_jam.personnel` yang merepresentasikan pengguna internal (admin, manager, staf).
- **Customer**: Entitas dalam tabel `toko_jam.customers` yang merepresentasikan pembeli.
- **User_Profile**: Tabel baru yang menghubungkan UUID Supabase_Auth dengan `personnel_id` atau `customer_id` yang ada di database.
- **Role**: Peran pengguna yang dibaca dari database — `customer`, `kasir`, `gudang`, `manager`, atau `admin`.
- **Dependency**: Fungsi FastAPI `Depends(...)` yang digunakan untuk injeksi dependensi, termasuk verifikasi JWT dan pemeriksaan role.
- **Require_Role**: Dependency FastAPI yang memastikan pengguna yang mengakses endpoint memiliki role yang diizinkan.
- **Audit_Log**: Mekanisme pencatatan perubahan data (siapa, kapan, aksi apa, tabel apa, ID record) ke tabel `toko_jam.activity_logs`.
- **Event_Bus**: Mekanisme in-process di `core/` untuk mempublikasikan dan mengonsumsi event antar module tanpa coupling langsung.
- **Error_Response**: Format JSON standar yang dikembalikan oleh Backend untuk semua kondisi error.
- **Health_Check**: Endpoint `GET /api/v1/health` yang mengembalikan status operasional Backend.
- **CORS**: Cross-Origin Resource Sharing — konfigurasi izin HTTP lintas-origin antara Frontend dev server dan Backend.
- **Alembic**: Alat migrasi skema database yang digunakan bersama SQLAlchemy. Perubahan skema hanya dilakukan lewat migrasi Alembic.
- **Baseline_Migration**: Migrasi Alembic pertama yang merekam kondisi skema Supabase yang sudah ada tanpa mengubah atau menghapus data.
- **Guard**: Komponen React yang memeriksa role pengguna sebelum merender halaman. Pengguna tanpa role yang sesuai diarahkan ke halaman yang sesuai.
- **Route_Registry**: Struktur data di Frontend (`frontend/src/app/`) yang mendaftarkan setiap rute beserta metadata `allowedRoles`-nya. Guard dan menu navigasi dibangun secara dinamis dari registry ini — bukan dari mapping prefix URL ke role yang di-hardcode.
- **Shell**: Komponen layout utama Frontend (`frontend/src/app/`) yang membungkus semua halaman dan menyediakan navigasi global.
- **Placeholder_Page**: Halaman Frontend yang hanya menampilkan judul area tanpa logika bisnis, digunakan sebagai kerangka routing.
- **API_Client**: Modul `frontend/src/shared/` yang mengatur semua permintaan HTTP ke Backend, termasuk penyertaan JWT di header.
- **Environment_Variable**: Variabel konfigurasi yang dimuat dari file `.env` dan tidak boleh di-commit ke repository.
- **SQLAlchemy_Session**: Objek sesi SQLAlchemy 2.x (sync) yang dikelola per-request melalui dependency FastAPI.

---

## Requirements

### Requirement 1: Scaffold dan Konfigurasi Backend

**User Story:** Sebagai developer, saya ingin kerangka aplikasi FastAPI yang sudah terkonfigurasi, sehingga saya dapat langsung membangun modul TPS tanpa menyiapkan fondasi dari awal.

#### Acceptance Criteria

1. THE Backend SHALL menyediakan fungsi `create_app()` di `backend/app/main.py` yang mendaftarkan semua Router menggunakan `include_router` dan mengembalikan instance `FastAPI`.
2. THE Backend SHALL memuat konfigurasi aplikasi dari environment variable menggunakan `pydantic-settings`, mencakup minimal `DATABASE_URL`, `SUPABASE_URL`, dan `SUPABASE_JWT_SECRET`.
3. IF salah satu dari `DATABASE_URL`, `SUPABASE_URL`, atau `SUPABASE_JWT_SECRET` tidak ditemukan saat startup, THEN THE Backend SHALL menghentikan proses startup dengan `SystemExit` dan mencatat pesan error yang menyebutkan nama variabel yang hilang.
4. THE Backend SHALL menyediakan `SQLAlchemy_Session` sync (bukan async) sebagai Dependency FastAPI menggunakan generator (`yield`) sehingga sesi ditutup secara otomatis setelah setiap request selesai.
5. THE Backend SHALL mengizinkan permintaan lintas-origin dari `http://localhost:5173` melalui konfigurasi CORS yang mencakup method `GET`, `POST`, `PUT`, `PATCH`, dan `DELETE`.
6. WHEN `GET /api/v1/health` dipanggil, THE Backend SHALL mengembalikan respons HTTP 200 dengan body JSON `{"status": "ok"}` tanpa membutuhkan autentikasi.
7. THE Backend SHALL menyediakan kerangka folder `backend/app/modules/tps/` dengan subfolder per domain (minimal: `catalog/`, `inventory/`, `sales/`, `fulfillment/`), masing-masing berisi file `routes.py`, `service.py`, `repository.py`, `models.py`, dan `schemas.py` berisi placeholder komentar `# TODO: implement`.

---

### Requirement 2: Scaffold, Routing, dan Route Registry Frontend

**User Story:** Sebagai developer, saya ingin kerangka aplikasi React yang memiliki Route_Registry terpusat sebagai sumber kebenaran routing dan otorisasi, sehingga saya dapat menambahkan area baru ke Guard dan menu navigasi hanya dengan mendaftarkan rute baru di registry, tanpa mengubah logika Guard atau Shell.

#### Acceptance Criteria

1. THE Frontend SHALL menggunakan React Router untuk mendefinisikan rute berdasarkan entri di Route_Registry; rute tidak boleh didefinisikan secara langsung di Guard atau Shell tanpa melalui registry.
2. THE Frontend SHALL menyediakan Route_Registry di `frontend/src/app/` sebagai array objek, masing-masing objek memiliki setidaknya field `path` (string prefix rute), `allowedRoles` (array Role), dan `label` (string nama area untuk menu navigasi).
3. THE Frontend SHALL menyediakan Shell di `frontend/src/app/` yang membungkus semua halaman; menu navigasi yang ditampilkan Shell SHALL dibangun secara dinamis dari entri Route_Registry yang `allowedRoles`-nya cocok dengan role pengguna yang sedang login.
4. WHEN pengguna mengakses rute yang dilindungi tanpa sesi aktif (JWT tidak ada atau sudah kedaluwarsa menurut Supabase Auth client), THE Frontend SHALL mengarahkan pengguna ke halaman `/login`.
5. WHEN pengguna dengan role tertentu mengakses rute yang `allowedRoles`-nya tidak menyertakan role tersebut, THE Frontend SHALL membaca Route_Registry untuk menemukan rute pertama yang `allowedRoles`-nya cocok dengan role pengguna, lalu mengarahkan pengguna ke sana; jika tidak ada rute yang cocok, pengguna diarahkan ke `/login`.
6. THE Frontend SHALL mendaftarkan area awal berikut di Route_Registry: `{ path: "/shop", allowedRoles: ["customer", "admin"] }`, `{ path: "/inplace", allowedRoles: ["customer", "admin"] }`, `{ path: "/pos", allowedRoles: ["kasir", "manager", "admin"] }`, `{ path: "/warehouse", allowedRoles: ["gudang", "manager", "admin"] }`, `{ path: "/management", allowedRoles: ["manager", "admin"] }`.
7. THE Frontend SHALL menampilkan Placeholder_Page untuk setiap area yang terdaftar di Route_Registry, memuat `label` area tersebut sebagai heading halaman.
8. WHEN entri baru ditambahkan ke Route_Registry (misalnya `/oas` atau `/kms`), THE Guard dan Shell SHALL secara otomatis mengikutsertakan area baru tersebut tanpa perubahan kode pada komponen Guard atau Shell itu sendiri.
9. THE Frontend SHALL menyediakan API_Client di `frontend/src/shared/` yang menyertakan JWT secara otomatis di header `Authorization: Bearer <token>` pada setiap permintaan ke Backend; IF tidak ada JWT aktif THEN permintaan tidak dikirim dan komponen pemanggil menerima error autentikasi.
10. THE Frontend SHALL memuat konfigurasi Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) dari environment variable; IF salah satu variabel tidak ada saat startup THEN Frontend SHALL menampilkan pesan error pada layar dan menghentikan inisialisasi.

---

### Requirement 3: Autentikasi dengan Supabase Auth

**User Story:** Sebagai pengguna sistem, saya ingin dapat login menggunakan akun Supabase Auth, sehingga sesi saya terverifikasi secara aman di seluruh sistem.

#### Acceptance Criteria

1. WHEN Frontend menerima JWT dari Supabase_Auth setelah login berhasil, THE Frontend SHALL menyimpan JWT di memori sesi (bukan localStorage) dan menyertakannya di header `Authorization: Bearer <token>` pada setiap permintaan selanjutnya ke Backend melalui API_Client.
2. WHEN Backend menerima permintaan dengan header `Authorization: Bearer <token>`, THE Backend SHALL memverifikasi tanda tangan dan masa berlaku JWT menggunakan `SUPABASE_JWT_SECRET`.
3. IF JWT tidak ada, tidak valid, atau sudah kedaluwarsa, THEN THE Backend SHALL mengembalikan HTTP 401 dengan Error_Response standar yang menyertakan `message` deskriptif (contoh: "Token tidak valid", "Token kedaluwarsa"); WHEN Frontend menerima HTTP 401 THEN Frontend SHALL menghapus JWT tersimpan dan mengarahkan pengguna ke `/login`.
4. WHEN JWT berhasil diverifikasi, THE Backend SHALL mengekstrak nilai klaim `sub` (UUID pengguna Supabase Auth) sebagai `auth_user_id` untuk digunakan pada pencarian profil pengguna.
5. THE Backend SHALL menyediakan tabel baru `user_profiles` dengan kolom `auth_user_id` (UUID, unik, FK ke `auth.users` Supabase), `entity_type` (`personnel` atau `customer`), dan `entity_id` (UUID merujuk ke `personnel_id` atau `customer_id`); tabel ini wajib ada sebelum endpoint autentikasi diaktifkan.
6. IF `auth_user_id` dari JWT tidak ditemukan di tabel `user_profiles`, THEN THE Backend SHALL mengembalikan HTTP 403 dengan pesan "Pengguna tidak terdaftar di sistem".
7. WHEN `auth_user_id` ditemukan di `user_profiles` dengan `entity_type = 'personnel'`, THE Backend SHALL membaca role pengguna dari kolom `personnel_type` di tabel `personnel` (untuk role `admin` dan `manager`) dan dari kolom `role` di tabel `staff` (untuk role `kasir` dan `gudang`); role tidak boleh diambil dari klaim JWT.

---

### Requirement 4: Role-Based Access Control (RBAC)

**User Story:** Sebagai developer, saya ingin dependency `require_role(...)` yang dapat digunakan di semua endpoint, sehingga setiap endpoint dapat membatasi akses berdasarkan role pengguna tanpa mengulang logika yang sama.

#### Acceptance Criteria

1. THE Core SHALL menyediakan Dependency `require_role` yang menerima antara satu hingga lima role yang diizinkan sebagai argumen (dari himpunan: `customer`, `kasir`, `gudang`, `manager`, `admin`).
2. WHEN pengguna terautentikasi memiliki role yang terdaftar di argumen `require_role`, THE Backend SHALL melanjutkan pemrosesan permintaan tanpa interupsi.
3. IF pengguna terautentikasi tidak memiliki role yang diizinkan oleh `require_role`, THEN THE Backend SHALL mengembalikan HTTP 403 dengan Error_Response standar dan tidak melanjutkan eksekusi handler endpoint.
4. THE Backend SHALL mendukung tepat lima Role yang valid: `customer`, `kasir`, `gudang`, `manager`, dan `admin`; argumen role lain yang tidak dikenal SHALL menghasilkan `ValueError` saat aplikasi diinisialisasi.
5. THE Backend SHALL menentukan role pengguna dengan mencocokkan `auth_user_id` ke `user_profiles` lalu ke tabel `personnel`/`staff` di database pada setiap permintaan; klaim role dalam JWT diabaikan sepenuhnya meskipun ada.
6. IF `auth_user_id` tidak ditemukan di tabel `user_profiles` saat pengecekan role, THEN THE Backend SHALL mengembalikan HTTP 403 dengan pesan "Pengguna tidak terdaftar di sistem", sama seperti kriteria di Requirement 3.
7. IF database tidak dapat dijangkau saat pencarian role berlangsung, THEN THE Backend SHALL mengembalikan HTTP 503 dengan Error_Response standar dan pesan "Layanan sementara tidak tersedia".

---

### Requirement 5: Audit Log Terpusat

**User Story:** Sebagai manager, saya ingin setiap perubahan data dicatat secara otomatis, sehingga saya dapat melacak siapa yang mengubah data apa dan kapan, untuk keperluan audit dan investigasi.

#### Acceptance Criteria

1. THE Core SHALL menyediakan fungsi `write_audit_log(session: Session, personnel_id: uuid.UUID, action: Literal["create","update","delete"], table_name: str, record_id: uuid.UUID | None, detail: dict | None)` yang dapat dipanggil dari semua module.
2. WHEN `write_audit_log` dipanggil, THE Core SHALL menyimpan satu baris ke tabel `toko_jam.activity_logs` dengan kolom `personnel_id`, `action`, `table_name`, `record_id` (boleh NULL), `detail` (disimpan sebagai `jsonb`), dan `created_at` (timestamp UTC saat fungsi dipanggil).
3. THE Core SHALL mendukung tepat tiga nilai `action` yang valid: `"create"`, `"update"`, dan `"delete"`; nilai lain SHALL menyebabkan `ValueError` sebelum INSERT dilakukan.
4. WHILE Backend memproses endpoint yang mengubah data, THE Backend SHALL memastikan `write_audit_log` dipanggil dalam transaksi database yang sama (`session`) sehingga log dan perubahan data di-commit atau di-rollback bersama-sama.
5. IF `personnel_id` yang diberikan tidak ada di tabel `toko_jam.personnel` (pelanggaran FK), THEN THE Backend SHALL membatalkan transaksi dan mengembalikan HTTP 500 dengan Error_Response standar.
6. IF koneksi database terputus saat `write_audit_log` dieksekusi, THEN THE Backend SHALL membatalkan (rollback) seluruh transaksi dan mengembalikan HTTP 500 dengan Error_Response standar.
7. THE Core SHALL mendokumentasikan kontrak fungsi `write_audit_log` lengkap (nama parameter, tipe data, nilai yang diizinkan, dan perilaku error) di docstring Python mengikuti format Google Style.

---

### Requirement 6: Format Error API yang Seragam

**User Story:** Sebagai developer frontend, saya ingin semua respons error dari Backend memiliki format JSON yang konsisten, sehingga saya dapat menangani error secara seragam di seluruh aplikasi tanpa penanganan khusus per endpoint.

#### Acceptance Criteria

1. THE Backend SHALL mengembalikan semua respons error dalam format JSON `{"error": {"code": "<kode_error>", "message": "<pesan_error>", "detail": <nilai_atau_null>}}`; field `detail` harus hadir dengan nilai `null` apabila tidak digunakan (tidak boleh dihilangkan).
2. THE Core SHALL menyediakan exception handler global yang menangkap exception tak tertangani dan mengubahnya menjadi Error_Response HTTP 500; handler tidak boleh mengekspos informasi internal apapun ke klien, termasuk stack trace, nama file, nama variabel, atau pesan exception mentah.
3. WHEN validasi Pydantic gagal pada request body, THE Backend SHALL mengembalikan HTTP 422 dengan field `detail` berisi array objek, masing-masing memiliki `field` (string path ke field yang gagal, contoh `"body.harga"`) dan `reason` (string deskripsi kegagalan validasi).
4. THE Core SHALL mendefinisikan kode error standar sebagai konstanta Python yang dapat digunakan oleh semua module: `ERR_UNAUTHORIZED` (401), `ERR_FORBIDDEN` (403), `ERR_NOT_FOUND` (404), `ERR_VALIDATION` (422), `ERR_INTERNAL` (500), `ERR_SERVICE_UNAVAILABLE` (503).
5. THE Backend SHALL menggunakan kode HTTP sesuai semantik: 400 untuk permintaan tidak valid secara umum, 401 untuk tidak terautentikasi, 403 untuk tidak diizinkan, 404 untuk resource tidak ditemukan, 422 untuk kegagalan validasi Pydantic, 500 untuk error server internal, 503 untuk layanan tidak tersedia.
6. WHEN framework FastAPI mengembalikan error level routing (HTTP 404 rute tidak ditemukan, HTTP 405 metode tidak diizinkan) sebelum handler endpoint dipanggil, THE Backend SHALL memformat error tersebut menggunakan struktur Error_Response yang sama sesuai kriteria 1.

---

### Requirement 7: Event Bus In-Process

**User Story:** Sebagai developer, saya ingin mekanisme event bus in-process di Core, sehingga module dapat berkomunikasi tanpa saling mengimpor secara langsung dan tetap sesuai dengan aturan dependency di `structure.md`.

#### Acceptance Criteria

1. THE Core SHALL menyediakan fungsi `publish(event_name: str, payload: dict)` dan `subscribe(event_name: str, handler: Callable[[dict], None])` sebagai antarmuka publik Event_Bus; `event_name` harus berupa string non-kosong dengan panjang maksimal 255 karakter.
2. WHEN `publish(event_name, payload)` dipanggil dan ada satu atau lebih handler terdaftar, THE Event_Bus SHALL memanggil semua handler secara sinkron berurutan dalam proses yang sama; IF tidak ada handler terdaftar THEN `publish` SHALL berakhir tanpa error dan tanpa efek samping.
3. IF sebuah handler melempar exception saat dieksekusi, THEN THE Event_Bus SHALL mencatat exception tersebut ke log aplikasi pada level WARNING atau lebih tinggi, mengisolasi kegagalan tersebut, dan melanjutkan eksekusi handler berikutnya tanpa menghentikan proses utama.
4. THE Core SHALL mengekspor `publish` dan `subscribe` hanya melalui antarmuka publik (misalnya `core/__init__.py` atau modul `core/event_bus.py`); module di `modules/` hanya boleh mengimpor dari titik masuk publik tersebut, bukan dari sub-modul internal `core/`.
5. THE Backend SHALL mempublikasikan event `"app.started"` saat `create_app()` selesai tanpa error, dengan payload berisi `{"timestamp": "<ISO 8601 UTC>"}`, untuk memverifikasi Event_Bus berfungsi.

---

### Requirement 8: Baseline Migrasi Alembic dan Kualitas Kode

**User Story:** Sebagai developer, saya ingin baseline Alembic yang merekam skema Supabase yang sudah ada dan tooling kualitas kode yang terkonfigurasi, sehingga semua perubahan skema berikutnya dapat dilacak dan standar kode terjaga secara otomatis.

#### Acceptance Criteria

1. THE Backend SHALL menyertakan Baseline_Migration Alembic di `backend/migrations/versions/` yang merekam skema `toko_jam` yang sudah ada dengan fungsi `upgrade()` yang hanya berisi `pass` (tanpa DDL) dan fungsi `downgrade()` yang berisi `pass`; setelah migration ini diterapkan (`alembic upgrade head`), tidak ada DDL yang dieksekusi terhadap database.
2. THE Backend SHALL menyertakan file `backend/tests/test_health.py` yang menggunakan `TestClient` FastAPI untuk memanggil `GET /api/v1/health` dan memverifikasi status HTTP 200 serta body JSON `{"status": "ok"}`.
3. THE Frontend SHALL menyertakan minimal satu file test Vitest (mis. `frontend/src/app/Shell.test.tsx`) yang merender komponen Shell menggunakan `@testing-library/react` dan memverifikasi bahwa komponen berhasil dirender tanpa error (menggunakan `screen.getByRole` atau setara).
4. THE Backend SHALL menyertakan file `backend/.env.example` yang mendokumentasikan semua environment variable berikut tanpa nilai rahasia: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`, dan `ENVIRONMENT`.
5. THE Frontend SHALL menyertakan file `frontend/.env.example` yang mendokumentasikan semua environment variable berikut tanpa nilai rahasia: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, dan `VITE_API_BASE_URL`.
6. THE System SHALL menyertakan file `.gitignore` di root repository yang mengecualikan setidaknya: `.env`, `backend/.env`, `frontend/.env`, `__pycache__/`, `.venv/`, `node_modules/`, `dist/`, `*.pyc`, `.pytest_cache/`, dan `coverage/`.
7. WHEN `ruff check . && ruff format --check .` dijalankan di direktori `backend/`, THE Backend SHALL tidak menghasilkan pelanggaran lint atau format pada seluruh file Python yang ada.
8. WHEN `npm run lint` dijalankan di direktori `frontend/`, THE Frontend SHALL tidak menghasilkan pelanggaran ESLint atau Prettier pada seluruh file TypeScript/TSX yang ada.

---

## Di Luar Cakupan

Fitur dan komponen berikut **tidak** menjadi bagian dari spec `platform-foundation` ini:

- Semua fitur TPS: katalog produk, manajemen stok, POS kasir, checkout, pesanan, pembayaran, pickup, delivery, penerimaan barang, dan retur/refund.
- OAS (Office Automation System): chat, jadwal staf, manajemen berkas.
- KMS (Knowledge Management System): FAQ, artikel, video panduan, studi kasus.
- MIS (Management Information System) dan ISS (DSS, EIS, ES).
- Integrasi payment gateway (Midtrans, Xendit, dll.).
- Integrasi ekspedisi atau layanan pengiriman.
- Desain UI final dan komponen visual yang sebenarnya (hanya Placeholder_Page).
- Logika bisnis di dalam module TPS (routes/service/repository hanya kerangka kosong).
- Multi-cabang dan multi-toko.
- Fitur retur, servis, dan garansi jam.
- Manajemen jam bekas atau konsinyasi.
- Notifikasi real-time (WebSocket/SSE).
- Penyimpanan dan pengelolaan gambar produk.
- Audit skema database secara mendalam dan pemetaan gap (ini dibahas di `design.md`).
