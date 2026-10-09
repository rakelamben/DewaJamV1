# Implementation Plan: Platform Foundation

## Overview

Membangun fondasi teknis sistem Dewa Jam: scaffold backend FastAPI dengan Core layer (config, database, auth/RBAC, audit log, error handling, event bus), scaffold frontend React dengan route registry dan role-based routing, integrasi Supabase Auth, baseline Alembic, serta tooling kualitas kode (ruff, ESLint, Prettier).

Urutan implementasi mengikuti dependensi ketat: tooling → Alembic baseline → Core backend → migrasi `user_profiles` → module scaffold → endpoint → frontend → tests.

## Tasks

---

### Grup 1: Project Setup

- [x] 1. Siapkan struktur folder root dan file konfigurasi project
  - [x] 1.1 Buat `.gitignore` di root repository
    - Tambahkan entri: `.env`, `backend/.env`, `frontend/.env`, `__pycache__/`, `.venv/`, `node_modules/`, `dist/`, `*.pyc`, `.pytest_cache/`, `coverage/`
    - _Requirements: 8.6_
  - [x] 1.2 Buat `backend/.env.example`
    - Dokumentasikan variabel: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`, `ENVIRONMENT`
    - Semua nilai diisi placeholder (bukan nilai asli)
    - _Requirements: 8.4_
  - [x] 1.3 Buat `frontend/.env.example`
    - Dokumentasikan variabel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`
    - Semua nilai diisi placeholder
    - _Requirements: 8.5_
  - [x] 1.4 Buat `backend/pyproject.toml` dengan konfigurasi ruff
    - Konfigurasi `[tool.ruff]`: `line-length = 88`, `target-version = "py312"`, pilih rules: `E`, `F`, `I` (isort)
    - Konfigurasi `[tool.ruff.format]`
    - _Requirements: 8.7_

---

### Grup 2: Backend — Inisialisasi Project dan Alembic

- [x] 2. Inisialisasi project backend dan baseline Alembic
  - [x] 2.1 Buat struktur folder backend dan `requirements.txt`
    - Buat folder: `backend/app/`, `backend/app/core/`, `backend/app/modules/`, `backend/migrations/`, `backend/tests/`
    - Buat `backend/requirements.txt` dengan versi yang dikunci:
      ```
      fastapi==0.109.0
      uvicorn[standard]==0.27.0
      sqlalchemy==2.0.25
      alembic==1.13.1
      pydantic==2.5.3
      pydantic-settings==2.1.0
      psycopg2-binary==2.9.9
      pyjwt==2.8.0
      python-dotenv==1.0.0
      pytest==7.4.4
      httpx==0.26.0
      ruff==0.2.0
      ```
    - _Requirements: 1.1, 1.4_
  - [x] 2.2 Inisialisasi Alembic dan konfigurasi `env.py`
    - Jalankan `alembic init migrations` dari `backend/`
    - Edit `backend/migrations/env.py`: set `target_metadata` dari SQLAlchemy Base, konfigurasi `include_schemas=True`, set search path untuk schema `toko_jam`
    - Edit `backend/alembic.ini`: set `sqlalchemy.url` kosong (dibaca dari env var di `env.py`)
    - _Requirements: 8.1_
  - [x] 2.3 Buat migration baseline `001_baseline.py`
    - Buat file `backend/migrations/versions/001_baseline.py`
    - Fungsi `upgrade()` berisi hanya `pass` — tidak ada DDL
    - Fungsi `downgrade()` berisi hanya `pass`
    - Docstring menjelaskan ini adalah baseline skema Supabase existing
    - _Requirements: 8.1_
  - [x] 2.4 Buat SQLAlchemy `Base` dan file `__init__.py` untuk `app/`
    - Buat `backend/app/__init__.py` (kosong)
    - Buat `backend/app/core/__init__.py` yang mengekspor `publish`, `subscribe` dari `events.py` (akan diisi di task 3)
    - Buat SQLAlchemy `Base = declarative_base()` di `backend/app/core/database.py` sebagai placeholder (akan dilengkapi di task 3.2)
    - _Requirements: 1.4_

---

### Grup 3: Backend Core

- [x] 3. Implementasikan komponen Core backend
  - [x] 3.1 Buat `backend/app/core/config.py`
    - Definisikan class `Settings(BaseSettings)` dengan field: `DATABASE_URL: str`, `SUPABASE_URL: str`, `SUPABASE_JWT_SECRET: str`, `SUPABASE_SERVICE_ROLE_KEY: str`, `ALLOWED_ORIGINS: str = "http://localhost:5173"`, `ENVIRONMENT: str = "development"`
    - Instantiasi `settings = Settings()` di level modul
    - Jika salah satu dari tiga field wajib tidak ada saat import → `pydantic-settings` raise `ValidationError`; tangkap di `main.py` dan ubah ke `SystemExit`
    - _Requirements: 1.2, 1.3_
  - [x] 3.2 Buat `backend/app/core/database.py`
    - Buat `engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)` — sync, bukan async
    - Buat `SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)`
    - Buat generator `get_db()` yang yield session dan close di `finally`
    - Definisikan `Base = declarative_base()` dengan `metadata` di schema `toko_jam`
    - _Requirements: 1.4_
  - [x] 3.3 Buat `backend/app/core/errors.py`
    - Definisikan konstanta error code: `ERR_UNAUTHORIZED`, `ERR_FORBIDDEN`, `ERR_NOT_FOUND`, `ERR_VALIDATION`, `ERR_INTERNAL`, `ERR_SERVICE_UNAVAILABLE`
    - Buat helper `error_response(code, message, detail=None) -> dict` yang menghasilkan `{"error": {"code": ..., "message": ..., "detail": ...}}` — field `detail` selalu hadir, default `null`
    - Buat `global_exception_handler` untuk Exception → HTTP 500, tanpa ekspos detail internal
    - Buat `http_exception_handler` untuk `HTTPException` → pastikan format sesuai standar; handle 404 dan 405 dari routing layer
    - Buat `validation_exception_handler` untuk `RequestValidationError` → HTTP 422 dengan field `detail` array `[{"field": "...", "reason": "..."}]`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [x] 3.4 Buat `backend/app/core/events.py`
    - Buat dict global `_subscribers: dict[str, list[Callable]]`
    - Implementasi `subscribe(event_name: str, handler: Callable[[dict], None])`: validasi `event_name` non-empty dan max 255 karakter
    - Implementasi `publish(event_name: str, payload: dict)`: panggil semua handler secara sinkron; jika handler raise exception, log WARNING dan lanjutkan ke handler berikutnya
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 3.5 Buat `backend/app/core/audit.py`
    - Implementasi `write_audit_log(session, personnel_id, action, table_name, record_id=None, detail=None)`
    - Validasi `action` in `["create", "update", "delete"]` → raise `ValueError` jika tidak valid, **sebelum** INSERT
    - Buat objek `ActivityLog` dan `session.add()` — **tidak** commit (caller yang commit)
    - Tulis docstring Google Style lengkap (parameter, tipe, nilai yang diizinkan, perilaku error)
    - Buat SQLAlchemy model `ActivityLog` yang memetakan ke `toko_jam.activity_logs` (kolom sesuai schema.sql: `log_id`, `personnel_id`, `action`, `table_name`, `record_id`, `detail` JSONB, `created_at`)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7_
  - [x] 3.6 Buat `backend/app/core/dependencies.py` — model SQLAlchemy dan JWT verification
    - Buat SQLAlchemy model `UserProfile` (tabel `toko_jam.user_profiles`): `auth_user_id` UUID PK, `entity_type` VARCHAR CHECK, `entity_id` UUID, `created_at`, `updated_at`
    - Buat SQLAlchemy model `Personnel` (memetakan ke `toko_jam.personnel`): `personnel_id`, `personnel_type`, `created_at`
    - Buat SQLAlchemy model `Staff` (memetakan ke `toko_jam.staff`): `staff_id`, `personnel_id`, `role`, kolom lain sesuai schema.sql
    - Implementasi `resolve_role(db, profile) -> str`: mapping `personnel_type` dan `staff.role` ke 5 role sistem (`admin`, `manager`, `kasir`, `gudang`, `customer`)
    - Implementasi `get_current_user(authorization, db)`: verifikasi JWT dengan `SUPABASE_JWT_SECRET` → ekstrak `sub` → cari `user_profiles` → resolve role; raise 401 jika token invalid/expired, 403 jika tidak terdaftar; 503 jika DB tidak bisa dijangkau
    - Implementasi `require_role(*allowed_roles)`: validasi argumen saat inisialisasi (hanya 5 role valid, else `ValueError`); kembalikan dependency yang check role dari `get_current_user`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - [x] 3.7 Update `backend/app/core/__init__.py`
    - Ekspor `publish`, `subscribe` dari `events.py`
    - Ekspor `settings` dari `config.py`
    - Ekspor `get_db` dari `database.py`
    - Ekspor `write_audit_log` dari `audit.py`
    - Ekspor `get_current_user`, `require_role` dari `dependencies.py`
    - Ekspor konstanta error code dari `errors.py`
    - _Requirements: 7.4_

---

### Grup 4: Database Migration — user_profiles

- [x] 4. Buat migration Alembic untuk tabel `user_profiles`
  - [x] 4.1 Buat migration `002_add_user_profiles.py`
    - Buat file `backend/migrations/versions/002_add_user_profiles.py` dengan `down_revision = "001"`
    - Fungsi `upgrade()`: `op.create_table("user_profiles", ...)` di schema `toko_jam`
      - Kolom: `auth_user_id UUID PK`, `entity_type VARCHAR NOT NULL`, `entity_id UUID NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
      - `CheckConstraint("entity_type IN ('personnel', 'customer')", name="check_entity_type")`
      - `UniqueConstraint("entity_type", "entity_id", name="uq_entity")`
      - `op.create_index("ix_user_profiles_entity", "user_profiles", ["entity_type", "entity_id"], schema="toko_jam")`
    - Fungsi `downgrade()`: drop index, lalu `op.drop_table("user_profiles", schema="toko_jam")`
    - _Requirements: 3.5_

---

### Grup 5: Backend App — main.py dan Module Scaffold TPS

- [x] 5. Buat `main.py` dan scaffold module TPS
  - [x] 5.1 Buat `backend/app/main.py` dengan `create_app()`
    - Implementasi `create_app() -> FastAPI`: buat instance FastAPI, konfigurasi CORS (`ALLOWED_ORIGINS` dari settings, methods: GET POST PUT PATCH DELETE), daftarkan tiga exception handler dari `core/errors.py`
    - Tambahkan endpoint `GET /api/v1/health` yang return `{"status": "ok"}` tanpa auth
    - Publish event `"app.started"` dengan payload `{"timestamp": "<ISO 8601 UTC>"}` di akhir `create_app()`
    - Tangkap `ValidationError` dari pydantic-settings di level modul → `SystemExit` dengan pesan yang menyebutkan nama variabel yang hilang
    - Definisikan `app = create_app()` di level modul untuk Uvicorn
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 7.5_
  - [x] 5.2 Buat scaffold module TPS — domain `catalog`
    - Buat folder `backend/app/modules/tps/catalog/`
    - Buat `__init__.py` kosong di `modules/`, `modules/tps/`, `modules/tps/catalog/`
    - Buat `routes.py`: `router = APIRouter()` dan komentar `# TODO: implement catalog routes`
    - Buat `service.py`, `repository.py`, `models.py`, `schemas.py`: masing-masing berisi komentar `# TODO: implement`
    - _Requirements: 1.7_
  - [x] 5.3 Buat scaffold module TPS — domain `inventory`, `sales`, `fulfillment`
    - Buat folder dan file yang sama (`routes.py`, `service.py`, `repository.py`, `models.py`, `schemas.py`) untuk `inventory/`, `sales/`, `fulfillment/`
    - Setiap file berisi komentar `# TODO: implement`
    - _Requirements: 1.7_

---

### Grup 6: Backend Tests

- [x] 6. Tulis test backend
  - [x] 6.1 Buat `backend/tests/test_health.py`
    - Gunakan `TestClient` dari `httpx` (atau `fastapi.testclient`)
    - Test `GET /api/v1/health` → status 200, body `{"status": "ok"}`
    - _Requirements: 8.2_
  - [x] 6.2 Tulis unit test untuk `core/events.py`
    - Buat `backend/tests/core/test_events.py`
    - Test `publish` tanpa subscriber → tidak error
    - Test `publish` dengan satu subscriber → handler dipanggil dengan payload yang benar
    - Test `publish` dengan beberapa subscriber → semua handler dipanggil
    - Test handler yang raise exception → handler berikutnya tetap dipanggil
    - Test `subscribe` dengan `event_name` kosong → `ValueError`
    - Test `subscribe` dengan `event_name` > 255 karakter → `ValueError`
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 6.3 Tulis unit test untuk `core/audit.py`
    - Buat `backend/tests/core/test_audit.py`
    - Test `write_audit_log` dengan action valid → baris ditambahkan ke session
    - Test `write_audit_log` dengan action tidak valid → `ValueError` sebelum INSERT
    - Test `write_audit_log` tidak auto-commit (gunakan mock session)
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 6.4 Tulis unit test untuk `core/errors.py`
    - Buat `backend/tests/core/test_errors.py`
    - Test `error_response()` selalu menyertakan field `detail` (meski nilainya `null`)
    - Test `validation_exception_handler` → HTTP 422, `detail` berupa array dengan field `field` dan `reason`
    - Test `global_exception_handler` → HTTP 500, tidak ada stack trace di response body
    - Test `http_exception_handler` → format standar
    - _Requirements: 6.1, 6.2, 6.3, 6.6_
  - [x] 6.5 Tulis unit test untuk `core/dependencies.py`
    - Buat `backend/tests/core/test_dependencies.py`
    - Test `require_role` dengan role tidak valid → `ValueError` saat inisialisasi
    - Test `get_current_user` tanpa header → HTTP 401
    - Test `get_current_user` dengan token expired (gunakan pyjwt untuk generate) → HTTP 401
    - Test `get_current_user` dengan token invalid → HTTP 401
    - Test `resolve_role` mapping: `personnel_type='admin'` → `'admin'`, `personnel_type='manager'` → `'manager'`, `staf_operasional` → `'kasir'`, `staf_gudang` → `'gudang'`, `entity_type='customer'` → `'customer'`
    - _Requirements: 3.2, 3.3, 4.1, 4.4_
  - [x] 6.6 Checkpoint — Pastikan semua test backend lulus
    - Jalankan `pytest` dari `backend/` dan pastikan semua test hijau
    - Jalankan `ruff check . && ruff format --check .` dari `backend/` — tidak ada pelanggaran
    - Pastikan tidak ada import `modules/` dari `core/`
    - _Requirements: 8.7_

---

### Grup 7: Frontend Setup

- [x] 7. Inisialisasi project frontend dengan Vite dan install semua dependencies
  - [x] 7.1 Scaffold project frontend dengan Vite + React + TypeScript
    - Buat project Vite di folder `frontend/` dengan template `react-ts`
    - Pastikan struktur folder: `frontend/src/app/`, `frontend/src/shared/`, `frontend/src/modules/tps/`
    - _Requirements: 2.1_
  - [x] 7.2 Install dan konfigurasi dependencies frontend
    - Install dependencies produksi: `react-router-dom@^6.21.0`, `@supabase/supabase-js@^2.39.0`, `axios@^1.6.5`, `@tanstack/react-query@^5.17.0`
    - Install devDependencies: `vitest@^1.2.0`, `@testing-library/react@^14.1.2`, `@testing-library/jest-dom@^6.2.0`, `tailwindcss@^3.4.1`, `eslint`, `prettier`
    - Konfigurasi Vitest di `vite.config.ts` (tambahkan `test` config)
    - Konfigurasi `tsconfig.json` untuk strict mode
    - Tambahkan script `"test": "vitest --run"` di `package.json`
    - _Requirements: 8.3, 8.8_
  - [x] 7.3 Konfigurasi ESLint dan Prettier
    - Buat `.eslintrc.cjs` atau `eslint.config.js` dengan rules TypeScript + React
    - Buat `.prettierrc` dengan konfigurasi dasar (semi, singleQuote, tabWidth)
    - Pastikan `npm run lint` dapat dijalankan tanpa error pada file kosong/template
    - _Requirements: 8.8_

---

### Grup 8: Frontend Core

- [x] 8. Implementasikan komponen Core frontend
  - [x] 8.1 Buat `frontend/src/shared/auth.ts`
    - Buat Supabase client: `createClient(supabaseUrl, supabaseAnonKey)`
    - Validasi env vars saat startup: jika `VITE_SUPABASE_URL` atau `VITE_SUPABASE_ANON_KEY` tidak ada → `throw new Error(...)` yang menghentikan inisialisasi
    - Ekspor `supabase` client
    - _Requirements: 2.10, 3.1_
  - [x] 8.2 Buat `frontend/src/shared/api-client.ts`
    - Buat axios instance dengan `baseURL` dari `VITE_API_BASE_URL`
    - Request interceptor: ambil session dari `supabase.auth.getSession()`, jika tidak ada session → throw error autentikasi (jangan kirim request); jika ada → tambahkan `Authorization: Bearer <token>`
    - Response interceptor: jika response HTTP 401 → `supabase.auth.signOut()` dan redirect ke `/login`
    - _Requirements: 2.9, 3.1, 3.3_
  - [x] 8.3 Buat `frontend/src/app/registry.ts`
    - Definisikan interface `RouteConfig { path: string; label: string; allowedRoles: string[]; component: React.LazyExoticComponent<any> }`
    - Definisikan `routeRegistry: RouteConfig[]` dengan 5 entri sesuai requirements:
      - `{ path: "/shop", label: "Toko Online", allowedRoles: ["customer", "admin"] }`
      - `{ path: "/inplace", label: "Inplace Store", allowedRoles: ["customer", "admin"] }`
      - `{ path: "/pos", label: "Kasir", allowedRoles: ["kasir", "manager", "admin"] }`
      - `{ path: "/warehouse", label: "Gudang", allowedRoles: ["gudang", "manager", "admin"] }`
      - `{ path: "/management", label: "Manajemen", allowedRoles: ["manager", "admin"] }`
    - Setiap entri memiliki `component` sebagai `React.lazy(() => import(...))`
    - _Requirements: 2.1, 2.2, 2.6, 2.8_
  - [x] 8.4 Buat placeholder pages untuk 5 area TPS
    - Buat komponen berikut masing-masing hanya menampilkan heading `<h1>{label}</h1>`:
      - `frontend/src/modules/tps/shop/ShopPage.tsx` — heading "Toko Online"
      - `frontend/src/modules/tps/inplace/InplacePage.tsx` — heading "Inplace Store"
      - `frontend/src/modules/tps/pos/PosPage.tsx` — heading "Kasir"
      - `frontend/src/modules/tps/warehouse/WarehousePage.tsx` — heading "Gudang"
      - `frontend/src/modules/tps/management/ManagementPage.tsx` — heading "Manajemen"
    - _Requirements: 2.7_
  - [x] 8.5 Buat `frontend/src/app/Guard.tsx`
    - Komponen `Guard({ children })` yang memeriksa session Supabase saat mount dan saat `location.pathname` berubah
    - Jika tidak ada session → redirect ke `/login`
    - Fetch role user dari backend (endpoint `/api/v1/auth/me` atau gunakan mekanisme yang ada)
    - Baca `routeRegistry` untuk menemukan entri yang cocok dengan `location.pathname`
    - Jika role tidak ada di `allowedRoles` → cari entri pertama di registry yang `allowedRoles` cocok dengan role, redirect ke sana; jika tidak ada → redirect ke `/login`
    - Jika sedang loading auth → tampilkan loading state
    - _Requirements: 2.4, 2.5, 2.8_
  - [x] 8.6 Buat `frontend/src/app/Shell.tsx`
    - Komponen `Shell({ children })` dengan navigasi samping atau atas
    - Ambil session Supabase dan resolve role user
    - Filter `routeRegistry` berdasarkan `allowedRoles.includes(userRole)` → tampilkan hanya link yang sesuai
    - Render `{children}` di area konten
    - Menu dibangun murni dari `routeRegistry` — tidak ada hardcoded URL atau role di Shell
    - _Requirements: 2.3, 2.8_
  - [x] 8.7 Buat `frontend/src/app/routes.tsx` dan `App.tsx`
    - `routes.tsx`: buat `<Routes>` dari `routeRegistry` menggunakan `React.lazy` + `<Suspense>`, tambahkan route `/login` (halaman login sederhana) dan catch-all `*` → redirect ke login
    - `App.tsx`: bungkus semua dengan `<BrowserRouter>`, `<Guard>`, dan `<Shell>`
    - `main.tsx`: update import root render dengan `<App />`
    - _Requirements: 2.1, 2.4_

---

### Grup 9: Frontend Tests

- [x] 9. Tulis test frontend dan pastikan kualitas kode
  - [x] 9.1 Buat `frontend/src/app/Shell.test.tsx`
    - Render `<Shell>` dengan mock `BrowserRouter` dan mock Supabase session
    - Verifikasi komponen berhasil dirender tanpa error
    - Verifikasi menu items muncul sesuai role (mock role `manager` → tampil Kasir, Gudang, Manajemen; mock role `customer` → tampil Toko Online, Inplace Store)
    - Gunakan `screen.getByRole` atau `screen.getByText`
    - _Requirements: 8.3_
  - [x] 9.2 Tulis unit test untuk `Guard.tsx`
    - Buat `frontend/src/app/Guard.test.tsx`
    - Test: tanpa session → navigate ke `/login` dipanggil
    - Test: role tidak ada di `allowedRoles` rute saat ini → navigate ke rute yang sesuai
    - Test: role ada di `allowedRoles` → children dirender
    - _Requirements: 2.4, 2.5_
  - [x] 9.3 Tulis unit test untuk `registry.ts`
    - Buat `frontend/src/app/registry.test.ts`
    - Test: semua 5 area terdaftar
    - Test: setiap entri memiliki field `path`, `label`, `allowedRoles`, `component`
    - Test: menambah entri baru ke registry langsung tersedia (verifikasi array bisa di-extend)
    - _Requirements: 2.2, 2.6, 2.8_
  - [x] 9.4 Checkpoint akhir — pastikan kualitas kode frontend
    - Jalankan `npm run lint` dari `frontend/` → tidak ada pelanggaran ESLint atau Prettier
    - Jalankan `npm run test -- --run` dari `frontend/` → semua test hijau
    - Pastikan tidak ada hardcoded role-to-URL mapping di `Guard.tsx` atau `Shell.tsx`
    - _Requirements: 8.8_

---

## Notes

- Tasks bertanda `*` (opsional) dapat dilewati untuk MVP yang lebih cepat, tapi sangat direkomendasikan karena komponen Core adalah fondasi semua fitur berikutnya
- Setiap task merujuk ke requirements spesifik untuk keterlacakan
- Urutan task wajib diikuti: Grup 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
- Migrasi 002 (task 4.1) harus ada sebelum model `UserProfile` di task 3.6 digunakan di production — tapi boleh dikembangkan paralel saat development lokal
- `core/` **tidak boleh** mengimpor dari `modules/` — periksa di setiap task Grup 3
- Alur data di setiap module TPS: `routes.py` → `service.py` → `repository.py` — jangan sampai terbalik

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.4"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["3.1"] },
    { "id": 5, "tasks": ["3.2", "3.3", "3.4"] },
    { "id": 6, "tasks": ["3.5", "3.6"] },
    { "id": 7, "tasks": ["3.7", "4.1"] },
    { "id": 8, "tasks": ["5.1"] },
    { "id": 9, "tasks": ["5.2"] },
    { "id": 10, "tasks": ["5.3"] },
    { "id": 11, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 12, "tasks": ["6.6", "7.1"] },
    { "id": 13, "tasks": ["7.2"] },
    { "id": 14, "tasks": ["7.3"] },
    { "id": 15, "tasks": ["8.1", "8.2", "8.3", "8.4"] },
    { "id": 16, "tasks": ["8.5", "8.6"] },
    { "id": 17, "tasks": ["8.7"] },
    { "id": 18, "tasks": ["9.1", "9.2", "9.3"] },
    { "id": 19, "tasks": ["9.4"] }
  ]
}
```
