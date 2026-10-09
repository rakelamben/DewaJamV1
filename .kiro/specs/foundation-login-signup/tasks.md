# Implementation Plan: Foundation Login & Signup (with Root Marketplace Routing)

## Overview

Membangun modul autentikasi dan pendaftaran pengguna sistem Dewa Jam sesuai spesifikasi `foundation-login-signup` dan penyesuaian rute marketplace ke base URL (`/`).
Spec ini mencakup:
- Backend: model `Customer`, error code `ERR_CONFLICT`, dependency `get_jwt_payload_only`, modul `auth` (`routes.py`, `service.py`, `repository.py`, `schemas.py`) dengan endpoint `GET /api/v1/auth/me` dan `POST /api/v1/auth/register`, serta migrasi sentinel personnel untuk audit log.
- Frontend: `AuthContext`, pembaruan `routeRegistry` dengan `path: "/"` untuk Marketplace Toko Online (`authMode: 'lazy'`), pembaruan `Guard.tsx` dengan dukungan `lazy` & `hard` auth dan pencocokan root path yang aman, redirect `/shop` ke `/`, tombol Keluar di `Shell.tsx`, `CustomerLoginModal`, `PersonnelLoginPage` (`/internal/login`), dan `SignupPage` (`/signup`).
- Testing & Kualitas: Unit tests & property tests untuk backend dan frontend.

## Tasks

---

### Grup 1: Backend Core & Database Migration

- [x] 1. Core Model, Error, Dependency, dan Migration
  - [x] 1.1 Buat SQLAlchemy model `Customer` di `backend/app/core/models.py`
    - Mapping ke tabel `toko_jam.customers` (`customer_id`, `nama`, `no_hp`, `created_at`)
    - _Requirements: 2.1_
  - [x] 1.2 Tambahkan konstanta `ERR_CONFLICT = "conflict"` di `backend/app/core/errors.py`
    - _Requirements: 2.3, 2.4_
  - [x] 1.3 Tambahkan dependency `get_jwt_payload_only` di `backend/app/core/dependencies.py`
    - Verifikasi JWT signature Supabase tanpa lookup ke `user_profiles`
    - _Requirements: 2.8_
  - [x] 1.4 Buat Alembic migration `003_add_sentinel_personnel.py`
    - Pastikan baris sentinel personnel `00000000-0000-0000-0000-000000000001` tersedia untuk audit log registrasi customer
    - _Requirements: 2.6_

---

### Grup 2: Backend Modul Auth (`backend/app/modules/auth/`)

- [x] 2. Implementasi Modul Auth Backend
  - [x] 2.1 Buat Pydantic schemas di `backend/app/modules/auth/schemas.py`
    - `MeResponse`: `auth_user_id`, `role`, `entity_type`, `entity_id`
    - `RegisterRequest`: `auth_user_id`, `nama` (1-100 char, non-whitespace), `no_hp` (regex `^\+?\d{7,14}$`)
    - `RegisterResponse`: `customer_id`, `auth_user_id`, `role` ("customer")
    - _Requirements: 1.1, 2.1, 2.5_
  - [x] 2.2 Buat `backend/app/modules/auth/repository.py`
    - Query `user_profiles` by `auth_user_id`, customer by `no_hp`
    - Buat customer, user profile, dan catat `activity_logs` via `write_audit_log` dalam satu transaksi atomik
    - _Requirements: 2.1, 2.6, 2.7_
  - [x] 2.3 Buat `backend/app/modules/auth/service.py`
    - Logika `resolve_me`
    - Logika `register_customer`: validasi `auth_user_id == sub`, deteksi duplikasi (409), rollback jika gagal (500)
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.7_
  - [x] 2.4 Buat `backend/app/modules/auth/routes.py`
    - `GET /api/v1/auth/me` dengan `get_current_user`
    - `POST /api/v1/auth/register` dengan `get_jwt_payload_only`
    - _Requirements: 1.1, 2.1_
  - [x] 2.5 Daftarkan router auth di `backend/app/main.py`
    - Include `auth_router` dengan prefix `/api/v1/auth`
    - _Requirements: 1.1, 2.1_
  - [x] 2.6 Buat tests backend di `backend/tests/modules/auth/`
    - `test_routes.py`: me struktur & unauth (401, 403), register sukses (201), duplikasi (409), validasi (422), audit log
    - _Requirements: 1.1-1.5, 2.1-2.7_

---

### Grup 3: Frontend Foundation & Routing

- [x] 3. Frontend Context, Registry, Guard & Shell
  - [x] 3.1 Buat `frontend/src/shared/auth-context.tsx`
    - React Context untuk `authContext` ('customer' | 'personnel' | null)
    - Helper `setGlobalAuthContext` & `getGlobalAuthContext`
    - _Requirements: 8.6, 9.3, 9.4_
  - [x] 3.2 Update `frontend/src/app/registry.ts`
    - Tambah field `authMode: 'lazy' | 'hard'`
    - Ubah rute Toko Online ke `path: "/"` dengan `authMode: "lazy"`
    - Tetapkan `authMode: "lazy"` untuk `/inplace` dan `authMode: "hard"` untuk area operasional
    - _Requirements: 6.1, 7.1_
  - [x] 3.3 Update `frontend/src/app/Guard.tsx`
    - Dukung rute publik (`/signup`, `/internal/login`, `/login`)
    - Pencocokan URL root `"/"` vs path bersarang agar tidak greedy
    - Implementasikan `lazy` auth (guest mode) dan `hard` auth (redirect ke `/internal/login`)
    - Role mismatch handling: redirect staf sesuai registry, redirect customer ke `/`
    - Update `authContext`
    - _Requirements: 6.1, 6.5, 7.1-7.5_
  - [x] 3.4 Update `frontend/src/app/routes.tsx`
    - Hapus rute generik `/login`
    - Daftarkan `/signup` dan `/internal/login`
    - Pasang redirect `/shop` -> `/`
    - Wildcard redirect `*` ke `/`
    - _Requirements: 4.1, 5.1, 6.1_
  - [x] 3.5 Update `frontend/src/app/Shell.tsx`
    - Tombol "Keluar" di sidebar
    - Logout memanggil `supabase.auth.signOut()` dan redirect ke `/internal/login` (personnel) atau `/` (customer)
    - _Requirements: 9.1-9.6_
  - [x] 3.6 Update `frontend/src/app/App.tsx`
    - Bungkus dengan `<AuthContextProvider>`
    - _Requirements: 8.6_
  - [x] 3.7 Update `frontend/src/shared/api-client.ts`
    - Interceptor 401 redirect ke `/internal/login` atau `/` sesuai global auth context
    - _Requirements: 7.7_

---

### Grup 4: Frontend UI Komponen Auth

- [x] 4. Komponen UI Login & Signup
  - [x] 4.1 Buat `frontend/src/modules/auth/CustomerLoginModal.tsx`
    - Dialog overlay dengan focus trap, ESC close, validasi input, disable on submit
    - Supabase sign in + `GET /api/v1/auth/me`
    - Tolak personnel dengan pesan error dan tautan ke `/internal/login`
    - Tombol resend konfirmasi email
    - Tautan ke `/signup`
    - Callback `onSuccess` dipanggil tepat sekali
    - _Requirements: 3.1-3.14, 10.1-10.12_
  - [x] 4.2 Buat `frontend/src/modules/auth/PersonnelLoginPage.tsx`
    - Halaman login staf di `/internal/login`
    - Tolak customer dengan link ke `/`
    - Dynamic redirect berdasar `routeRegistry`
    - Aksesibilitas (`<h1>`, document.title, role alert, htmlFor)
    - _Requirements: 5.1-5.17, 10.1-10.9_
  - [x] 4.3 Buat `frontend/src/modules/auth/SignupPage.tsx`
    - Form pendaftaran customer di `/signup`
    - Validasi client-side: password >= 8 char, password match, no_hp regex
    - Supabase signUp + `POST /api/v1/auth/register`
    - Redirect ke `/` setelah 3 detik sukses
    - _Requirements: 4.1-4.14, 10.1-10.10_
  - [x] 4.4 Buat `frontend/src/modules/auth/LoginPage.tsx`
    - Halaman login mandiri customer di `/login` (alternatif modal)
    - Validasi form, penolakan akun staf dengan link ke `/internal/login`
    - Auto-redirect jika sudah memiliki sesi aktif
    - _Requirements: 3B.1-3B.14_

---

### Grup 5: Testing & Verifikasi

- [x] 5. Pengujian & Penjaminan Kualitas
  - [x] 5.1 Jalankan pengujian backend (`pytest backend/tests/`)
  - [x] 5.2 Perbarui dan tambahkan pengujian frontend:
    - Update `Guard.test.tsx` (lazy auth `/`, hard auth `/pos`, mismatch redirect ke `/`)
    - Update `registry.test.ts`
    - `CustomerLoginModal.test.tsx`
    - `LoginPage.test.tsx`
    - `PersonnelLoginPage.test.tsx`
    - `SignupPage.test.tsx`
    - `Shell.test.tsx`
  - [x] 5.3 Jalankan seluruh pengujian frontend (`npm test -- --run`)
  - [x] 5.4 Jalankan linter backend (`ruff check`) dan frontend (`npm run lint`)
