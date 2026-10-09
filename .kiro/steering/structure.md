# Project Structure

Arsitektur: **modular monolith**. Satu repository, satu backend (FastAPI) dan satu frontend (React), dengan batas antar modul yang tegas.

## Layout

```
jam-system/
├── .kiro/
│   ├── steering/        # product.md, tech.md, structure.md
│   └── specs/           # satu folder per fitur
├── backend/
│   ├── app/
│   │   ├── main.py              # create_app(), include_router per modul
│   │   ├── core/                # config, db session, auth/RBAC (dependencies), audit log, error handler, event bus
│   │   └── modules/
│   │       ├── tps/
│   │       ├── oas/                 # menyusul
│   │       ├── kms/                 # menyusul
│   │       ├── mis/                 # menyusul
│   │       └── iss/                 # menyusul (DSS, EIS, ES)
│   ├── migrations/              # Alembic
│   └── tests/                   # mirror struktur app/
├── frontend/
│   └── src/
│       ├── app/                 # shell, router, layout, guard role
│       ├── shared/              # api client, komponen UI, auth
│       └── modules/
│           └── tps/
└── docs/
    └── database/
        └── schema.sql           # skema Supabase yang sudah ada (sumber acuan)
```

Subfolder domain di atas adalah rencana. Buat folder hanya saat spec-nya dikerjakan.

## Struktur dalam satu domain (backend)

Setiap domain, misalnya `modules/tps/sales/`, memiliki file yang sama:

```
routes.py       # APIRouter, hanya menerima request dan memanggil service
service.py      # logika bisnis, antarmuka publik domain
repository.py   # akses database (SQLAlchemy)
models.py       # model SQLAlchemy
schemas.py      # model Pydantic (request/response)
```

Alur panggilan: `routes` → `service` → `repository`. Route tidak boleh langsung memanggil repository.

## Aturan dependency

- Modul lain **tidak boleh** meng-import `repository` atau `models` milik domain lain. Gunakan fungsi di `service.py` atau event lewat event bus di `core/`.
- Sistem level atas (MIS, ISS) hanya **membaca** data TPS (lewat service atau view read-only). Tidak boleh menulis ke tabel TPS.
- `core/` tidak boleh meng-import dari `modules/`.
- Contoh event: pesanan dibayar → stok dikurangi (`inventory`) → pesanan masuk antrean pickup/delivery (`fulfillment`).

## Skema database

Database Supabase yang sudah ada adalah sumber acuan. Sebelum merancang model baru, cek skema yang ada dan sesuaikan desain dengannya, bukan sebaliknya.

Referensi skema: #[[file:docs/database/schema.sql]]

Perubahan skema berikutnya lewat migrasi Alembic (lihat `tech.md`).

## Konvensi API

- Prefix: `/api/v1/<sistem>/<domain>/...`, contoh `/api/v1/tps/sales/orders`.
- Resource memakai kata benda jamak, dan penamaan field JSON `snake_case`.
- Semua error memakai format standar yang didefinisikan di `core/` (spec `platform-foundation`).
- Endpoint dilindungi dengan dependency role, mis. `require_role("kasir")`.

## Frontend: role-based routing

Satu SPA, area per peran dipisahkan di router:

| Prefix route | modul | role yang boleh | mode |
|---|---|---|---|
| `/` | TPS (Marketplace) | publik / customer, admin | lazy auth (guest mode diizinkan, `/shop` dialihkan ke `/`) |
| `/inplace/...` | TPS | admin, customer (hanya saat checkout) | lazy auth |
| `/login` | Auth | publik (halaman login customer mandiri / alternatif modal) | publik |
| `/signup` | Auth | publik (calon customer) | publik |
| `/internal/login`| Auth | publik (khusus staf & manajemen) | publik |
| `/pos/...` | TPS | admin, kasir, manager | hard auth (wajib login) |
| `/warehouse/...`| TPS | admin, gudang, manager | hard auth (wajib login) |
| `/management/...` | TPS(master data) | admin, manager | hard auth (wajib login) |
|  `/oas`| OAS | kasir, gudang, manager, admin | hard auth |
|  `/kms`| KMS | semua role (tergantung konten) | hard auth |
|  `/management/reports`| MIS | admin, manager | hard auth |
|  `/management/insights`| ISS | admin, manager | hard auth |

Guard dan menu dibangun dari metadata `allowedRoles` dan `authMode` di tiap route yang didaftarkan modul. Jangan memetakan prefix URL ke role secara hardcode. Rute `/` adalah landing page marketplace utama, dan `/shop` dialihkan (redirect) ke `/`.

## Testing

- Backend: `backend/tests/` mirror struktur `backend/app/` (mis. `tests/modules/tps/sales/test_service.py`).
- Frontend: test berdampingan dengan source (`Component.test.tsx` di folder yang sama).
- Setiap task di `tasks.md` yang mengubah perilaku harus menyertakan test.

## Konvensi penamaan

- Python: `snake_case` untuk file, fungsi, dan variabel; `PascalCase` untuk class.
- React: `PascalCase` untuk komponen dan file komponen; `camelCase` untuk hook dan fungsi (hook diawali `use`).
- Tabel database mengikuti skema yang sudah ada. Tabel baru memakai `snake_case` jamak.

## Konvensi spec Kiro

- Satu spec = satu fitur yang bisa selesai dan dites sendiri (sekitar 3 sampai 8 user story).
- Nama folder spec: `<sistem>-<fitur>` dengan huruf kecil dan tanda hubung. Contoh: `tps-product-catalog`, `tps-pos-checkout`. Spec lintas sistem memakai `platform-`.
- Requirements memakai format EARS (`WHEN ... THE SYSTEM SHALL ...`).
- `design.md` memuat model data, kontrak endpoint, dan event yang dipublikasikan atau dikonsumsi.
- Tulis bagian "di luar cakupan" di setiap `requirements.md`.


## General rules

- Jangan commit build artifact, secret, atau file hasil generate. Tambahkan ke `.gitignore`.
- Perbarui file ini setiap kali ada folder top-level atau modul baru yang diperkenalkan.
