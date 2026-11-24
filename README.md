# Tetep Siaga Reks

Dashboard cuaca interaktif dan kesiapsiagaan bencana untuk **Malang Raya** (Kota Malang, Kabupaten Malang, dan Kota Batu) berbasis data resmi **BMKG**, dibangun dengan **Next.js 16 (App Router)**, **Tailwind CSS v4**, **MapLibre GL**, **Zod**, **Biome**, dan **Vitest**.

## Fitur Utama

- **Peta 3D Interaktif 41 Kecamatan Malang Raya**: Choropleth suhu wilayah, sorotan batas kecamatan aktif, pin 471 desa/kelurahan yang bisa diklik, dan perpindahan wilayah mulus tanpa remount peta.
- **Prakiraan Cuaca Resmi BMKG (471 Desa/Kelurahan)**: Suhu, kelembapan, arah dan kecepatan angin, curah hujan, jarak pandang, kurva suhu per 3 jam (WIB), prakiraan 3 hari, jendela kering harian, serta saran adaptif berdasarkan elevasi (Dataran Tinggi, Lembah & Kota, Pesisir Selatan).
- **Info Gempa Bumi BMKG TEWS**: Menggabungkan 3 umpan resmi (`autogempa`, `gempaterkini` M 5+, dan `gempadirasakan` MMI), peta episenter MapLibre yang dimuat malas lengkap dengan garis jarak haversine ke kecamatan aktif, serta proxy Shakemap on-demand.
- **Peringatan Dini Cuaca Ekstrem (CAP 1.2 XML)**: Mengurai RSS nowcast dan dokumen CAP 1.2 XML BMKG, memfilter irisan poligon serta nama 41 kecamatan Malang Raya, dan menampilkannya dalam modal terpusat dengan daftar kecamatan terdampak yang bisa langsung diklik.
- **Pencarian Terkelompok & Geolokasi Presisi**: Combobox 471 desa/kelurahan yang dikelompokkan per kecamatan dengan navigasi papan ketik penuh, `Lokasi saya` berbasis GPS presisi + pengecekan point-in-polygon 41 kecamatan, serta penyimpanan lokasi terakhir di `localStorage`.
- **Ketahanan Offline & PWA/SEO**: Deteksi status jaringan (`useOnline`), cadangan prakiraan 6 wilayah terakhir di `localStorage`, error/loading boundary, favicon SVG, `apple-icon`, Open Graph image, `manifest.ts`, `sitemap.ts`, dan `robots.ts`.

## Sumber Data Resmi & Kebijakan Cache

| Endpoint Lokal | Sumber BMKG | Strategi Cache |
|---|---|---|
| `GET /api/cuaca/[adm4]` | `api.bmkg.go.id/publik/prakiraan-cuaca?adm4=` | `s-maxage=1800, stale-while-revalidate=86400` + stale fallback |
| `GET /api/cuaca/ringkasan` | 41 kode perwakilan kecamatan BMKG (6 paralel) | `s-maxage=1800, stale-while-revalidate=86400` |
| `GET /api/gempa` | `data.bmkg.go.id/DataMKG/TEWS/{autogempa,gempaterkini,gempadirasakan}.json` | `s-maxage=300, stale-while-revalidate=3600` (`?refresh=1` -> `no-store`) |
| `GET /api/gempa/shakemap/[file]` | `data.bmkg.go.id/DataMKG/TEWS/{file}` | `max-age=86400, s-maxage=86400, immutable` |
| `GET /api/peringatan` | `www.bmkg.go.id/alerts/nowcast/id/rss.xml` + CAP 1.2 XML | `s-maxage=300, stale-while-revalidate=3600` (`?refresh=1` -> `no-store`) |

Semua permintaan server ke BMKG mengirim `User-Agent` non-browser eksplisit (`TetepSiagaReks/1.0`) sesuai perilaku verifikasi API BMKG. Batas geografis 41 kecamatan dan 471 kode desa/kelurahan berasal dari `cahyadsn/wilayah` dan `cahyadsn/wilayah_boundaries` (lisensi MIT); peta dasar vektor disediakan oleh OpenFreeMap (OpenStreetMap contributors).

## Menjalankan Secara Lokal

```bash
# 1. Pasang dependensi
pnpm install

# 2. Jalankan mode pengembangan (port 3000)
pnpm dev

# 3. Build & jalankan mode produksi
pnpm build
pnpm start -p 3100
```

## Skrip Tersedia

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Menjalankan Next.js dev server (Turbopack) |
| `pnpm build` | Build produksi Next.js |
| `pnpm lint` | Pemeriksaan kode & gaya dengan Biome |
| `pnpm lint:fix` | Perbaikan otomatis format/lint dengan Biome |
| `pnpm typecheck` | Pemeriksaan tipe TypeScript (`tsc --noEmit`) |
| `pnpm test` | Menjalankan seluruh tes unit Vitest |
| `pnpm bmkg:verify` | Verifikasi langsung 41 kode perwakilan kecamatan ke API BMKG (tambahkan `--all` untuk 471 desa) |
| `pnpm regions:build` | Membangun ulang `src/data/regions.json`, `kecamatan-paths.json`, dan `malang-raya-geo.json` |

## Variabel Lingkungan Opsional

- `NEXT_PUBLIC_SITE_URL`: URL publik situs untuk metadata canonical, `sitemap.xml`, dan `robots.txt` (default: `http://localhost:3100`).
- `BMKG_API_BASE_URL`, `BMKG_DATA_BASE_URL`, `BMKG_WEB_BASE_URL`: Override URL dasar BMKG untuk pengujian atau staging.

## Catatan & Disclaimer

Tetep Siaga Reks dibuat sebagai alat bantu baca cepat untuk kesiapsiagaan harian warga Malang Raya. Dalam kondisi darurat bencana, selalu ikuti instruksi dan peringatan resmi dari **BMKG**, **BPBD Kota Malang**, **BPBD Kabupaten Malang**, dan **BPBD Kota Batu**.
