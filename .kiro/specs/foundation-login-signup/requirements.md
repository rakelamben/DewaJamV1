# Requirements Document

## Introduction

`foundation-login-signup` adalah fitur autentikasi pengguna sistem Dewa Jam. Spec ini mendefinisikan:

- Modal login customer (tanpa URL tersendiri) yang muncul di atas halaman aktif saat diperlukan
- Halaman registrasi customer (`/signup`)
- Halaman login personnel (`/internal/login`) khusus staf, manager, dan admin
- Dua mode akses Guard: **lazy auth** untuk area publik customer (`/` marketplace, `/inplace`, dengan `/shop` dialihkan ke `/`) dan **hard auth** untuk area kerja personnel
- Redirect setelah login berdasarkan role dan konteks halaman login yang digunakan
- Endpoint backend untuk resolve profil pengguna yang sudah login dan registrasi customer

Fitur ini dibangun di atas fondasi dari spec `platform-foundation`: Guard, Shell, `routeRegistry`, Supabase Auth client, dan dependency `get_current_user`/`require_role` sudah tersedia. Spec ini melengkapi layer UI dan endpoint backend yang masih kosong.

Batasan desain utama:
- Staf (`kasir`, `gudang`), `manager`, dan `admin` dibuat oleh admin/manager — **tidak** bisa mendaftar sendiri. Mereka hanya bisa login di `/internal/login`.
- `customer` adalah satu-satunya role yang bisa mendaftar mandiri lewat `/signup` dan login melalui Customer_Login_Modal — tidak ada rute `/login` tersendiri untuk customer.
- Area `/` (Marketplace) dan `/inplace` dapat diakses tanpa login (guest mode). Rute `/shop` dialihkan ke `/`. Login baru diminta saat pengguna mencoba aksi yang membutuhkan akun.
- Area `/pos`, `/warehouse`, dan `/management` mengharuskan login sebelum akses.
- Backend **tidak** membuat akun Supabase Auth — itu dilakukan di sisi Supabase. Backend hanya menyimpan `user_profiles` dan data pelanggan setelah akun ada.

---

## Glossary

- **System**: Sistem Dewa Jam secara keseluruhan (backend + frontend).
- **Backend**: Aplikasi FastAPI yang berjalan di server.
- **Frontend**: Aplikasi React + TypeScript + Vite yang berjalan di browser.
- **Supabase_Auth**: Layanan autentikasi Supabase yang menerbitkan JWT untuk setiap sesi pengguna.
- **JWT**: JSON Web Token yang diterbitkan oleh Supabase_Auth dan diverifikasi oleh Backend.
- **Customer_Login_Modal**: Modal dialog yang muncul di atas halaman aktif (tanpa navigasi URL) untuk autentikasi customer. Ditampilkan saat pengguna mencoba aksi yang membutuhkan akun di area customer.
- **Customer_Login_Page**: Halaman Frontend di rute `/login` tempat customer memasukkan email dan kata sandi sebagai antarmuka alternatif halaman penuh (full-page) dari Customer_Login_Modal.
- **Personnel_Login_Page**: Halaman Frontend di rute `/internal/login` tempat personnel (kasir, gudang, manager, admin) memasukkan email dan kata sandi.
- **Signup_Page**: Halaman Frontend di rute `/signup` tempat calon `customer` mendaftarkan akun baru.
- **Auth_Error**: Kondisi error yang dikembalikan oleh Supabase_Auth atau Backend saat proses autentikasi gagal.
- **User_Profile**: Baris di tabel `toko_jam.user_profiles` yang menghubungkan UUID Supabase_Auth dengan entitas `personnel` atau `customer`.
- **Customer**: Entitas di tabel `toko_jam.customers` yang merepresentasikan pembeli. Dibuat saat `customer` mendaftar.
- **Personnel**: Pengguna dengan role `kasir`, `gudang`, `manager`, atau `admin` yang merupakan staf toko. Dibuat oleh admin/manager.
- **Me_Endpoint**: Endpoint backend `GET /api/v1/auth/me` yang mengembalikan profil dan role pengguna yang sedang login.
- **Role**: Peran pengguna yang dibaca dari database — `customer`, `kasir`, `gudang`, `manager`, atau `admin`.
- **Guard**: Komponen React yang memeriksa sesi dan role sebelum merender halaman terlindungi.
- **Route_Registry**: Array `routeRegistry` di `frontend/src/app/registry.ts` yang mendefinisikan path, label, dan `allowedRoles` setiap area.
- **Redirect_Rule**: Aturan yang menentukan ke mana pengguna diarahkan setelah aksi autentikasi, berdasarkan role dan konteks. Untuk customer: modal ditutup dan aksi dilanjutkan tanpa navigasi URL (pada modal), atau diarahkan ke `/` (pada halaman `/login`). Untuk personnel: diarahkan ke area kerja sesuai role.
- **Email_Confirmation**: Proses verifikasi email yang dikirim Supabase_Auth ke alamat email customer baru.
- **Error_Response**: Format JSON standar `{"error": {"code": "...", "message": "...", "detail": ...}}` yang dikembalikan Backend untuk semua kondisi error.
- **SQLAlchemy_Session**: Sesi database SQLAlchemy 2.x (sync) yang dikelola per-request.
- **Guest_Mode**: Kondisi di mana pengguna mengakses area marketplace (`/`, `/inplace`) tanpa sesi Supabase_Auth aktif.
- **Lazy_Auth**: Mode akses di mana area dapat dibuka tanpa login. Login baru diminta ketika pengguna mencoba aksi yang membutuhkan akun. Titik trigger berbeda per area: di `/` (marketplace) login diminta saat tambah ke keranjang atau checkout; di `/inplace` login hanya diminta saat checkout (add to cart bebas karena perangkat shared di toko).
- **Hard_Auth**: Mode akses di mana area tidak dapat dibuka sama sekali tanpa sesi aktif dan role yang sesuai. Guard akan langsung redirect ke halaman login yang relevan.
- **Auth_Context**: Konteks halaman login yang digunakan saat sesi dimulai — `customer` (login via Customer_Login_Modal atau Customer_Login_Page `/login`) atau `personnel` (login via `/internal/login`). Digunakan untuk menentukan tujuan redirect saat logout. Logout customer mengarahkan ke `/`; logout personnel mengarahkan ke `/internal/login`.

---

## Requirements

### Requirement 1: Backend — Endpoint Me

**User Story:** Sebagai Frontend, saya ingin endpoint `GET /api/v1/auth/me` yang mengembalikan profil dan role pengguna yang sedang login, sehingga Guard dan Shell dapat menampilkan menu dan melindungi rute berdasarkan role yang akurat.

#### Acceptance Criteria

1. WHEN `GET /api/v1/auth/me` dipanggil dengan JWT valid, THE Backend SHALL mengembalikan HTTP 200 dengan body JSON yang memuat setidaknya field: `auth_user_id` (string UUID), `role` (salah satu dari `customer`, `kasir`, `gudang`, `manager`, `admin`), `entity_type` (string `personnel` atau `customer`), dan `entity_id` (string UUID) — identik dengan field yang dikembalikan oleh `get_current_user`.
2. IF `GET /api/v1/auth/me` dipanggil tanpa header `Authorization`, THEN THE Backend SHALL mengembalikan HTTP 401 dengan Error_Response standar.
3. IF `GET /api/v1/auth/me` dipanggil dengan JWT yang kedaluwarsa, THEN THE Backend SHALL mengembalikan HTTP 401 dengan Error_Response standar yang secara eksplisit menyebutkan token kedaluwarsa.
4. IF `GET /api/v1/auth/me` dipanggil dengan JWT yang tidak valid (bukan token Supabase atau tanda tangan rusak), THEN THE Backend SHALL mengembalikan HTTP 401 dengan Error_Response standar yang secara eksplisit menyebutkan token tidak valid.
5. IF `auth_user_id` dari JWT tidak ditemukan di tabel `user_profiles`, THEN THE Backend SHALL mengembalikan HTTP 403 dengan Error_Response standar dan pesan "Pengguna tidak terdaftar di sistem".
6. IF database tidak dapat dijangkau saat `GET /api/v1/auth/me` dipanggil, THEN THE Backend SHALL mengembalikan HTTP 503 dengan Error_Response standar.

---

### Requirement 2: Backend — Endpoint Registrasi Customer

**User Story:** Sebagai calon customer, saya ingin mendaftarkan akun baru lewat API, sehingga Backend dapat menyimpan data profil saya dan menghubungkannya dengan akun Supabase Auth yang baru dibuat.

#### Acceptance Criteria

1. WHEN `POST /api/v1/auth/register` dipanggil dengan body `{"auth_user_id": "<UUID>", "nama": "<string>", "no_hp": "<string>"}` dan JWT Supabase yang tanda tangannya valid milik pengguna dengan `auth_user_id` yang sama, THE Backend SHALL membuat baris baru di `toko_jam.customers` (`nama` dengan panjang 1–100 karakter non-spasi-saja, `no_hp` berformat 8–15 karakter yang terdiri dari opsional awalan `+` diikuti digit) dan baris baru di `toko_jam.user_profiles` (`auth_user_id`, `entity_type = 'customer'`, `entity_id = customer_id` yang baru dibuat), lalu mengembalikan HTTP 201 dengan body JSON `{"customer_id": "<UUID>", "auth_user_id": "<UUID>", "role": "customer"}`.
2. IF `auth_user_id` di body tidak cocok dengan `sub` klaim JWT yang dikirim, THEN THE Backend SHALL mengembalikan HTTP 403 dengan Error_Response standar dan pesan "Auth user ID tidak sesuai dengan token".
3. IF `auth_user_id` sudah terdaftar di `user_profiles`, THEN THE Backend SHALL mengembalikan HTTP 409 dengan Error_Response standar dan pesan "Akun sudah terdaftar".
4. IF `no_hp` sudah dipakai oleh customer lain di tabel `customers`, THEN THE Backend SHALL mengembalikan HTTP 409 dengan Error_Response standar dan pesan "Nomor HP sudah terdaftar".
5. IF field `nama` kosong (string kosong atau hanya spasi), melebihi 100 karakter, atau field `no_hp` kosong, mengandung karakter selain digit dan awalan `+`, atau panjangnya di luar rentang 8–15 karakter, THEN THE Backend SHALL mengembalikan HTTP 422 dengan Error_Response standar sesuai format validasi Pydantic.
6. THE Backend SHALL menyimpan operasi pembuatan customer ke audit log dengan memanggil `write_audit_log` dalam transaksi yang sama; `personnel_id` pada audit log menggunakan nilai sentinel UUID (`00000000-0000-0000-0000-000000000001`) karena registrasi customer dilakukan oleh customer sendiri, bukan oleh personnel.
7. IF terjadi error database yang tidak terduga (bukan pelanggaran constraint unik yang sudah ditangani pada kriteria 3 dan 4) saat menyimpan data, THEN THE Backend SHALL me-rollback seluruh transaksi (customers + user_profiles) dan mengembalikan HTTP 500 dengan Error_Response standar.
8. THE Backend SHALL memverifikasi JWT pada endpoint ini hanya berdasarkan tanda tangan Supabase tanpa mengharuskan baris yang sudah ada di `user_profiles`, sehingga pengguna yang baru selesai mendaftar di Supabase Auth dapat langsung memanggil endpoint ini.

---

### Requirement 3: Modal Login Customer

**User Story:** Sebagai customer, saya ingin dapat login melalui modal yang muncul di atas halaman yang sedang saya lihat, sehingga saya tidak perlu meninggalkan konteks halaman yang sedang saya jelajahi.

#### Acceptance Criteria

1. THE Customer_Login_Modal SHALL menampilkan form dengan field input email (`type="email"`) dan kata sandi (`type="password"`), serta tombol submit "Masuk" dan tombol tutup modal.
2. WHEN pengguna mengklik tombol "Masuk" dengan field kosong, THE Customer_Login_Modal SHALL mencegah pengiriman form dan menampilkan pesan validasi pada field yang kosong.
3. WHEN pengguna mengklik tombol "Masuk" dengan email dan kata sandi tidak kosong, THE Customer_Login_Modal SHALL menonaktifkan semua input dan tombol, menampilkan indikator loading, lalu memanggil Supabase_Auth untuk autentikasi.
4. WHEN Supabase_Auth mengembalikan sesi berhasil, THE Customer_Login_Modal SHALL memanggil `GET /api/v1/auth/me` untuk mendapatkan role pengguna.
5. WHEN `GET /api/v1/auth/me` mengembalikan role `customer`, THE Customer_Login_Modal SHALL menutup dirinya sendiri dan memperbarui state halaman yang mendasarinya agar aksi yang memicu modal dapat dilanjutkan tanpa reload atau navigasi URL.
6. WHEN `GET /api/v1/auth/me` mengembalikan role selain `customer`, THE Customer_Login_Modal SHALL mengakhiri sesi Supabase, mengaktifkan kembali input dan tombol, dan menampilkan pesan error "Akun ini bukan akun customer. Silakan gunakan halaman login staf." dengan tautan ke `/internal/login`.
7. IF Supabase_Auth mengembalikan error kredensial tidak valid, THEN THE Customer_Login_Modal SHALL mengaktifkan kembali semua input dan tombol, menghapus nilai field kata sandi, dan menampilkan pesan error "Email atau kata sandi salah".
8. IF Supabase_Auth mengembalikan error email belum dikonfirmasi, THEN THE Customer_Login_Modal SHALL menampilkan pesan error "Email belum dikonfirmasi. Periksa kotak masuk email Anda." dan menawarkan tombol "Kirim ulang email konfirmasi".
9. WHEN pengguna mengklik tombol "Kirim ulang email konfirmasi", THE Customer_Login_Modal SHALL menonaktifkan tombol tersebut, memanggil `supabase.auth.resend({ type: "signup", email })`, lalu menampilkan pesan konfirmasi "Email konfirmasi telah dikirim ulang."; IF permintaan gagal, THEN THE Customer_Login_Modal SHALL menampilkan pesan error dan mengaktifkan kembali tombol.
10. IF `GET /api/v1/auth/me` mengembalikan HTTP 403, THEN THE Customer_Login_Modal SHALL mengakhiri sesi Supabase, mengaktifkan kembali input, dan menampilkan pesan error "Akun Anda belum diaktifkan. Hubungi administrator."
11. WHILE Customer_Login_Modal menunggu respons, THE Customer_Login_Modal SHALL menonaktifkan semua input dan tombol untuk mencegah pengiriman duplikat.
12. THE Customer_Login_Modal SHALL dapat ditutup tanpa login dengan mengklik tombol tutup atau menekan Escape, tanpa efek samping pada state halaman.
13. THE Customer_Login_Modal SHALL menyediakan tautan ke Signup_Page (`/signup`) dengan teks "Daftar sebagai customer baru".
14. IF jaringan terputus dalam 10 detik saat Customer_Login_Modal memanggil Supabase_Auth atau Backend, THEN THE Customer_Login_Modal SHALL menampilkan pesan error koneksi dalam elemen dengan `role="alert"` dan mengaktifkan kembali semua input dan tombol.

---

### Requirement 3B: Halaman Login Customer Mandiri (`/login`)

**User Story:** Sebagai customer, saya ingin memiliki halaman login mandiri di rute `/login` yang menampilkan form login langsung, sehingga saya dapat login melalui bookmark, tautan langsung, atau saat mengakses sistem dari luar konteks pop-up modal.

#### Acceptance Criteria

1. THE Customer_Login_Page SHALL berada pada rute `/login` dan menampilkan form dengan field input email (`type="email"`) dan kata sandi (`type="password"`), serta tombol submit "Masuk".
2. THE Customer_Login_Page SHALL menampilkan heading "Masuk Akun Customer" dan mengatur `document.title` menjadi "Masuk Customer — Dewa Jam".
3. WHEN pengguna mengklik tombol "Masuk" dengan field kosong, THE Customer_Login_Page SHALL mencegah pengiriman form dan menampilkan pesan validasi "Email dan kata sandi wajib diisi" dalam elemen dengan `role="alert"`.
4. WHEN pengguna mengklik tombol "Masuk" dengan email dan kata sandi valid, THE Customer_Login_Page SHALL menonaktifkan input dan tombol, menampilkan indikator proses, lalu memanggil Supabase_Auth untuk autentikasi.
5. WHEN Supabase_Auth mengembalikan sesi berhasil, THE Customer_Login_Page SHALL memanggil `GET /api/v1/auth/me` untuk memverifikasi role pengguna.
6. WHEN `GET /api/v1/auth/me` mengembalikan role `customer`, THE Customer_Login_Page SHALL menyetel Auth_Context ke `customer` dan mengarahkan pengguna ke `/`.
7. WHEN `GET /api/v1/auth/me` mengembalikan role selain `customer` (mis. staf operasional atau manajemen), THE Customer_Login_Page SHALL mengakhiri sesi Supabase, mengaktifkan kembali form, dan menampilkan pesan error "Akun ini bukan akun customer. Silakan gunakan halaman login staf." dengan tautan menuju `/internal/login`.
8. IF Supabase_Auth mengembalikan error kredensial tidak valid, THEN THE Customer_Login_Page SHALL mengaktifkan kembali semua input dan tombol, menghapus nilai field kata sandi, dan menampilkan pesan error "Email atau kata sandi salah".
9. IF Supabase_Auth mengembalikan error email belum dikonfirmasi, THEN THE Customer_Login_Page SHALL menampilkan pesan error "Email belum dikonfirmasi. Periksa kotak masuk email Anda." dan menawarkan tombol "Kirim ulang email konfirmasi".
10. WHEN pengguna mengklik tombol "Kirim ulang email konfirmasi", THE Customer_Login_Page SHALL menonaktifkan tombol tersebut, memanggil `supabase.auth.resend({ type: "signup", email })`, lalu menampilkan pesan konfirmasi "Email konfirmasi telah dikirim ulang."; IF permintaan gagal, THEN THE Customer_Login_Page SHALL menampilkan pesan error dan mengaktifkan kembali tombol.
11. IF `GET /api/v1/auth/me` mengembalikan HTTP 403, THEN THE Customer_Login_Page SHALL mengakhiri sesi Supabase, mengaktifkan kembali input, dan menampilkan pesan error "Akun Anda belum diaktifkan. Hubungi administrator."
12. WHILE Customer_Login_Page menunggu respons, THE Customer_Login_Page SHALL menonaktifkan semua input dan tombol untuk mencegah pengiriman duplikat.
13. THE Customer_Login_Page SHALL menyediakan tautan ke Signup_Page (`/signup`) dengan teks "Daftar sebagai customer baru" dan tautan ke Personnel_Login_Page (`/internal/login`) untuk staf.
14. WHEN pengguna yang sudah terautentikasi sebagai `customer` mengakses Customer_Login_Page, THE Customer_Login_Page SHALL langsung mengarahkan pengguna ke `/`.

---

### Requirement 4: Halaman Registrasi Customer (`/signup`)

**User Story:** Sebagai calon customer, saya ingin halaman registrasi yang mudah dipahami, sehingga saya dapat membuat akun baru di Dewa Jam dan langsung diarahkan ke halaman login setelah berhasil mendaftar.

#### Acceptance Criteria

1. THE Signup_Page SHALL menampilkan form dengan field: nama lengkap (`type="text"`), nomor HP (`type="tel"`), email (`type="email"`), kata sandi (`type="password"`), dan konfirmasi kata sandi (`type="password"`), serta tombol submit dengan label "Daftar".
2. WHEN pengguna mengklik tombol "Daftar" dengan salah satu field kosong, THE Signup_Page SHALL mencegah pengiriman form dan menampilkan pesan validasi pada field yang kosong.
3. WHEN nilai field kata sandi dan konfirmasi kata sandi tidak sama, THE Signup_Page SHALL menampilkan pesan validasi "Kata sandi tidak cocok" secara inline di bawah field konfirmasi kata sandi, dan menonaktifkan tombol "Daftar".
4. IF kata sandi memiliki panjang kurang dari 8 karakter, THEN THE Signup_Page SHALL menampilkan pesan validasi "Kata sandi minimal 8 karakter" secara inline di bawah field kata sandi, dan menonaktifkan tombol "Daftar".
5. IF nilai field email tidak sesuai format email yang valid, THEN THE Signup_Page SHALL menampilkan pesan validasi "Format email tidak valid" secara inline di bawah field email, dan menonaktifkan tombol "Daftar".
6. WHEN pengguna mengklik tombol "Daftar" dengan semua field valid, THE Signup_Page SHALL memanggil `supabase.auth.signUp({ email, password })` terlebih dahulu untuk membuat akun Supabase Auth.
7. WHEN Supabase_Auth berhasil membuat akun, THE Signup_Page SHALL memanggil `POST /api/v1/auth/register` dengan body `{"auth_user_id": "<UUID dari session>", "nama": "<nama>", "no_hp": "<no_hp>"}` dan JWT dari sesi baru.
124: 8. WHEN `POST /api/v1/auth/register` mengembalikan HTTP 201, THE Signup_Page SHALL menampilkan pesan sukses "Akun berhasil dibuat! Periksa email Anda untuk konfirmasi." dan mengarahkan pengguna ke `/` setelah 3 detik.
125: 9. IF Supabase_Auth mengembalikan error yang mengandung `user_already_exists` atau "User already registered", THEN THE Signup_Page SHALL menampilkan pesan error "Email sudah terdaftar. Silakan login atau gunakan email lain." secara inline di bawah field email.
10. IF `POST /api/v1/auth/register` mengembalikan HTTP 409 dengan body yang mengandung "Nomor HP sudah terdaftar", THEN THE Signup_Page SHALL menampilkan pesan error tersebut secara inline di bawah field nomor HP.
11. IF `POST /api/v1/auth/register` mengembalikan HTTP 409 dengan body yang mengandung "Akun sudah terdaftar", THEN THE Signup_Page SHALL menampilkan pesan error "Akun ini sudah terdaftar di sistem. Silakan login."
12. IF `POST /api/v1/auth/register` mengembalikan kode HTTP selain 201 atau 409, THEN THE Signup_Page SHALL menampilkan pesan error umum "Terjadi kesalahan. Coba lagi." dan mengaktifkan kembali semua input dan tombol.
13. WHILE Signup_Page menunggu respons dari Supabase_Auth atau Backend, THE Signup_Page SHALL menonaktifkan semua input dan tombol untuk mencegah pengiriman duplikat.
14. THE Signup_Page SHALL menyediakan tautan menuju Customer_Login_Page (`/login`) atau Customer_Login_Modal dengan teks "Sudah punya akun? Masuk".

---

### Requirement 5: Halaman Login Personnel (`/internal/login`)

**User Story:** Sebagai personnel (kasir, gudang, manager, atau admin), saya ingin halaman login khusus staf yang terpisah dari halaman customer, sehingga saya dapat masuk ke area kerja saya tanpa tergabung dengan alur customer.

#### Acceptance Criteria

1. THE Personnel_Login_Page SHALL menampilkan teks deskriptif "Halaman khusus akses staf dan manajemen" di atas form login.
2. THE Personnel_Login_Page SHALL menampilkan form dengan field input email (`type="email"`) dan kata sandi (`type="password"`), serta tombol submit dengan label "Masuk".
3. THE Personnel_Login_Page SHALL tidak menyediakan tautan atau tombol menuju halaman registrasi apapun.
4. WHEN pengguna mengklik tombol "Masuk" dengan field email atau kata sandi kosong, THE Personnel_Login_Page SHALL mencegah pengiriman form dan menampilkan pesan validasi pada field yang kosong.
5. WHEN pengguna mengklik tombol "Masuk" dengan email dan kata sandi yang tidak kosong, THE Personnel_Login_Page SHALL menonaktifkan semua input dan tombol, menampilkan indikator loading, lalu memanggil Supabase_Auth untuk autentikasi.
6. WHEN Supabase_Auth mengembalikan sesi berhasil, THE Personnel_Login_Page SHALL memanggil `GET /api/v1/auth/me` untuk mendapatkan role pengguna.
7. WHEN `GET /api/v1/auth/me` mengembalikan role `kasir`, THE Personnel_Login_Page SHALL mengarahkan pengguna ke `/pos` dalam waktu paling lama 3 detik sejak sesi diterima.
8. WHEN `GET /api/v1/auth/me` mengembalikan role `gudang`, THE Personnel_Login_Page SHALL mengarahkan pengguna ke `/warehouse` dalam waktu paling lama 3 detik sejak sesi diterima.
9. WHEN `GET /api/v1/auth/me` mengembalikan role `manager`, THE Personnel_Login_Page SHALL mengarahkan pengguna ke `/management` dalam waktu paling lama 3 detik sejak sesi diterima.
10. WHEN `GET /api/v1/auth/me` mengembalikan role `admin`, THE Personnel_Login_Page SHALL mengarahkan pengguna ke `/management` dalam waktu paling lama 3 detik sejak sesi diterima.
11. WHEN `GET /api/v1/auth/me` mengembalikan role `customer`, THE Personnel_Login_Page SHALL mengakhiri sesi Supabase, mengaktifkan kembali semua input dan tombol, dan menampilkan pesan error "Akun ini bukan akun staf. Silakan gunakan halaman login customer." dengan tautan ke `/login`.
12. IF Supabase_Auth mengembalikan error kredensial tidak valid, THEN THE Personnel_Login_Page SHALL mengaktifkan kembali semua input dan tombol, menghapus nilai field kata sandi, dan menampilkan pesan error "Email atau kata sandi salah" tanpa mengekspos detail teknis.
13. IF Supabase_Auth mengembalikan error email belum dikonfirmasi, THEN THE Personnel_Login_Page SHALL menampilkan pesan error "Email belum dikonfirmasi. Periksa kotak masuk email Anda." dan menawarkan tombol "Kirim ulang email konfirmasi".
14. WHEN pengguna mengklik tombol "Kirim ulang email konfirmasi" di Personnel_Login_Page, THE Personnel_Login_Page SHALL menonaktifkan tombol tersebut, memanggil `supabase.auth.resend({ type: "signup", email })`, lalu menampilkan pesan konfirmasi "Email konfirmasi telah dikirim ulang."; IF permintaan gagal, THEN THE Personnel_Login_Page SHALL menampilkan pesan error bahwa pengiriman ulang gagal dan mengaktifkan kembali tombol.
15. IF `GET /api/v1/auth/me` mengembalikan HTTP 403 setelah sesi Supabase berhasil diterima, THEN THE Personnel_Login_Page SHALL mengakhiri sesi Supabase, mengaktifkan kembali semua input dan tombol, dan menampilkan pesan error "Akun Anda belum diaktifkan. Hubungi administrator."
16. WHILE Personnel_Login_Page menunggu respons dari Supabase_Auth atau Backend, THE Personnel_Login_Page SHALL menonaktifkan semua input dan tombol untuk mencegah pengiriman duplikat.
17. WHEN pengguna yang sudah terautentikasi sebagai Personnel mengakses Personnel_Login_Page, THE Personnel_Login_Page SHALL langsung mengarahkan pengguna ke rute kerja sesuai role-nya (kriteria 7–10).
157: 
158: ---
159: 
160: ### Requirement 6: Akses Publik dan Lazy Auth (`/`, `/inplace`)
161: 
162: **User Story:** Sebagai pengunjung toko online, saya ingin dapat menjelajahi produk tanpa harus login terlebih dahulu, sehingga saya dapat membuat keputusan pembelian sebelum berkomitmen membuat akun.
163: 
164: #### Acceptance Criteria
165: 
166: 1. WHEN pengguna tanpa sesi Supabase_Auth aktif mengakses rute `/` (Marketplace) atau `/inplace` (serta `/shop` yang dialihkan ke `/`), THE Guard SHALL merender halaman tersebut dalam Guest_Mode tanpa mengarahkan ke halaman login.
167: 2. WHEN pengguna dalam Guest_Mode di area marketplace (`/`) mencoba melakukan aksi yang membutuhkan akun (tambah ke keranjang atau checkout), THE Frontend SHALL membuka Customer_Login_Modal dengan pesan yang menjelaskan bahwa aksi tersebut membutuhkan akun.
168: 2a. WHEN pengguna dalam Guest_Mode di area `/inplace` menambahkan item ke keranjang, THE Frontend SHALL memproses aksi tersebut tanpa meminta login (keranjang disimpan di sesi lokal perangkat).
169: 2b. WHEN pengguna dalam Guest_Mode di area `/inplace` mencoba melakukan checkout, THE Frontend SHALL membuka Customer_Login_Modal dengan pesan bahwa checkout membutuhkan identitas pembeli.
170: 3. WHEN pengguna yang sudah terautentikasi sebagai `customer` mengakses rute `/` atau `/inplace`, THE Guard SHALL merender halaman tanpa menampilkan modal atau prompt login, dan aksi yang membutuhkan akun dapat langsung diproses.
171: 4. WHEN pengguna yang sudah terautentikasi sebagai Personnel mengakses rute `/` atau `/inplace`, THE Guard SHALL merender halaman tersebut tanpa mengarahkan ke halaman login, dan komponen yang menampilkan aksi customer (tambah ke keranjang, checkout) SHALL tidak ditampilkan atau dinonaktifkan.
172: 5. THE rute `/signup` dan `/internal/login` SHALL dapat diakses tanpa sesi aktif (rute publik — tidak dilindungi Guard).
173: 
174: ---
175: 
176: ### Requirement 7: Hard Auth untuk Area Personnel
177: 
178: **User Story:** Sebagai sistem, saya ingin memastikan area kerja personnel tidak dapat diakses oleh pengguna yang belum login atau tidak memiliki role yang sesuai, sehingga data operasional toko terlindungi.
179: 
180: #### Acceptance Criteria
181: 
182: 1. WHEN pengguna tanpa sesi Supabase_Auth aktif mencoba mengakses rute di bawah `/pos`, `/warehouse`, atau `/management`, THE Guard SHALL mengarahkan pengguna ke `/internal/login`.
183: 2. WHEN pengguna yang sudah terautentikasi sebagai `customer` mencoba mengakses rute di bawah `/pos`, `/warehouse`, atau `/management`, THE Guard SHALL mengarahkan pengguna ke `/`.
184: 3. WHEN pengguna dengan role `kasir` mencoba mengakses rute yang `allowedRoles`-nya tidak menyertakan `kasir`, THE Guard SHALL mengarahkan pengguna ke `/pos`.
185: 4. WHEN pengguna dengan role `gudang` mencoba mengakses rute yang `allowedRoles`-nya tidak menyertakan `gudang`, THE Guard SHALL mengarahkan pengguna ke `/warehouse`.
186: 5. WHEN pengguna dengan role `manager` atau `admin` mencoba mengakses rute yang `allowedRoles`-nya tidak menyertakan role tersebut, THE Guard SHALL mengarahkan pengguna ke `/management`.
187: 6. WHILE sesi Supabase_Auth personnel masih aktif dan belum expired, THE Guard SHALL tidak meminta pengguna login ulang meskipun pengguna menavigasi ke halaman berbeda atau me-refresh halaman.
188: 7. WHEN Guard mendeteksi sesi Supabase_Auth yang kedaluwarsa atau tidak valid saat navigasi atau refresh di area personnel, THE Guard SHALL menghapus data sesi dan role dari memori aplikasi dan mengarahkan pengguna ke `/internal/login`.
189: 
190: ---
191: 
192: ### Requirement 8: Redirect Setelah Login Berdasarkan Role
193: 
194: **User Story:** Sebagai pengguna sistem, saya ingin setelah login langsung diarahkan ke area yang relevan dengan peran saya dan konteks halaman login yang saya gunakan, sehingga saya tidak perlu mencari sendiri ke mana harus pergi setelah masuk.
195: 
196: #### Acceptance Criteria
197: 
198: 1. WHEN login berhasil melalui Customer_Login_Modal, THE Frontend SHALL menutup modal dan melanjutkan aksi yang memicu modal tanpa navigasi URL. IF tidak ada aksi tertunda, THE Frontend SHALL me-refresh state halaman yang mendasari tanpa navigasi.
199: 2. WHEN login berhasil melalui Personnel_Login_Page dan role yang dikembalikan `GET /api/v1/auth/me` adalah `kasir`, THE Frontend SHALL mengarahkan pengguna ke rute pertama di Route_Registry yang `allowedRoles`-nya menyertakan `kasir`.
200: 3. WHEN login berhasil melalui Personnel_Login_Page dan role yang dikembalikan `GET /api/v1/auth/me` adalah `gudang`, THE Frontend SHALL mengarahkan pengguna ke rute pertama di Route_Registry yang `allowedRoles`-nya menyertakan `gudang`.
201: 4. WHEN login berhasil melalui Personnel_Login_Page dan role yang dikembalikan `GET /api/v1/auth/me` adalah `manager`, THE Frontend SHALL mengarahkan pengguna ke rute pertama di Route_Registry yang `allowedRoles`-nya menyertakan `manager`.
202: 5. WHEN login berhasil melalui Personnel_Login_Page dan role yang dikembalikan `GET /api/v1/auth/me` adalah `admin`, THE Frontend SHALL mengarahkan pengguna ke rute pertama di Route_Registry yang `allowedRoles`-nya menyertakan `admin`.
203: 6. THE Frontend SHALL menentukan rute tujuan untuk personnel dengan membaca Route_Registry — mencari entri pertama yang `allowedRoles`-nya menyertakan role pengguna — bukan dengan hardcode mapping role-ke-URL di Personnel_Login_Page.
204: 7. IF `GET /api/v1/auth/me` mengembalikan role yang tidak ada di Route_Registry manapun, THEN THE Frontend SHALL mengarahkan pengguna ke halaman login asal (Customer_Login_Modal tetap terbuka jika datang dari modal, Personnel_Login_Page jika datang dari `/internal/login`) dan menampilkan pesan error "Role tidak dikenali. Hubungi administrator."
205: 
206: ---
207: 
208: ### Requirement 9: Logout
209: 
210: **User Story:** Sebagai pengguna yang sudah login, saya ingin dapat keluar dari akun saya dan diarahkan ke halaman login yang sesuai, sehingga sesi saya berakhir dengan bersih dan aman.
211: 
212: #### Acceptance Criteria
213: 
214: 1. THE Shell SHALL menyediakan tombol "Keluar" yang terlihat oleh semua pengguna yang memiliki sesi aktif.
215: 2. WHEN pengguna mengklik tombol "Keluar", THE Shell SHALL memanggil `supabase.auth.signOut()` dan menunggu responsnya.
216: 3. WHEN `supabase.auth.signOut()` berhasil dan Auth_Context sesi adalah `customer`, THE Frontend SHALL menghapus data sesi dan role dari memori aplikasi dan mengarahkan pengguna ke `/`.
217: 4. WHEN `supabase.auth.signOut()` berhasil dan Auth_Context sesi adalah `personnel`, THE Frontend SHALL menghapus data sesi dan role dari memori aplikasi dan mengarahkan pengguna ke `/internal/login`.
218: 5. IF `supabase.auth.signOut()` gagal karena error jaringan atau server, THEN THE Frontend SHALL tetap menghapus data sesi dan role dari memori aplikasi dan mengarahkan pengguna ke halaman login sesuai Auth_Context terakhir yang diketahui.
219: 6. WHEN logout selesai (berhasil atau gagal), THE Frontend SHALL memastikan tidak ada data sesi Supabase_Auth atau data role yang tersisa di memori aplikasi, sehingga permintaan berikutnya ke rute yang dilindungi Guard menghasilkan redirect yang sesuai.

---

### Requirement 10: Penanganan Error dan Aksesibilitas

**User Story:** Sebagai pengguna, saya ingin pesan error yang jelas dan antarmuka yang mudah digunakan dengan keyboard dan pembaca layar, sehingga saya dapat memahami apa yang salah dan tetap dapat menyelesaikan proses autentikasi di ketiga halaman form.

#### Acceptance Criteria

1. THE Customer_Login_Modal, Personnel_Login_Page, dan Signup_Page SHALL menampilkan pesan error dengan elemen yang memiliki atribut `role="alert"` sehingga pembaca layar membacanya secara otomatis.
2. THE Customer_Login_Modal, Personnel_Login_Page, dan Signup_Page SHALL menggunakan elemen `<label>` yang terhubung dengan `<input>` melalui atribut `htmlFor` untuk setiap field form.
3. THE Customer_Login_Modal, Personnel_Login_Page, dan Signup_Page SHALL dapat dinavigasi sepenuhnya menggunakan keyboard (Tab untuk pindah antar elemen dengan urutan fokus yang mengikuti urutan visual elemen dari atas ke bawah, Enter untuk submit form).
4. WHEN pengguna menekan Enter di dalam form Customer_Login_Modal, Personnel_Login_Page, atau Signup_Page, THE Frontend SHALL memproses form setara dengan klik tombol submit.
5. THE Customer_Login_Modal SHALL memiliki atribut `autoComplete` yang sesuai: `autoComplete="email"` untuk field email, `autoComplete="current-password"` untuk field kata sandi. THE Personnel_Login_Page SHALL memiliki atribut `autoComplete` yang sama.
6. THE Signup_Page SHALL memiliki atribut `autoComplete` yang sesuai: `autoComplete="email"` untuk field email, `autoComplete="new-password"` untuk field kata sandi baru dan konfirmasi kata sandi, `autoComplete="tel"` untuk field nomor HP.
7. IF jaringan terputus atau tidak merespons dalam 10 detik saat Customer_Login_Modal atau Personnel_Login_Page memanggil Supabase_Auth atau Backend, THEN THE komponen tersebut SHALL menampilkan pesan error koneksi dalam elemen dengan `role="alert"` dan mengaktifkan kembali semua input dan tombol.
8. IF jaringan terputus atau tidak merespons dalam 10 detik saat Signup_Page memanggil Supabase_Auth atau Backend, THEN THE Signup_Page SHALL menampilkan pesan error koneksi dalam elemen dengan `role="alert"` dan mengaktifkan kembali semua input dan tombol.
9. THE Personnel_Login_Page SHALL menampilkan judul halaman "Masuk Staf — Dewa Jam" di elemen `<h1>` dan memasang `document.title` dengan nilai yang sama.
10. THE Signup_Page SHALL menampilkan judul halaman "Daftar — Dewa Jam" di elemen `<h1>` dan memasang `document.title` dengan nilai yang sama.
11. THE Customer_Login_Modal SHALL mendapatkan fokus keyboard pada field email saat pertama kali dibuka (focus trap di dalam modal).
12. WHEN Customer_Login_Modal ditutup, THE Frontend SHALL mengembalikan fokus keyboard ke elemen yang membuka modal.

---

## Di Luar Cakupan

Fitur dan komponen berikut **tidak** menjadi bagian dari spec `foundation-login-signup` ini:

- Reset/lupa kata sandi (belum ada alur reset password).
- Login dengan OAuth/SSO (Google, Facebook, dsb.).
- Manajemen akun (ubah email, ubah kata sandi, hapus akun).
- Pembuatan akun staf, manager, atau admin oleh administrator (direncanakan di spec terpisah untuk manajemen user).
- Verifikasi nomor HP (OTP via SMS).
- 2FA/MFA (Two-Factor Authentication).
- Desain UI final dan styling lengkap dengan shadcn/kokonut ui (spec ini boleh menggunakan inline styles atau Tailwind minimal; UI final dirapikan di spec terpisah).
- Notifikasi real-time untuk sesi (WebSocket/SSE).
- Manajemen sesi ganda (login dari beberapa device).
- Audit log untuk aksi customer (di luar scope; diputuskan di spec TPS sales).
- Rate limiting atau brute-force protection di backend (security enhancement, bukan bagian fase ini).
- Implementasi aksi spesifik yang memicu Lazy_Auth (tambah ke keranjang, checkout) — aksi tersebut didefinisikan di spec TPS masing-masing; spec ini hanya mendefinisikan mekanisme Guard dan modal prompt-nya.
- Halaman penuh `/login` untuk customer — customer login menggunakan modal (Customer_Login_Modal), bukan halaman tersendiri.
