# Tech Stack

## Ringkasan

| Layer | Pilihan |
|---|---|
| Backend | Python, **FastAPI**, Uvicorn |
| Frontend | TypeScript, React, Vite |
| Database | PostgreSQL di **Supabase** (database sudah ada) |
| Auth | Supabase Auth (backend memverifikasi JWT) |
| Package manager | pip (virtualenv) dan npm |
| Test | pytest (backend), Vitest (frontend) |
| Lint/format | ruff (PEP 8, lint dan format) dan ESLint + Prettier |

Versi: gunakan Python 3.12+ dan Node.js LTS terbaru. Kunci versi yang dipakai di `requirements.txt` dan `package.json`.

## Backend

- **Framework:** FastAPI dengan `APIRouter` per modul, didaftarkan di `app/main.py` melalui `create_app()`.
- **Validasi request/response:** Pydantic v2 (`schemas.py` di tiap domain). Konfigurasi aplikasi lewat `pydantic-settings`.
- **ORM:** SQLAlchemy 2.x, **sync** (bukan async). Jangan mencampur sync dan async di codebase yang sama.
- **Migrasi:** Alembic. Skema yang sudah ada di Supabase dijadikan baseline, perubahan berikutnya lewat migrasi Alembic. Jangan mengubah skema manual lewat dashboard Supabase tanpa migrasi.
- **Auth dan role:** Frontend login lewat Supabase Auth. Backend memverifikasi JWT di dependency (`Depends`) dan membaca role dari tabel di database, bukan dari klaim yang dikirim klien. Role: `customer`, `kasir`, `gudang`, `manager`.
- **Dokumentasi API:** OpenAPI otomatis di `/docs` dan dipakai sebagai acuan kontrak endpoint di `design.md` tiap spec.
- **Server:** Uvicorn (dev dengan `--reload`).

## Frontend

- React + TypeScript + Vite, satu SPA dengan role-based routing.
- Routing: React Router. Data fetching: TanStack Query. (Usulan, ubah bila sudah ada pilihan lain.)
- Library UI: 
  * Desain & Tema: Berpedoman pada DesignMD HubSpot (`.kiro/steering/design-system.md`).
  * Mesin Utilitas: Tailwind CSS (v3.4).
  * Komponen Dasar: shadcn/ui (Radix UI primitives).
  * Komponen Interaktif: Kokonut UI.
  * Visualisasi Data: Bilk-it / Tremor (data visualizer analitik).
- Tipografi: Fraunces (Display H1 Serif) dan Plus Jakarta Sans (UI & Body Sans-Serif).
- Bahasa antarmuka: Indonesia.

## Konvensi data

- Uang dalam Rupiah. Simpan sebagai bilangan bulat atau `NUMERIC`, **jangan float**.
- Waktu disimpan dalam UTC dan ditampilkan sebagai Asia/Jakarta.
- Semua endpoint yang mengubah data harus ditulis ke audit log.

## Environment dan secret

- Konfigurasi lewat environment variable, contoh: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET` (backend), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend).
- Service role key Supabase hanya boleh dipakai di backend. Jangan pernah dikirim ke frontend atau di-commit.
- Sediakan `.env.example` tanpa nilai rahasia. File `.env` masuk `.gitignore`.

## Common Commands

```bash
# Backend (jalankan dari folder backend/)
python -m venv .venv
pip install -r requirements.txt
uvicorn app.main:app --reload        # dev server
pytest                               # test
ruff check . && ruff format .        # lint dan format
alembic upgrade head                 # terapkan migrasi

# Frontend (jalankan dari folder frontend/)
npm install
npm run dev                          # dev server
npm run build                        # build production
npm run test -- --run                # test (sekali jalan, tanpa watch)
npm run lint                         # lint
```

## Keputusan teknis yang masih terbuka

- Payment gateway untuk pembayaran online.
- Penyimpanan gambar produk (Supabase Storage atau lainnya).
- Strategi baseline Alembic terhadap skema yang sudah ada (diputuskan di spec `platform-foundation`).
