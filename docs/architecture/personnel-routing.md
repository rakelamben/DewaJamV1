# Arsitektur Routing Personnel

## Portal utama

Seluruh user internal masuk melalui satu portal:

```text
/internal
```

Setelah login di `/internal/login`, user diarahkan ke `/internal`. Portal ini memakai sidebar yang hanya menampilkan modul sesuai role.

## Modul

```text
/internal                  Dashboard personel
/internal/pos              POS / kasir
/internal/master-data     Master data
/internal/warehouse        Operasional gudang
/internal/management       Management
```

Alias lama tetap tersedia dan melakukan redirect:

```text
/pos        -> /internal/pos
/warehouse  -> /internal/warehouse
/management -> /internal/management
```

## Akses role

| Role | Modul |
| --- | --- |
| `kasir` | POS |
| `gudang` | Warehouse |
| `manager` | POS, Master data, Warehouse, Management |
| `admin` | POS, Master data, Warehouse, Management |
| `customer` | Marketplace, bukan portal personnel |

Sidebar adalah kontrol navigasi dan UX. Endpoint backend tetap wajib melakukan validasi role/permission.

## Shell dan identitas personnel

`Shell` menggunakan komponen sidebar shadcn pada `frontend/src/components/ui/sidebar.tsx`.
Menu sidebar difilter berdasarkan role aktif dan dapat diciutkan untuk memberi ruang lebih besar pada modul kerja.

Header area internal menampilkan:

- tipe personnel/role;
- email personnel;
- tombol logout.

Dashboard `/internal` menampilkan sapaan:

```text
Selamat bekerja, [username]
```

Data `username` dan `email` disediakan oleh endpoint `GET /api/v1/auth/me`.

## Alur autentikasi

```text
/internal/login
  -> Supabase Auth
  -> GET /api/v1/auth/me
  -> resolve role dari user_profiles + personnel
  -> /internal
```

User dengan role personnel yang membuka marketplace diarahkan ke `/internal`. Customer yang membuka portal personnel diarahkan ke `/`.
