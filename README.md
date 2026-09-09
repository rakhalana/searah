# 🗺️ Searah — Temukan Tempat Makan di Sepanjang Rute

**Searah** adalah aplikasi web berbasis peta interaktif yang membantu Anda menemukan restoran, kafe, dan tempat makan terbaik yang **benar-benar searah** dengan rute perjalanan Anda, tanpa perlu menebak-nebak jarak penyimpangan (*detour*).

---

## ✨ Fitur Utama

- **📍 Fleksibilitas Penentuan Lokasi (Hybrid):**
  - Ketik nama tempat menggunakan autocomplete geocoding Nominatim.
  - Atau klik langsung di peta (**📍 Pilih di Peta**) untuk menentukan **Pin A (Awal)** dan **Pin B (Tujuan)** secara presisi.
- **🛣️ Pilihan Rute Alternatif:**
  - Menggunakan OpenRouteService (ORS) untuk menghitung rute perjalanan.
  - Menyediakan **Rute Utama (Tercepat)** dan opsi **Rute Alternatif** yang dapat diklik langsung di peta atau dipilih melalui kartu rute.
- **⭐ Dual Provider Data POI:**
  - **Google Places API:** Menampilkan tempat makan dengan rating bintang, jumlah ulasan pengguna, dan status operasional.
  - **OpenStreetMap (Overpass API):** Opsi open-source bebas kuota dengan multi-mirror failover.
- **⚡ 1x API Usage & Client-Side Instant Filtering:**
  - Data tempat makan diambil cukup **1 kali per rute**.
  - Menggeser slider toleransi jarak (km) atau memilih kategori (Restoran, Kafe, Fast Food, Semua) difilter **langsung di memori browser (0 ms latency, 0 request server tambahan)**.
- **📐 Algoritma Scoring & Detour:**
  - Menghitung jarak tegak lurus ke rute dan estimasi detour pergi-pulang menggunakan Turf.js.
  - Pemeringkatan otomatis berdasarkan skor terbaik dengan apresiasi rating Google.
- **🛡️ Keamanan Standar Produksi (Production Hardened):**
  - Perlindungan **Anti-XSS** pada Leaflet popup.
  - **HTTP Security Headers** lengkap (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
  - **In-Memory Rate Limiting** per IP untuk mencegah bot spam dan DoS.
  - Sanitasi pesan error upstream untuk mencegah kebocoran informasi (*information disclosure*).

---

## 🚀 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI & Library:** React 19, TypeScript
- **Styling:** Tailwind CSS (Dark Glassmorphism UI)
- **Peta Interaktif:** Leaflet.js & OpenStreetMap
- **Geospasial:** Turf.js (Buffer, Distance, Nearest Point on Line, Bbox)
- **Validasi Data:** Zod Schema Validation
- **Layanan Eksternal:**
  - Geocoding: OpenStreetMap Nominatim
  - Routing: OpenRouteService (Driving-car)
  - POI Data: Google Places API (Nearby Search) & Overpass API

---

## 🛠️ Cara Menjalankan Lokal

1. **Clone repository & Install dependencies:**
   ```bash
   git clone https://github.com/your-username/searah.git
   cd searah
   npm install
   ```

2. **Konfigurasi Environment Variables:**
   Salin `.env.local.example` menjadi `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
   Isi API key yang dibutuhkan:
   ```env
   OPENROUTESERVICE_API_KEY=your_ors_api_key_here
   NOMINATIM_USER_AGENT=searah-route-food-finder/1.0
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

3. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

4. **Build untuk Produksi:**
   ```bash
   npm run build
   npm run start
   ```

---

## 📚 Dokumentasi Terkait

- [PRD.md](file:///c:/Users/USER/Documents/Self%20Project/searah/PRD.md) — Product Requirements Document (v1.1)
- [ARCHITECTURE.md](file:///c:/Users/USER/Documents/Self%20Project/searah/ARCHITECTURE.md) — Arsitektur Sistem Lengkap
- [ADR.md](file:///c:/Users/USER/Documents/Self%20Project/searah/ADR.md) — Architecture Decision Records
- [CONVENTIONS.md](file:///c:/Users/USER/Documents/Self%20Project/searah/CONVENTIONS.md) — Aturan Scope & Konvensi Kode
- [TASKS.md](file:///c:/Users/USER/Documents/Self%20Project/searah/TASKS.md) — Riwayat Tugas & Milestone
