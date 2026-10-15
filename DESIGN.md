# DESIGN DIRECTION: Live SPBU Bali
Dokumen Arah Desain & Identitas Visual Proyek

---

## 1. Identitas & Kepribadian (Identity & Personality)
- **Karakter Utama**: Utilitas darurat cepat, to-the-point, dan asisten informasi BBM yang bersahabat bagi pengendara di Denpasar & Badung.
- **Fokus Pengguna**: Pengendara motor dan mobil yang membutuhkan kejelasan informasi dalam hitungan detik saat berada di jalan raya. Tampilan terang, bersih, dan kontras tajam.

---

## 2. Palet Warna & Tema Visual (Monochrome Light Theme)
- **Konsep**: Clean Monochrome Light. Bersih, terang, tajam, dengan keterbacaan maksimal di bawah sinar matahari maupun malam hari.
- **Primary Base / Background**: Putih bersih (`#FFFFFF` / `bg-white`) dan off-white zinc (`#f4f4f5` / `bg-zinc-100`, `#fafafa` / `bg-zinc-50`).
- **Contrast / Text & Accents**: Hitam murni (`#000000` / `#09090b`) untuk teks judul, tombol primer, logo, dan batas kontainer kontras tinggi.
- **Borders & Dividers**: Zinc neutral (`#e4e4e7` / `border-zinc-200`, `#d4d4d8` / `border-zinc-300`).
- **Functional Accent (Status Only)**: 
  - Hijau: Kondisi lancar.
  - Kuning/Amber: Kondisi antrean sedang/ramai.
  - Merah: Kondisi macet/antrean panjang & kamera CCTV live.
  - Abu-abu/Muted: Stok habis atau SPBU tutup.
  *(Aksen warna hanya digunakan untuk merepresentasikan data riil, bukan dekorasi acak).*

---

## 3. Tipografi (Typography)
- **Font Utama**: **Plus Jakarta Sans** (Google Fonts / next/font).
- **Karakter**: Geometris modern, bersih, dengan legibilitas sangat tinggi di layar ponsel.
- **Bobot**: 
  - Regular (400) untuk deskripsi dan detail alamat.
  - Medium (500) untuk label, tombol, dan navigasi.
  - Bold (700) untuk penamaan SPBU, status antrean, dan angka estimasi waktu.

---

## 4. Gaya Bahasa & Tone Tulisan (Copywriting)
- **Gaya Bahasa**: Lugas, informatif bahasa Indonesia standar, dengan nada komunikatif yang ramah dan bersahabat khas warga lokal Bali.
- **Prinsip Copy**:
  - Tanpa tanda hubung em dash (`—`). Gunakan koma, titik, atau tanda kurung.
  - Bebas dari buzzword AI (tanpa "Revolusioner", "Didukung AI", "Seamless", dsb.).
  - Tombol aksi jelas dan kontekstual: "Cek CCTV", "Laporkan Antrean", "Buka di Peta", "Data Akurat".

---

## 5. Dials (Tingkat Liveliness & Responsivitas)
- **Dial**: `ENERGY 2 / RHYTHM 2 / MOTION 1`
  - **ENERGY: 2 (Balanced)** — Fungsional, tajam, modern dengan fokus kontras hitam-putih yang kuat.
  - **RHYTHM: 2 (Balanced)** — Grid teratur rapi dengan kartu sorotan khusus (SPBU terpilih memiliki penekanan bingkai hitam tegas).
  - **MOTION: 1 (Subtle)** — Transisi instan dan efisien (hover states, modal reveal cepat). Menghindari animasi berat.

---

## 6. Standar Aksesibilitas & Responsivitas
- Memenuhi standar WCAG AA (rasio kontras teks hitam di atas background putih > 12:1).
- Target sentuh tombol (tap target) di smartphone minimal 44x44 piksel.
- Tidak ada overflow horizontal pada resolusi layar mobile mana pun (320px+).
