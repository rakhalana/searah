# TASKS & Implementation Progress

## Milestone 1: Arsitektur Dasar & Setup Awal
- [x] Inisialisasi Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- [x] Konfigurasi Leaflet & OpenStreetMap tiles (SSR-safe via dynamic import)
- [x] Setup environment variables (`OPENROUTESERVICE_API_KEY`, `NOMINATIM_USER_AGENT`, `GOOGLE_MAPS_API_KEY`)
- [x] Schema validation dengan Zod (`lib/validation.ts`)

## Milestone 2: Fitur Geocoding & Routing
- [x] Integrasi Nominatim Geocoding API (`lib/geocoding.ts`, `/api/geocode`)
- [x] Integrasi OpenRouteService API (`lib/routing.ts`, `/api/routes`)
- [x] Dukungan Rute Alternatif ORS (`alternative_routes: { target_count: 2 }`)
- [x] Pemilihan Lokasi Manual di Peta (Tombol 📍 Pilih di Peta, Pin A hijau, Pin B merah)
- [x] Multi-route rendering di Leaflet (Garis Cyan menyala untuk rute aktif, garis putus-putus untuk rute alternatif)

## Milestone 3: Rekomendasi Tempat Makan & Kalkulasi Spasial
- [x] Buffer koridor rute & pemfilteran spasial menggunakan Turf.js (`lib/geo-utils.ts`)
- [x] Dual Provider POI: Google Places API (`lib/google-places.ts`) & Overpass OSM (`lib/overpass.ts`)
- [x] Algoritma ranking tempat makan berdasarkan kombinasi jarak ke rute, detour, dan rating
- [x] Tampilan kartu detail tempat makan (`components/PlaceDetailCard.tsx`) dengan direct link ke Google Maps Navigation

## Milestone 4: Optimasi 1x API Usage & Client-Side Filtering
- [x] Master data caching di hook `useRecommendations.ts` (`allPlaces` state)
- [x] Client-side instant filtering untuk slider toleransi jarak (km)
- [x] Client-side instant filtering untuk kategori jenis tempat (Restoran, Kafe, Fast Food, Semua)
- [x] Indikator status `1x Fetch Aktif • Filter Bebas Kuota` dan opsi Refresh Server

## Milestone 5: Pengerasan Keamanan (Production Security Hardening)
- [x] Sanitasi Anti-XSS pada Leaflet popup menggunakan helper `escapeHtml` (`components/MapView.tsx`)
- [x] Konfigurasi HTTP Security Headers di `next.config.ts` (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [x] In-memory sliding-window rate limiter per client IP (`lib/rate-limit.ts`) untuk endpoint `/api/geocode`, `/api/routes`, dan `/api/recommendations`
- [x] Sanitasi pesan error internal / upstream API (mencegah information disclosure)
- [x] Validasi batas panjang karakter query geocoding (`.min(2).max(100)`)

## Milestone 6: Verifikasi & Pengujian
- [x] Uji linting ESLint 9 (`npm run lint`) — 0 errors
- [x] Uji build kompilasi produksi Next.js (`npm run build`) — Sukses code 0
- [x] Uji end-to-end dengan browser subagent (pemilihan manual di peta, routing Jakarta-Bandung 161.8 km, filter toleransi, dan rendering peta)

## Milestone 7: Redesign Visual Sesuai DESIGN.md ("Rambu Jalan")
- [x] Rombak palet warna ke highway dark (`#121417`, `#1A1D20`, `#202327`, `#2B2E32`) dengan 2 aksen tetap: hijau rambu (`#2F8F5B`) & cokelat kuliner (`#C9762E`)
- [x] Integrasi tipografi resmi: `Overpass` untuk brand mark dan angka statistik besar, `Inter` untuk body teks dan form
- [x] Penataan ulang urutan alur sidebar (1. Lokasi A & B → 2. Cari Rute → 3. Pilihan Rute & Plat Jarak/Waktu → 4. Sumber Data → 5. Cari Tempat Makan → 6. Toleransi Deviasi → 7. Jenis Tempat → 8. Daftar Tempat Makan)
- [x] Eliminasi penuh elemen "AI slop" & emoji (`⚡`, `🔄`, `🗺️`, `📍`, `🍴`, `🍽️`, `☕`, `🍔`, `⭐`, `🌐`, `🔍`)
- [x] Penamaan rute bersih: `Rute 1`, `Rute 2`, `Rute 3`
- [x] Sinkronisasi visual rank badge kuliner cokelat bernomor bulat antara daftar sidebar dan marker peta Leaflet
- [x] Verifikasi browser end-to-end dan validasi build produksi Turbopack
