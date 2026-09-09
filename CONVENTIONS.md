## Scope & Out of Scope

### In Scope (v1.1)

- Input lokasi awal & tujuan secara hybrid (pencarian autocomplete geocoding dan pemilihan manual langsung di peta).
- Pembentukan rute perjalanan multi-opsi (rute utama dan rute alternatif melalui OpenRouteService).
- Pengaturan toleransi penyimpangan jarak (slider 0.5 – 10 km).
- Pencarian tempat makan koridor rute dengan Dual Provider (Google Places berating & OpenStreetMap Overpass bebas kuota).
- Optimasi 1x API usage dengan instant client-side filtering di browser.
- Pemeringkatan rekomendasi otomatis berdasarkan kombinasi jarak ke rute, detour bolak-balik, dan rating.
- Visualisasi peta interaktif Leaflet (Pin A/B, multi-rute, marker tempat makan, dan sanitasi anti-XSS).
- Tampilan detail tempat lengkap beserta direct link navigasi ke Google Maps.
- Pengerasan keamanan produksi (HTTP security headers, in-memory rate limiting per-IP, error sanitization).

### Out of Scope (untuk versi ini)
- Autentikasi dan akun pengguna.
- Sistem review/rating buatan sendiri (menggunakan data yang tersedia dari OpenStreetMap apa adanya).
- Dukungan multi-moda transportasi (hanya satu mode perjalanan untuk MVP).
- Navigasi real-time, GPS tracking, dan turn-by-turn navigation.
- Chatbot AI berbasis natural language (direncanakan sebagai pengembangan v2).
- Penyimpanan data persisten/database (ditunda hingga benar-benar diperlukan, misal untuk caching atau riwayat chat).
- Dukungan multi-bahasa/lokalisasi.
- Aplikasi native mobile (hanya web responsif).