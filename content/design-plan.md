# Spesifikasi Desain — Deck Kewarganegaraan

Gaya terpilih: **B — Berkas Negara** (kertas tulang + tinta + vermilion).
Target rasa: keren, berkelas, bikin satu kelas merasa wow.

---

## 1. Bahasa visual

### Palet — tiga warna, tidak lebih
| Nama | Hex | Peran |
|---|---|---|
| Kertas | `#F2EDE3` | Latar seluruh deck |
| Tinta | `#15130F` | Teks, bar redaksi, garis aturan |
| Vermilion | `#C33B22` | **Satu-satunya aksen** |

**Aturan disiplin:** vermilion maksimal muncul di SATU hal per slide —
satu angka, satu garis, atau satu stempel. Karena cuma satu, mata penonton
selalu tahu harus lihat ke mana. Ini yang bikin kesan mahal, bukan jumlah efek.

Turunan: `--paper-2 #E6DDCE`, `--muted #8B8175`, `--rule rgba(21,19,15,.15)`.

### Tipografi — tiga peran
| Font | Peran | Sumber |
|---|---|---|
| **Bodoni Moda** (400/700/900 + italic) | Judul & angka besar | Google Fonts |
| **Manrope** (400/500/600) | Isi, paragraf, label | Google Fonts |
| **Space Mono** (400/700) | Label teknis, nomor lembar, kode | Google Fonts |

**Wajib self-host** (woff2 di `assets/fonts/`) — jangan andalkan CDN.
Kalau wifi kampus mati, deck harus tetap tampil sempurna.

### Motif berulang
1. **Bar redaksi** — metafora inti deck. Korupsi = informasi ditutup.
   **Diperbarui 15 Sep 2026:** sekarang hanya muncul di **slide 22** (penutup).
   Panel kanan slide 01 dulu memakai 5 bar kosong dengan kode berkas karangan
   "Laporan Anggaran / RA-2025" — Arya menilai itu terbaca sebagai "kosong
   hitam" dan meminta isi nyata. Panel itu kini berisi **daftar sumber**
   (`Sumber & rujukan / SD-2026`), yang tidak membocorkan angka headline
   slide 22. Konsekuensinya: bar redaksi tidak lagi diperkenalkan sejak
   slide 01, jadi momen pembuka "ada informasi yang ditutup" hilang.
   Kalau mau dikembalikan, opsinya: bar di slide 01 yang membuka ke daftar
   sumber, bukan ke angka.
2. **Guilloche** — pola pengaman uang kertas. Beda nilai `k` per babak,
   jadi penonton tahu sedang di babak mana tanpa perlu diberi tahu.
3. **Garis aturan** — pembatas tipis, bukan kotak. Hindari card bertumpuk.

---

## 2. Empat momen puncak

| Slide | Momen | Teknik |
|---|---|---|
| **06** | Rasio pajak Indonesia vs ASEAN | 9 bar bertumbuh dari nol, garis rata-rata kawasan melintas di atas |
| **16** | CPI berhenti di 34 | Grafik 3 titik menggambar sendiri: 34 → 37 → 34, target 45 mengambang tak tersentuh |
| **18** | Rantai sebab-akibat | 5 simpul + garis yang menggambar diri saat scroll, partikel berjalan di sepanjangnya |
| **21** | Metrik & jurang | Bar hitam = hari ini, blok bergaris vermilion = selisihnya, garis merah = target |
| **22** | Penutup | 5 bar redaksi tumbuh menutupi, lalu menyapu terbuka — fakta di bawahnya terbaca |

---

## 3. Struktur 22 slide (yang benar-benar dibangun)

**BABAK I — Pembuka (4)**
01 Judul · 02 Identitas kelompok · 03 Peta paparan · 04 Video pendapatan negara

**BABAK II — Kesadaran pajak (7)**
05 Pajak kontributor utama · **06 Rasio pajak** · 07 Ke mana uang pajak pergi ·
08 Definisi pajak · 09 Faktor internal & eksternal · 10 Tiga pilar · 11 Fondasi sistem

**BABAK III — Anti korupsi (5)**
12 Video anti korupsi · 13 Hakikat pendidikan · 14 Tujuan · 15 Dampak ke generasi muda ·
**16 CPI**

**BABAK IV — Sintesis & aksi (6)**
17 Dua sisi satu koin · **18 Rantai sebab-akibat** · 19 Peran mahasiswa & dosen ·
20 Tiga program · **21 Metrik & jurang** · **22 Kesimpulan**

Perubahan dari 19 slide asli: ditambah slide 03 (peta paparan) dan slide 06
(rasio pajak kawasan); slide KPI dipecah jadi 20 (program) dan 21 (metrik +
jurang), lalu ditutup slide 22. Urutan asli dipertahankan supaya tidak perlu
menghafal ulang.

---

## 4. Keputusan teknis

- **Satu file** `index.html`, CSS & JS inline. Tanpa build tool, tanpa npm.
- **WebGL** untuk atmosfer kertas + noda tinta (shader fbm), satu canvas
  persisten di belakang semua slide. Plus momen WebGL/SVG per slide.
- **Font self-host** di `assets/fonts/`.
- **Navigasi:** panah, spasi, PageUp/Down, scroll, swipe, klik titik navigasi.
  Progress bar bergaya penggaris berkas. Nomor slide ditulis "Lembar 07 / 21".
- **Mode presenter** (`P`): catatan pembicara + timer.
- **Mode edit** (`E`): klik teks langsung di browser, auto-save localStorage,
  tombol export HTML. Nol server, nol database.
- **Print stylesheet**: satu klik jadi PDF handout kalau dosen minta.
- **Reduced motion** dihormati.
- **Tanpa dependensi eksternal** selain embed YouTube di 2 slide.

### Video — embed, bukan link
Dipakai pola **facade**: thumbnail + tombol play, iframe YouTube baru dimuat
setelah diklik. Alasannya: kalau wifi kampus mati, slide tetap tampil rapi
(tidak ada kotak error iframe). Pakai `youtube-nocookie.com`.
QR code disediakan supaya penonton bisa membuka sendiri di HP.

---

## 5. Video — sudah beres, terverifikasi

### Temuan awal (masih berlaku sebagai catatan)
Video `youtu.be/_YsXw4wKZKU` dicek lewat YouTube oEmbed:

> **Judul:** "Pribadi Jujur. Antikorupsi"
> **Kanal:** Cerdas Berkarakter Kemendikdasmen RI (kanal resmi pemerintah)

Artinya video itu **benar** untuk slide 12 (Anti Korupsi) dan **salah tempat**
di slide 04 (Pendapatan Negara). Bukan sekadar "URL-nya sama" — memang salah tempel.

### Video pengganti slide 04 — SUDAH DIPASANG

> **Judul:** "Indonesia Tanpa Pajak?"
> **Kanal:** Kanwil DJP Jawa Tengah I (kanal resmi Direktorat Jenderal Pajak)
> **Durasi:** 1:46 · **ID:** `proAhdTWOH4`

Animasi garis hitam-putih dua panel: **layar kiri = kondisi dengan pajak**
(jalan & jembatan mulus), **layar kanan = tanpa pajak** (jalan rusak, orang
tenggelam). Argumennya terbaca dalam 5 detik tanpa perlu audio — penting untuk
ruang kelas. Durasi 1:46 juga pas untuk presentasi kelompok.

**Cara memilih:** kandidat disaring lewat pencarian YouTube terprogram, lalu
diuji dua sinyal: oEmbed (HTTP 401 = embed dimatikan pemilik) dan
`playableInEmbed` dari `ytInitialPlayerResponse`. Semua kandidat di bawah ini
lolos uji, jadi tinggal soal selera:

| ID | Judul | Kanal | Durasi | Catatan |
|---|---|---|---|---|
| `proAhdTWOH4` | Indonesia Tanpa Pajak? | Kanwil DJP Jateng I | 1:46 | **DIPAKAI** — paling jelas, paling pendek |
| `rTz_jTxitwA` | [FILM PENDEK] Kenapa Ada Pajak? | Kementerian Keuangan RI | 6:22 | film pendek sinematik, otoritas tertinggi |
| `Y2SvKeY1Gfw` | Joni & Kawan Pajak EPS 4 — Tanpa Pajak Negara Bisa Apa? | DDTC Indonesia | 1:44 | animasi 2D rapi |
| `7Fv5eLLDkDU` | Joni & Kawan Pajak EPS 15 — Pajak, Tulang Punggung Bangsa | DDTC Indonesia | 2:15 | judulnya persis judul slide 05 |
| `3pDtl4aN0wo` | [INKLUSI PAJAK] Jingle Pajak Versi Kartun | Direktorat Jenderal Pajak | 1:24 | jingle, cocok buat ice-breaker |

Ganti video cukup ubah **satu atribut** `data-yt` di slide 04 (plus `src`
thumbnail dan QR-nya).

### QR code — sekarang lokal, bukan layanan luar
Dulu QR diambil runtime dari `api.qrserver.com`. Sekarang PNG-nya sudah
diunduh dan disimpan di `assets/qr/slide04.png` & `slide12.png`, jadi **tidak
butuh internet** untuk menampilkan QR-nya. Slide 04 juga sudah dapat QR
(sebelumnya cuma slide 12), biar dua slide video perlakuannya sama.


---

## 6. Data yang dipakai (terverifikasi 15 Sep 2026)

Lihat `content/verified-data.md` untuk tabel lengkap + sumber.

Ringkas:
- Pendapatan negara 2025: **Rp 2.765,13 T** · penerimaan pajak **Rp 1.917,6 T**
  (87,6% dari target → shortfall)
- Rasio pajak Indonesia 2024: **11,8%** — terendah ketiga dari 38 ekonomi
  Asia-Pasifik (rata-rata kawasan 19,7%, OECD 34,1%)
- CPI: 2023 = 34, 2024 = 37, **2025 = 34**, peringkat turun 99 → 109
- Pertumbuhan ekonomi 2025: 5,11% · inflasi 2,92%

KPI: **target dipertahankan** (CPI 45, kepatuhan 85%, kepercayaan publik 75%),
tapi jurang antara kondisi nyata dan target **ditampilkan terbuka** sebagai
bagian argumen.
