# Architecture Decision Records (ADR) — Searah

Dokumen ini mencatat keputusan-keputusan arsitektur penting (*Architecture Decision Records*) yang diambil selama perancangan dan pengembangan aplikasi **Searah**.

---

## Daftar Isi ADR

- [ADR-001: Arsitektur Full-Stack Monolith dengan Next.js 16 (App Router)](#adr-001-arsitektur-full-stack-monolith-dengan-nextjs-16-app-router)
- [ADR-002: Dual Provider POI (Google Places & OpenStreetMap Overpass Fallback)](#adr-002-dual-provider-poi-google-places--openstreetmap-overpass-fallback)
- [ADR-003: Pola 1x API Usage & Instant Client-Side Filtering](#adr-003-pola-1x-api-usage--instant-client-side-filtering)
- [ADR-004: Penentuan Lokasi Hybrid (Autocomplete Geocoding + Manual Map Click)](#adr-004-penentuan-lokasi-hybrid-autocomplete-geocoding--manual-map-click)
- [ADR-005: Dukungan Rute Alternatif Menggunakan OpenRouteService](#adr-005-dukungan-rute-alternatif-menggunakan-openrouteservice)
- [ADR-006: Pengerasan Keamanan Produksi (Anti-XSS, Security Headers, Rate Limiting)](#adr-006-pengerasan-keamanan-produksi-anti-xss-security-headers-rate-limiting)

---

## ADR-001: Arsitektur Full-Stack Monolith dengan Next.js 16 (App Router)

### Status
**Accepted**

### Konteks & Masalah
Aplikasi membutuhkan integrasi erat antara peta interaktif berbasis browser (Leaflet.js) dengan backend proxy untuk memanggil API eksternal (OpenRouteService, Nominatim, Google Places, Overpass). Membangun backend terpisah (misalnya Express/FastAPI) akan menambah overhead deployment, kompleksitas CORS, dan biaya server.

### Keputusan
Menggunakan arsitektur **Next.js 16 (App Router)** sebagai Full-Stack Monolith:
1. Frontend dibangun menggunakan React 19 Client Components.
2. Backend dibangun menggunakan Next.js Route Handlers (`app/api/*/route.ts`) yang berjalan sebagai Vercel Serverless Functions.

### Konsekuensi
- **Positif:**
  - Satu repository, satu pipeline deployment CI/CD ke Vercel Edge Network.
  - Masalah CORS antar frontend-backend internal otomatis tereliminasi.
  - Kunci rahasia API tersimpan aman di environment serverless tanpa bocor ke browser client.
- **Negatif / Mitigasi:**
  - Leaflet memerlukan akses ke objek browser (`window`). Mitigasi: MapView di-import secara dinamis menggunakan `next/dynamic` dengan opsi `ssr: false`.

---

## ADR-002: Dual Provider POI (Google Places & OpenStreetMap Overpass Fallback)

### Status
**Accepted**

### Konteks & Masalah
OpenStreetMap (OSM) Overpass gratis dan tidak memiliki kuota berbayar, namun di beberapa wilayah data rating, jam buka, dan ulasan kurang lengkap. Di sisi lain, Google Places API memiliki data ulasan dan rating yang sangat lengkap tetapi berbiaya per panggilan ($32/1.000 request) dan memiliki kuota ketat.

### Keputusan
Menerapkan pendekatan **Dual Provider** dengan tombol toggle di UI:
1. **Google Places API (Default):** Menggunakan endpoint Legacy NearbySearch dengan algoritma sampling adaptif hemat kuota (hanya 2–5 titik per rute, dibatasi radius 500–5.000 m).
2. **OpenStreetMap Overpass API (Alternatif & Failover):** Jika Google Places API key tidak tersedia, kuota habis, atau mengalami kendala jaringan, sistem secara otomatis (*failover*) mengalihkan pencarian ke Overpass API tanpa crash.

### Konsekuensi
- **Positif:** Pengguna mendapatkan kualitas rekomendasi terbaik (dengan bintang rating Google), namun tetap memiliki ketahanan tinggi (*high availability*) berkat cadangan open-source gratis OSM.
- **Negatif / Mitigasi:** Struktur data kedua provider berbeda. Mitigasi: dibuat fungsi pemetaan normalisasi (`lib/types.ts` dan `lib/google-places.ts`) agar menghasilkan format objek `Place` yang seragam.

---

## ADR-003: Pola 1x API Usage & Instant Client-Side Filtering

### Status
**Accepted**

### Konteks & Masalah
Pengguna sering bereksplorasi dengan mengubah-ubah slider jarak toleransi (misal 1 km ke 2 km lalu ke 3 km) atau mengganti-ganti filter jenis tempat (Restoran, Kafe, Fast Food). Jika setiap perubahan kontrol memicu request baru ke `/api/recommendations`, kuota Google Places akan terkuras cepat dan menimbulkan biaya tinggi (*billing exhaustion*), serta membebani server OSM Overpass.

### Keputusan
Mengadopsi pola arsitektur **1x Fetch ke Server + Client-Side Instant Filtering**:
1. Saat pengguna menekan "Cari Tempat Makan", server mengambil data POI satu kali dengan cakupan koridor yang memadai dan `place_type: "all"`.
2. Hasil disimpan di memori browser pengguna (`allPlaces` di hook `useRecommendations.ts`).
3. Perubahan slider toleransi dan filter jenis tempat langsung dievaluasi di sisi browser secara sinkron.
4. Panggilan API server ulang hanya dilakukan jika pengguna sengaja mengklik *"Refresh Server"* atau mengubah rute perjalanan.

### Konsekuensi
- **Positif:**
  - Pemfilteran instan (latensi 0 ms) tanpa memunculkan loading spinner berulang.
  - Penghematan kuota API hingga 100% saat pengguna menyesuaikan preferensi toleransi dan kategori.
- **Negatif / Mitigasi:**
  - Jika pengguna menginginkan toleransi yang jauh lebih besar dari batas sampling awal (misal >5 km), data di memori mungkin belum mencakup area tersebut. Mitigasi: disediakan tombol eksplisit *"Refresh Server"*.

---

## ADR-004: Penentuan Lokasi Hybrid (Autocomplete Geocoding + Manual Map Click)

### Status
**Accepted**

### Konteks & Masalah
Database pencarian teks Nominatim tidak selalu mencakup nama gang kecil, warung, atau koordinat jalan tanpa nama di Indonesia. Jika pengguna hanya bergantung pada autocomplete teks, mereka tidak bisa menentukan rute dari titik yang tidak terindeks.

### Keputusan
Menyediakan mekanisme penentuan lokasi **Hybrid**:
1. **Pencarian Teks Autocomplete:** Input teks cepat untuk kota, jalan protokol, atau landmark terkenal.
2. **Pemilihan Titik Manual di Peta (📍 Pilih di Peta):** Tombol pada form yang mengaktifkan mode `crosshair` di peta. Pengguna cukup mengklik titik jalan mana saja untuk menaruh **Pin A (Awal)** atau **Pin B (Tujuan)** dengan koordinat presisi.

### Konsekuensi
- **Positif:** Fleksibilitas 100%, pengguna tidak pernah terhalang oleh database teks yang belum lengkap.
- **Negatif / Mitigasi:** Koordinat mentah tidak memiliki nama tempat yang mudah dibaca. Mitigasi: Sistem menampilkan label format `Titik Peta (lat, lng)` pada input form.

---

## ADR-005: Dukungan Rute Multi-Opsi (Rute Tol & Rute Non-Tol Bebas Tol)

### Status
**Accepted**

### Konteks & Masalah
Sering kali perjalanan antar dua kota di Indonesia memiliki beberapa opsi rute (misalnya rute lewat Tol Trans Jawa vs rute jalur Pantura/arteri). Algoritma `alternative_routes` bawaan OpenRouteService memiliki batas internal server di mana rute dengan jarak > 100 km otomatis melempar error HTTP 400 (code 2004), sehingga perjalanan jarak jauh seperti Jakarta–Bandung (160 km) sebelumnya gagal menghasilkan rute alternatif dan hanya menyisakan jalur jalan tol.

### Keputusan
Menerapkan arsitektur **Parallel Dual-Routing**:
1. Menjalankan dua panggilan ORS secara paralel (`Promise.allSettled`):
   - **Query 1 (Tol / Tercepat):** Rute standar (menggunakan `alternative_routes` jika jarak < 85 km).
   - **Query 2 (Non-Tol / Bebas Tol):** Rute dengan opsi `avoid_features: ["tollways"]`.
2. Hasilnya dikombinasikan dan diberi label informatif:
   - **`⚡ Rute 1 (Tol / Tercepat)`**
   - **`🌿 Rute Non-Tol (Jalur Arteri)`**
3. Di peta Leaflet, rute aktif digambar Cyan berpijar, sedangkan rute alternatif digambar garis putus-putus abu-abu yang interaktif (dapat diklik langsung untuk berpindah rute).

### Konsekuensi
- **Positif:**
  - Menjamin ketersediaan minimal 1 rute non-tol untuk perjalanan antar-kota panjang tanpa terbentur batas 100 km ORS.
  - Membuka akses ke ratusan tempat makan di jalan arteri tengah kota (seperti Bekasi, Karawang, dll.) yang tidak ada di dalam jalan tol.
- **Negatif / Mitigasi:** Mengonsumsi 2 panggilan kuota ORS per pencarian rute. Mitigasi: kuota harian ORS adalah 2.000 request/hari, sangat memadai untuk skala saat ini.

---

## ADR-006: Pengerasan Keamanan Produksi (Anti-XSS, Security Headers, Rate Limiting)

### Status
**Accepted**

### Konteks & Masalah
Sebelum aplikasi di-deploy ke lingkungan publik, terdapat beberapa potensi risiko:
1. Data OpenStreetMap adalah data publik crowdsourced yang dapat memuat string jahat untuk serangan Stored/DOM XSS pada Leaflet popup.
2. Tidak adanya rate limiter membuka celah bagi bot untuk melakukan spam DoS yang dapat membengkakkan biaya Google Places atau membuat IP server di-blacklist oleh Nominatim.
3. Ketiadaan HTTP security headers menyebabkan kerentanan terhadap clickjacking dan MIME sniffing.

### Keputusan
Menerapkan pengerasan keamanan berlapis (*defense-in-depth*):
1. **Anti-XSS:** Membuat helper `escapeHtml` di [components/MapView.tsx](file:///c:/Users/USER/Documents/Self%20Project/searah/components/MapView.tsx) untuk menyaring semua teks yang dimasukkan ke Leaflet `bindPopup()`.
2. **HTTP Security Headers:** Mengonfigurasi `CSP`, `HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, dan `Referrer-Policy` di [next.config.ts](file:///c:/Users/USER/Documents/Self%20Project/searah/next.config.ts).
3. **In-Memory Rate Limiting:** Mengimplementasikan modul sliding-window [lib/rate-limit.ts](file:///c:/Users/USER/Documents/Self%20Project/searah/lib/rate-limit.ts) pada seluruh endpoint API publik (`/api/geocode`: 45 req/menit, `/api/routes`: 30 req/menit, `/api/recommendations`: 20 req/menit per IP).
4. **Upstream Error Sanitization:** Menghilangkan pesan error mentah dari upstream API pada response JSON publik dan hanya mencatatnya di server log.

### Konsekuensi
- **Positif:** Aplikasi siap dideploy ke production dengan standar keamanan tinggi dan perlindungan biaya dari eksploitasi kuota API.
- **Negatif / Mitigasi:** In-memory rate limiting disimpan di memori proses serverless. Jika di-deploy multi-instance pada skala sangat tinggi, rate limit berlaku per instance container. Untuk tahap demo/portofolio saat ini hal ini sudah sangat memadai tanpa memerlukan dependensi Redis eksternal berbayar.
