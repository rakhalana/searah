1. Design Concept

"Rambu jalan, bukan dashboard SaaS."

Setiap elemen visual diperlakukan seolah bagian dari perjalanan itu sendiri — plat rambu, papan jarak, penanda titik — bukan kartu-kartu analytics generik. Sebelum menambah elemen visual apa pun, uji dengan pertanyaan: "apakah ini masuk akal ada di rambu/papan jalan sungguhan?" Kalau tidak, kemungkinan itu dekorasi yang bisa dipangkas.

Ini juga alasan kenapa produk ini pantas punya identitas berbeda dari template dashboard pada umumnya: subjeknya adalah jalan raya dan kuliner Indonesia, bukan data finansial atau produktivitas.

2. Visual Direction
Dark base yang bertujuan, bukan dark mode default SaaS — gelap di sini masuk akal karena konteks pemakaian nyata (dipakai sambil di jalan, sering malam hari), bukan sekadar tren.
Dua accent bermakna tetap, bukan gradient dekoratif: hijau = perjalanan/aksi, cokelat = kuliner/tujuan. Warna tidak pernah dipakai "karena bagus", selalu terikat makna tertentu.
Garis tipis sebagai pemisah, bukan shadow lembut seragam di semua elemen.
Angka sebagai elemen utama (jarak, waktu, jumlah tempat) ditampilkan besar dan tegas — bukan disembunyikan di dalam kartu kecil berlabel ALL-CAPS.
3. Color Palette
Token	Hex	Peran
--bg-app	
#121417	Background utama & peta
--bg-panel	
#1A1D20	Permukaan sidebar
--bg-panel-raised	
#202327	Elemen interaktif di atas panel (input, dsb)
--line	
#2B2E32	Divider/border, pengganti shadow
--text-primary	
#ECEEF0	Teks utama
--text-muted	
#90969C	Teks sekunder/meta
--text-faint	
#5D6167	Teks tersier (pemisah, watermark kecil)
--accent-route	
#2F8F5B	Aksi utama, rute, state "dipilih"
--accent-food	
#C9762E	Rank badge & marker tempat kuliner
--accent-error	
#B4482F	Pesan gagal/error — dipakai sesempit mungkin

Aturan: maksimal dua accent non-netral aktif dalam satu layar. Kalau butuh warna ketiga (misal status error), itu hanya boleh muncul saat kondisi tersebut benar-benar terjadi, tidak permanen di UI.

4. Typography
Peran	Font	Ukuran	Weight
Wordmark / judul	Overpass	19px	800
Angka besar (jarak, waktu, jumlah)	Overpass	26–28px	800
Body / input / nama tempat	Inter	13.5px	400–600
Meta / caption (jarak dari rute, jenis)	Inter	12px	500
Overpass dipilih bukan kebetulan: font ini memang dirancang terinspirasi tipografi rambu jalan raya — cocok secara literal dengan konsep produk.
Line-height: 1.4 untuk teks body, 1.1 untuk angka besar.
Tidak ada penekanan satu kata dengan warna/italic dalam judul — hierarki cukup dari ukuran & weight.
5. Spacing

Skala dasar 4px: 4 · 8 · 12 · 16 · 20 · 24 · 32. Semua padding/margin/gap mengambil dari skala ini — hindari nilai bebas seperti 13px atau 27px yang bikin ritme visual tidak konsisten.

Padding luar panel/section: 20px
Jarak antar elemen dalam satu grup (misal dua input lokasi): 10px
Jarak antar section (dipisah garis tipis): 20px vertikal
6. Border Radius
Radius	Dipakai untuk
6px	Input, tombol, plate, tag/badge teks
8px	Brand mark (satu-satunya elemen ikonik yang boleh menonjol)
999px (full)	Elemen yang memang berbentuk bulat: dot origin/destination, rank badge, marker peta

Hindari radius besar (16–24px) di elemen kotak/kartu besar — itu ciri paling gampang dikenali dari "SaaS-card kit" generik.

7. Shadows / Blur

Default: tidak pakai shadow. Hierarki permukaan cukup dibedakan lewat garis tipis (1px solid var(--line)) dan sedikit perbedaan warna latar (--bg-panel vs --bg-panel-raised).

Shadow/blur hanya untuk elemen yang benar-benar melayang di atas konten lain:

Legenda di atas peta → background: rgba(26,29,32,0.85) + backdrop-filter: blur(6px), bukan shadow gelap tebal.
Popover/menu sesaat (kalau ada) → shadow tipis, hilang begitu ditutup.

Alasan praktis, bukan cuma estetika: peta sudah berat untuk di-render, jadi shadow/blur permanen di banyak elemen sidebar cuma menambah beban tanpa manfaat.

8. Components
Komponen	Aturan desain
Input lokasi	Hairline border, dot hijau solid (awal) / dot cincin hijau (tujuan), tanpa label ALL-CAPS di atasnya
Tombol utama	Solid hijau, satu state hover (sedikit lebih gelap), tanpa ikon kecuali makin jelas jika ada (misal panah → boleh, ikon buku/tag tidak)
Pilihan rute (fitur baru di screenshot)	List vertikal per opsi (bukan dua kartu kotak berwarna): radio dot kecil + nama rute + jarak · waktu. Opsi terpilih ditandai garis aksen hijau di sisi kiri, bukan background block penuh
tulis "Rute 1", "Rute 2" dst
Plat jarak & waktu	Satu plat lebar, angka besar Overpass, dipisah middot — sah dipakai di sini karena dua data yang memang berkaitan langsung
Slider toleransi	Track tipis, thumb bulat solid hijau, tanpa gradient track
Filter jenis tempat	Teks saja + underline aktif, tanpa ikon (lihat bagian Iconography)
List rekomendasi	Rank badge bulat cokelat bernomor, hairline divider antar baris, tanpa shadow per item
Marker peta	Titik hijau (awal/tujuan), lingkaran cokelat bernomor (tempat makan) — sistem yang sama dengan rank badge di list
Sumber data	Jadikan satu baris toggle kecil di pengaturan lanjutan (collapsible), bukan dua kartu besar dengan ikon bintang/globe di halaman utama
9. Interaction Principles
Satu sinyal visual per state — state aktif ditandai garis aksen kiri atau underline, bukan kombinasi warna+border+shadow+ikon berubah bersamaan.
Aksi berat (cari rute, cari tempat makan) selalu memberi feedback instan lewat perubahan teks tombol, bukan tombol diam tanpa respons.
Memilih tempat di list memicu highlight marker terkait di peta (dan sebaliknya) — satu momen interaksi yang jelas, bukan efek tersebar di semua elemen.
10. Animation / Transition
Durasi pendek: 120–180ms, easing ease-out, untuk hover/focus/pemilihan.
Satu reveal sederhana saat hasil rekomendasi pertama kali muncul (fade + sedikit naik), bukan animasi berulang di setiap render/scroll.
Marker peta: transisi scale halus (150ms) saat dipilih, tanpa bounce/spring.
Hormati prefers-reduced-motion: matikan semua transisi dekoratif (fade, scale), sisakan transisi yang murni fungsional (misal slider).
11. Responsive Behavior
Desktop (>1024px): sidebar tetap 360–380px di kiri, peta mengisi sisa ruang.
Mobile/tablet (<780px): sidebar berubah jadi bottom sheet yang bisa di-collapse/expand, peta mengambil ruang penuh di atas — bukan sidebar dipaksa muat sempit.
Target sentuh minimum 40×40px untuk semua tombol/list-item yang bisa diklik di mobile.
12. Accessibility
Kontras teks-background minimal 4.5:1 untuk teks body, 3:1 untuk teks besar (>24px) — palet di atas sudah diarahkan ke rasio ini.
Semua elemen interaktif punya focus state yang terlihat (garis aksen/outline), tidak ada outline: none tanpa pengganti.
Status tidak pernah ditandai hanya lewat warna (misal rute terpilih = garis aksen + teks tebal, bukan warna saja) — penting untuk pengguna buta warna.
Urutan tab logis: input lokasi → tombol cari → pengaturan → hasil, peta bukan fokus pertama.
Ikon fungsional tanpa teks pendamping (misal tombol zoom peta) tetap punya aria-label.
13. Empty / Loading / Error State
State	Perlakuan
Loading	Teks tombol berubah sementara ("Mencari rute…") + skeleton tipis di posisi hasil yang akan muncul — bukan spinner besar yang memblokir seluruh layar
Empty (0 hasil dalam toleransi)	Pesan yang mengarahkan aksi, misal "Belum ada tempat makan dalam radius 1 km. Coba perbesar toleransi deviasi." — disertai jalan keluar konkret, bukan sekadar "Tidak ada hasil"
Error (gagal ambil data/rute)	Pesan singkat + actionable dengan warna --accent-error, misal "Gagal memuat rute. Coba lagi." + tombol "Coba lagi" — tidak menampilkan detail teknis (kode HTTP, stack trace) ke pengguna
14. Iconography — Menghindari Kesan Ikon Generik

Ini akar dari kesan "AI slop" di versi sebelumnya: ikon bintang, globe, petir, garpu-sendok, kaca pembesar, tag — semuanya diambil dari gaya berbeda-beda (emoji, icon-pack solid, outline campur), ditempel di hampir setiap label/tombol tanpa sistem yang menyatukan.

Cara memperbaikinya:

Kurangi drastis jumlah ikon. Sebelum menambahkan ikon, tanya: "apakah teks saja sudah cukup jelas?" Untuk filter jenis tempat (Semua/Restoran/Kafe/Fast Food), teks saja sudah cukup — ikon di situ cuma menambah noise, bukan mempercepat pemahaman.
Bangun dari satu kosakata bentuk, bukan ambil dari icon pack/emoji campuran. Untuk aplikasi ini, cukup 3 bentuk dasar: titik (origin, rank, marker), cincin (destination), garis (rute, divider, connector). Hampir semua kebutuhan "ikon" bisa diselesaikan dari tiga bentuk ini — inilah yang membuatnya terasa dirancang, bukan ditempel.
Kalau memang perlu ikon fungsional (zoom peta, compass), gambar sendiri sebagai SVG garis tunggal (stroke 1.5–2px, grid ukuran tetap 16/20/24px) — konsistensi stroke inilah yang bikin ikon terasa satu keluarga, bukan campur gaya seperti sebelumnya.
Metadata pakai teks, bukan ikon+teks. 
Simpan "kebolehan mencolok" untuk satu tempat saja — brand mark aplikasi. Jangan diulang gayanya di tiap tombol/label lain. Spend your boldness in one place.