# Worklog — PPT Kewarganegaraan (Web-based Deck)

## Konteks

Arya punya PPT konvensional untuk mata kuliah **Kewarganegaraan (PDB)**,
tapi tidak suka desainnya. Ingin deck berbasis **website** dengan teknologi
web modern: WebGL, animasi, SVG — kualitas desain maksimal.

- **Materi sumber:** `C:\Users\Arya Rizky\Downloads\Telegram Desktop\PPT PDB KEWARGANEGARAAN.pdf`
  (19 slide, 960x540)
- **Topik:** Kesadaran Pajak dan Pendidikan Anti Korupsi
- **Dosen:** Ratna Damayanti, M.Kes., Drh — Kelompok 6, PDB 93
- **Anggota** (nama lengkap + NIM, dari screenshot referensi Arya —
  PDF asli hanya memuat nama singkat tanpa NIM):
  1. Muhammad Adyan Faqih Huddin — 626103051312
  2. Salma Nur Khasanah — 626107097032
  3. Akbar Arya Maulana — 626107097035
  4. Arya Rizky Ardhi Pratama — 626103051310
  5. Dinda Naura Firdausy — 626115327032
  6. Izzatul Hayati — 626113145087

## Keputusan yang sudah diambil

| Pertanyaan | Jawaban Arya |
|---|---|
| Vibe | **Editorial & Berkelas** + **Wibawa & Institusional** |
| Level teknologi | **Maksimal** — WebGL shader, partikel, SVG, scroll-driven |
| Edit teks di browser | Perlu (localStorage, tanpa server/database) |

## Struktur proyek

```
D:\Projects\PPT_KWN\
  index.html          # ★ DELIVERABLE — deck 22 slide, satu file, CSS+JS inline
  PUTAR-DECK.bat      # ★ jalankan ini (bukan klik dua kali index.html)
  assets\fonts\       # 9 woff2 self-host + fonts.css (aman offline)
  assets\qr\          # QR slide 04 & 12, PNG lokal (tidak gantung internet)
  previews\           # 3 preview arah desain (title slide)
    style-a.html      # Buku Kas Negara — dark ledger + emas
    style-b.html      # Berkas Negara — kertas tulang + vermilion  ← TERPILIH
    style-c.html      # Transparansi — slate dingin + ice cyan
  content\
    design-plan.md    # spesifikasi desain lengkap
    verified-data.md  # data fiskal 2025 + sumber
  tools\
    verify-deck.py    # verifikasi 22 slide: overflow + error konsol + screenshot
    anim-shot.py      # tangkap fase animasi (untuk cek animasi waktu)
    verify.py         # verifikasi preview
    fetch-fonts.py    # unduh font Google -> woff2 lokal
    smoke.py          # cek gambar rusak + error konsol
    yt-search.py      # cari video YouTube terprogram (scrape ytInitialData)
    yt-check.py       # uji kelayakan embed (oEmbed + playableInEmbed)
    yt-frame.py       # lihat bingkai video asli lewat host page lokal
    yt-file-test.py   # uji embed dari file:// vs http:// (lihat §Video)
    video-test.py     # uji facade video di deck
    alpha-proof.py    # uji perilaku canvas saat konteks WebGL hilang
  shots\              # DI-GITIGNORE (73 MB, hasil verifikasi)
  worklog.md
```

## Status: SELESAI & TERVERIFIKASI (15 Sep 2026)

**`index.html` — 22 slide. Hasil verifikasi terakhir:**

```
FONT   : 7 keluarga loaded (Bodoni Moda 400/700/900, Manrope 400/600, Space Mono 400/700)
WEBGL  : aktif
SLIDE  : 22 | jalur guilloche: 12
ERROR KONSOL: tidak ada
HASIL: BERSIH — tidak ada overflow, tidak ada elemen bocor
```

### Keputusan Arya yang sudah dieksekusi
| Pertanyaan | Jawaban |
|---|---|
| Vibe | **Editorial & Berkelas** + **Wibawa & Institusional** |
| Level teknologi | **Maksimal** — WebGL shader, SVG, scroll-driven |
| Gaya | **B — Berkas Negara** |
| Edit teks di browser | Perlu (localStorage, tanpa server/database) |
| Video | **Embed YouTube (facade), bukan link**. Sementara URL sama dulu |
| KPI | Target dipertahankan, **jurang kondisi-nyata vs target ditampilkan terbuka** |

### Yang berubah dari draf 19 slide → 22 slide
- Slide **03** ditambah: peta paparan (4 babak)
- Slide **06** ditambah: rasio pajak Indonesia vs 9 ekonomi Asia-Pasifik
- Slide **17** dipecah: 17 (dua sisi satu koin) + 21 (metrik & jurang)

### Temuan video — sudah diverifikasi lewat YouTube oEmbed
`youtu.be/_YsXw4wKZKU` = **"Pribadi Jujur. Antikorupsi"**, kanal
Cerdas Berkarakter Kemendikdasmen RI (kanal resmi pemerintah).

Jadi video itu benar untuk slide anti korupsi, dan **salah tempat** di slide
pendapatan negara. Bukan cuma "URL-nya kebetulan sama" — memang salah tempel.
**Sudah ditukar** jadi "Indonesia Tanpa Pajak?" (Kanwil DJP Jawa Tengah I,
1:46, `proAhdTWOH4`) — animasi dua panel: kiri dengan pajak, kanan tanpa pajak.

### Data yang diperbarui (dari 2020 → 2025)
- Pendapatan negara 2025 Rp 2.765,13 T; penerimaan pajak Rp 1.917,6 T (87,6% target)
- Rasio pajak Indonesia 11,8% PDB — terendah ke-3 dari 38 ekonomi Asia-Pasifik
- CPI 2023 = 34, 2024 = 37, 2025 = **34** (peringkat turun 99 → 109)
- Definisi pajak slide 08 ditambah **UU No. 6/1983 KUP Pasal 1 angka 1** (hukum positif),
  bukan cuma doktrin Adriani & Soemitro


Tiga preview sudah dibuat & diverifikasi (0 error, 0 overflow @1600x900).

### A — Buku Kas Negara (dark)
Buku besar keuangan negara. Garis aturan emas mengalir di WebGL (flow field
fbm), tipografi Fraunces 900, kartu data dengan counter animasi.
Kesan: wibawa fiskal, premium, serius.

### B — Berkas Negara (light)
Dokumen resmi / arsip hukum. Kertas tulang + tinta hampir hitam + vermilion.
Bodoni Moda untuk judul, guilloche rosette (5 lapis kurva `r = R0 + A·cos(kθ)`)
seperti pola pengaman uang kertas, bar redaksi yang menyensor teks sebagai
metafora korupsi = informasi yang ditutup.
Kesan: editorial kuat, institusional, paling "dokumen".

### C — Transparansi (dark, dingin)
Cahaya menembus kaca. WebGL berkas cahaya sempit + caustics.
Clash Display + Satoshi, panel metrik dengan bar progresif (data slide 17).
Kesan: presisi, modern, paling kuat untuk slide data & KPI.

## Catatan teknis (penting untuk build final)

- WebGL pakai **WebGL2 + fullscreen triangle** (`gl_VertexID`), tanpa VBO,
  tanpa library. Zero dependency. Wajib `gl.bindVertexArray(gl.createVertexArray())`.
- `preserveDrawingBuffer` default false → `gl.readPixels` setelah frame
  selalu balikin 0. Jangan pakai itu buat tes; pakai screenshot.
- Lebar berkas cahaya: `smoothstep(0.17, 0, abs(fract(x)-0.5))` = 34% lebar
  layar per berkas → seluruh layar ketutup jadi "awan". Pakai ≤0.035.
- Kurva Lissajous `x=A·sin(7t), y=A·sin(5t)` **bukan** rosette — hasilnya
  jaring kotak kusut. Untuk guilloche pakai `r(θ) = R0 + A·cos(k·θ)`.
- Jangan pakai `-clamp()` / `-min()`; pakai `calc(-1 * clamp(...))`.
- **`scroll-behavior:smooth` + `scroll-snap-type:y mandatory` bikin scroll
  programatik nggak jalan** → slide tampil kosong karena `.in` nggak pernah
  nempel. Solusi: tiga lapis (IntersectionObserver + scrollend/debounced scroll
  + watchdog `setInterval` 400 ms) yang semuanya manggil `ensureActive()`.
  Kalau nanti ubah arsitektur scroll, **jangan hapus watchdog-nya**.
- **Screenshot Playwright bisa "telat"**: `page.screenshot()` di headless
  swiftshader butuh ~1 detik, jadi animasi sudah lewat saat gambar diambil.
  Kalau mau menilai sebuah fase animasi, **ukur lewat DOM** (`getComputedStyle`
  / `getBoundingClientRect` dalam loop), jangan cuma andalkan screenshot.
- **`element.screenshot()` memicu scroll-into-view** yang bisa menggeser deck
  dan me-restart animasi. Untuk deck berbasis scroll-snap, pakai
  `page.screenshot(clip=...)`, bukan element screenshot.
- Font di-self-host (woff2 lokal) supaya aman offline.
- WebGL: DPR dibatasi 1.5, loop turun ke ~30 fps saat diam, berhenti saat tab
  disembunyikan, dan hanya menggambar satu bingkai statis kalau
  `prefers-reduced-motion`.

## Temuan pada materi sumber (sudah ditangani)

1. ~~Slide 3 dan 10 pakai URL YouTube sama~~ → **terkonfirmasi salah tempel.**
   Slide 04 masih menunggu video pengganti.
2. ~~Slide 4 pakai data 2020~~ → **sudah diganti data 2025.**
3. Slide 17 KPI baseline 2023 / target 2028 — masih relevan, dipertahankan.

## Cara menjalankan

**Paling gampang:** klik dua kali `PUTAR-DECK.bat` di root proyek.
Dia cari Python (`py -3`, lalu `python`), jalankan server di
`http://127.0.0.1:8788/index.html`, dan buka browsernya. Tutup jendelanya
untuk berhenti.

Manual: `python -m http.server 8788 --bind 127.0.0.1` dari root proyek.

### PENTING — deck harus lewat HTTP, bukan klik dua kali
Diuji langsung, hasilnya beda:

| Cara buka | Video YouTube |
|---|---|
| `file://` (klik dua kali `index.html`) | **Error 153 — tidak bisa diputar** |
| `http://127.0.0.1:8788/` (server) | **jalan normal** |

Sebabnya: dari `file://` origin-nya `null`, pemutar YouTube menolak embed tanpa
referrer yang sah. Isi deck lainnya (font, WebGL, animasi, QR) tetap tampil
sempurna walau lewat `file://` — **hanya videonya** yang kena.

Kalau dibuka lewat `file://`, facade video otomatis mendeteksinya: tombol play
jadi vermilion, ada strip peringatan di atas thumbnail, dan klik membuka
YouTube di tab baru. Jadi tidak pernah muncul player rusak di depan kelas.

**Kalau nanti di-deploy ke Vercel (https), masalah ini hilang sendiri.**

### Deploy ke Vercel (belum dilakukan)
Deck ini static murni — `index.html` + `assets/`. Nggak butuh build, nggak
butuh konfigurasi. Cukup `npx vercel --prod` dari root proyek.

---

## CATATAN: ekspor PDF — SETENGAH JALAN, dan memang tidak dibutuhkan

Arya bilang: **"tidak perlu ubah ke PDF, aku hanya butuh presentasinya aja."**
Jadi ini dihentikan. Dicatat biar tidak diselidiki ulang dari nol.

**Yang sudah diperbaiki (tetap berguna, tidak dibatalkan):**
- Handler keyboard merampas `Ctrl+P` → tiap pencet Ctrl+P, panel catatan
  pembicara ikut terbuka. Diperbaiki: handler `keydown` sekarang keluar lebih
  awal kalau `e.ctrlKey || e.metaKey || e.altKey`. Diuji: `p` masih toggle
  catatan, `Ctrl+P` tidak lagi.
- Ukuran halaman cetak diubah dari `297mm x 167mm` ke `1600px x 900px`
  (seukuran desain). Alasannya: semua token pakai `clamp(...vw...)` dan jarak
  pakai `clamp(...vh...)` — kalau halaman cetak lebih kecil dari desain, unit
  vw/vh ikut mengecil dan tata letak bergeser.
- Ditambah override cetak yang sebelumnya kelewat: `.eyebrow .dash`,
  `.stamp`, `.chain-node circle`, `.chain-node text`.

**Yang BELUM terpecahkan:**
`page.pdf()` Playwright menghasilkan PDF yang berbeda dari mode cetak yang
disimulasikan. Pada slide 02, kolom kiri hilang total dan grid jadi satu
kolom — padahal probe di dalam PDF melaporkan `innerWidth=1600`,
`matchMedia('(max-width:900px)')=false`, dan pengukuran DOM menunjukkan grid
`740px 740px` dengan kolom kiri di y=182 (di dalam halaman).

Sebaliknya, **`emulate_media('print')` + screenshot hasilnya SEMPURNA** —
dash merah, judul, dua kolom, semua masuk. Jadi CSS-nya kemungkinan besar
sudah benar, dan yang menyimpang adalah jalur `Page.printToPDF` lewat CDP.

Artinya: Ctrl+P di browser sungguhan (yang memakai print preview Chromium,
bukan CDP) **mungkin** sudah benar — tapi belum dibuktikan. Kalau suatu saat
PDF dibutuhkan lagi, langkah pertama yang paling murah: tes Ctrl+P manual di
browser sungguhan dan lihat hasilnya, sebelum menyelidiki lebih dalam.

## Slide 02 — daftar anggota dilengkapi (15 Sep 2026)

Tata letak slide 02 **tidak diubah** (sesuai permintaan Arya). Yang ditambah
hanya data: tiap kartu anggota kini punya **nama lengkap + NIM**.

- CSS baru: `.card .nim` — mono, `--t-5`, `letter-spacing:.12em`,
  `color:var(--muted)`, `font-variant-numeric:tabular-nums`.
  Diletakkan setelah `.card p`; spesifisitas `(0,2,0)` menang atas
  `.card p` `(0,1,1)` jadi tidak perlu `!important`.
- Data diambil dari screenshot referensi yang dikirim Arya (982×336 px,
  tema gelap). Perlu di-upscale 3× dulu untuk membaca digit NIM dengan yakin.
- **Sumber NIM:** PDF asli (`PPT PDB KEWARGANEGARAAN.pdf`, halaman 2) hanya
  memuat nama singkat **tanpa NIM**. Jadi NIM murni dari gambar referensi.
- **Selisih yang perlu dicek Arya:** anggota 01 di PDF tertulis
  "Muhammad Fadyan F. H.", di gambar referensi "Muhammad Adyan Faqih Huddin".
  Dipakai versi referensi (nama penuh). Mudah diganti inline di browser.

| # | Nama | NIM |
|---|------|-----|
| 01 | Muhammad Adyan Faqih Huddin | 626103051312 |
| 02 | Salma Nur Khasanah | 626107097032 |
| 03 | Akbar Arya Maulana | 626107097035 |
| 04 | Arya Rizky Ardhi Pratama | 626103051310 |
| 05 | Dinda Naura Firdausy | 626115327032 |
| 06 | Izzatul Hayati | 626113145087 |

Hasil ukur di 1600×900: body 93→807 (tinggi 715), kartu 6×87 px,
kartu terakhir berakhir di y=767, footer mulai y=821 → **tidak ada overflow**,
tidak ada elemen bocor, 0 error konsol.

## Slide 01 — panel kanan diganti isi nyata (15 Sep 2026)

Arya menunjuk panel kanan slide 01 dan bertanya kenapa "kosong hitam". Panel
lamanya memang **5 bar redaksi hitam pekat tanpa isi** + header karangan
"Laporan Anggaran / RA-2025". Arahan Arya: *"Beri isi yang nyata terverifikasi.
jika tak ada hapus aja."*

Yang dipakai: **daftar sumber**, bukan angka. Alasannya — angka headline
(Rp 2.765,13 T dst.) adalah kejutan slide 22; kalau dipasang di slide 01,
payoff-nya hilang. Sumber justru memperkuat pembuka dan tidak membocorkan apa pun.

| Header | `Sumber & rujukan` / `SD-2026` |
|---|---|
| 1 | Kementerian Keuangan RI — Laporan Keuangan Kemenkeu 2025 |
| 2 | OECD — Revenue Statistics in Asia and the Pacific 2026 |
| 3 | Transparency International Indonesia — CPI 2025 · rilis 10 Feb 2026 |
| 4 | Direktorat Jenderal Pajak — Kanwil DJP Jawa Tengah I · bahan video |

Semuanya ada di `content/verified-data.md` dan memang dikutip di deck.
Footer panel: `Diverifikasi 15 Sep 2026` (sesuai tanggal pengecekan di
verified-data.md). Stempel "Taat & Bersih" dipertahankan.

Perubahan lain:
- CSS baru `.src` (daftar bernomor garis kiri, nama bold + keterangan mono).
- **Dead code dihapus**: seluruh blok `.redact` / `.redact i` /
  `.redact.reveal` (sudah tidak dipakai di markup sejak lama) + dua
  rujukannya di CSS cetak.
- Tinggi panel: 308 px @1600×900 (275–315 px di 1280–1920). Tidak ada
  teks meluber, tidak ada elemen bocor, 0 error konsol.

### Efek samping yang harus ikut diperbaiki: catatan pembicara
Panel slide 01 dan slide 22 dulu memakai `doc-head` yang **sama**
("Laporan Anggaran / RA-2025") — itulah yang mengikat keduanya sebagai
dokumen yang sama: disensor di awal, dibuka di akhir. Setelah slide 01
diganti, ikatan itu putus dan dua `data-notes` jadi bertentangan dengan isi
slide. Keduanya diperbarui:

- Slide 01 → pengantar daftar sumber (bukan lagi "ada informasi yang ditutup").
- Slide 22 → frasa "sejak slide pertama" dihapus.

**Aturan ke depan: setiap kali isi slide diubah, grep `data-notes` untuk kata
kunci motif terkait.** Catatan pembicara adalah prosa yang tidak ikut berubah
sendiri. `content/design-plan.md` §"Motif berulang" juga sudah disesuaikan.

## Video: kenapa "redirect" dan bukan diputar di tempat (15 Sep 2026)

Arya bertanya kenapa klik video malah membuka YouTube di tab baru. Jawabannya
bukan bug: itu perilaku yang disengaja saat deck dibuka lewat `file://`.

Diuji ulang dengan `tools/yt-file-test.py` (iframe dipasang manual, lalu
di-screenshot — DOM iframe cross-origin tidak bisa dibaca):

| Konteks | `youtube.com/embed` | `youtube-nocookie.com/embed` |
|---|---|---|
| `file://` (klik dua kali) | "Terjadi error pada konfigurasi pemutar video" | **layar hitam kosong** |
| `http://127.0.0.1:8788` | player normal | player normal |

Klik sungguhan di jalur http sudah diverifikasi: iframe terpasang dengan
`src=https://www.youtube-nocookie.com/embed/proAhdTWOH4?autoplay=1&rel=0`,
dan videonya **berjalan di dalam deck** (terlihat 0:03 / 1:46 + kontrol).
Screenshot: `shots/yt-file/klik-http.png`.

**Kesimpulan: embed YouTube mustahil dari `file://`.** Kalau player tetap
dipaksa tampil, yang muncul kotak hitam di depan kelas — jadi penjagaan
`file-mode` itu benar dan jangan dilepas.

Yang diperbaiki: pesan di kartu video saat mode file. Dulu cuma
"Deck dibuka langsung dari file — video dibuka di tab baru" (memberi tahu
masalah, bukan jalan keluar). Sekarang:

```
VIDEO BUTUH SERVER · JALANKAN PUTAR-DECK.BAT
LALU BUKA HTTP://127.0.0.1:8788/INDEX.HTML
```

Perlu `white-space:pre-line` supaya `\A` di `content` jadi baris baru.

**Untuk Arya:** jangan klik dua kali `index.html`. Pakai `PUTAR-DECK.bat`.
Kalau nanti sudah di Vercel (https), masalah ini hilang sendiri.

## Deploy ke Vercel (16 Sep 2026)

Arya bertanya apakah deck sudah di-deploy. Jawabannya belum — diverifikasi
lewat API Vercel: **42 project** di akun `arya-rizkys-projects`, tidak satu pun
cocok (`ppt`, `kwn`, `presentasi`, `deck`, `kewarga`, `pdb`, `slide` → nol
hasil). Tidak ada folder `.vercel/` maupun `vercel.json` di proyek.

Arya memilih **deploy + auto-deploy dari GitHub**, jadi keduanya dikerjakan.

| | |
|---|---|
| URL produksi | **https://presentasi-kwn-web.vercel.app** |
| URL deployment | `presentasi-kwn-minzfdnyh-arya-rizkys-projects.vercel.app` |
| Project | `arya-rizkys-projects/presentasi-kwn-web` (`prj_zM046noVqsvcnb1PO9Wau6bDFtOe`) |
| Repo tersambung | `github / algojogacor / presentasi-kwn-web` |
| Branch produksi | `main` → **setiap `git push` otomatis deploy** |
| Yang terunggah | **116 KB** (bukan 73 MB) |

### `.vercelignore`
Dibuat supaya yang ter-unggah cuma `index.html` + `assets/`. Diuji:
`/assets/fonts/*` dan `/assets/qr/*` → 200, sedangkan `/tools/verify-deck.py`
dan `/worklog.md` → **404**. Jadi benar-benar tidak ikut.

### Verifikasi situs live (Playwright, 1600×900)
- `https:` · 22 slide · WebGL aktif · 3 keluarga font
- **0 overflow · 0 elemen bocor · 0 error konsol**
- **Video diputar di dalam deck** — `file-mode` mati, iframe YouTube masuk,
  dan frame videonya benar-benar tampil (dua panel animasi hitam-putih).
  Inilah alasan utama deploy: batasan `file://` hilang di https.

### Catatan
- `vercel link` otomatis menambahkan `.vercel` dan `.env*` ke `.gitignore`.
  `.env.local` berisi `VERCEL_OIDC_TOKEN` — **jangan pernah di-commit**,
  sudah dipastikan ter-ignore lewat `git check-ignore`.
- Situs ini **publik dan bisa diindeks mesin pencari**, sementara deck memuat
  nama lengkap + NIM enam mahasiswa. **Keputusan Arya (16 Sep 2026): tidak apa-apa.**
  NIM itu nomor biasa, tidak ada unsur privat, dan lazim dipampang terbuka.
  → **Tidak ada tindakan lanjutan.** Kalau suatu saat berubah pikiran, opsinya:
  Deployment Protection di dashboard Vercel, atau `robots.txt` berisi
  `Disallow: /` (hanya menghalangi crawler yang patuh, bukan mengunci akses).
- `vercel git connect` butuh konfirmasi interaktif; dipanggil dengan `--yes`.

## Ketahanan WebGL (15 Sep 2026)

Celah nyata: deck tidak punya listener `webglcontextlost`/`webglcontextrestored`.
IIFE WebGL dipecah jadi `build()` + `run()` + `stop()`; listener dipasang sekali
dan konteks yang pulih akan membangun ulang shader/program/VAO.

Diuji dengan `WEBGL_lose_context`: `no-gl` nyala saat hilang, `restoreContext()`
mengembalikan piksel persis seperti semula, 0 error.

**Koreksi penting:** hipotesis awal "layar hitam karena canvas WebGL opaque"
**SALAH**. `tools/alpha-proof.py` membuktikan saat konteks hilang Chromium
**melewati elemen canvas sepenuhnya** (yang terlihat latar body), dan nilai
`alpha` tidak berpengaruh. Jadi kalau ada laporan layar hitam, jangan mulai
dari WebGL lagi. Komentar di kode sudah dikoreksi.

## Langkah berikutnya

1. ~~Arya cari video pengganti untuk slide 04~~ → **SUDAH DIGANTI** dengan
   "Indonesia Tanpa Pajak?" (Kanwil DJP Jawa Tengah I, 1:46, ID `proAhdTWOH4`).
   Kandidat lain + cara menukarnya ada di `content/design-plan.md` §5.
2. ~~QR code gantung ke layanan luar~~ → **sudah lokal** di `assets/qr/`.
3. Opsional: varian "aman" untuk laptop kampus jadul (WebGL dimatikan,
   animasi disederhanakan) — belum diminta.
4. Opsional: `?noanim=1` di URL untuk memaksa semua animasi langsung ke
   keadaan akhir kalau presentasi di proyektor bermasalah.

---

# PENUTUP — 15 September 2026

## Status

**Deck selesai, terverifikasi, dan sudah ter-push ke GitHub.**
Proyek ditutup untuk sesi ini. Server lokal sudah dimatikan
(port 8788 & 8790 bebas).

## Yang diserahkan

| | |
|---|---|
| Deck | `index.html` — 22 slide, satu file, CSS+JS inline, **nol dependensi runtime** |
| **Live** | **https://presentasi-kwn-web.vercel.app** |
| Cara pakai lokal | `PUTAR-DECK.bat` (menyalakan server lokal + membuka browser) |
| Repo | https://github.com/algojogacor/presentasi-kwn-web |
| Commit | `5f37a56` — 34 file, 6.640 baris |
| Bahan | `content/design-plan.md`, `content/verified-data.md` |

## Verifikasi pasca-push (clone bersih dari GitHub)

Repo di-clone ulang dari GitHub ke folder terpisah, disajikan lewat server,
lalu diuji. Hasilnya identik dengan folder kerja:

- 34 berkas, 894 KB — **tidak ada berkas yang hilang** karena `.gitignore`
- Semua aset HTTP **200**: `index.html`, `assets/fonts/fonts.css`,
  kedua PNG QR, dan berkas woff2
- 22 slide · WebGL aktif · 3 keluarga font termuat · 16 jalur SVG
- **0 overflow · 0 elemen bocor · 0 error konsol**
- Panel sumber slide 01 ada · 6 kartu anggota slide 02 dengan 6 NIM valid
- 0 slide tanpa catatan pembicara

Jadi repo ini bisa di-clone di komputer mana pun (termasuk laptop kampus)
dan langsung jalan tanpa langkah tambahan selain `PUTAR-DECK.bat`.

## Rentang resolusi yang sudah diuji

Diuji 15 Sep 2026, semuanya lewat `index.html` langsung:

| Resolusi | Rasio | Overflow | Elemen bocor | Kolom | Font terkecil |
|---|---|---|---|---|---|
| 1920×1080 | 1,78 | 0 | 0 | 2 | 11,5 px |
| 1920×1200 | 1,60 | 0 | 0 | 2 | 11,5 px |
| 1600×900 | 1,78 | 0 | 0 | 2 | 11,5 px |
| 1366×768 | 1,78 | 0 | 0 | 2 | 10,9 px |
| 1280×800 | 1,60 | 0 | 0 | 2 | 10,2 px |
| 1280×720 | 1,78 | 0 | 0 | 2 | 10,2 px |
| **1024×768** (proyektor 4:3) | 1,33 | 0 | 0 | 2 | 9,6 px |
| 800×600 | 1,33 | **3** | **21** | 1 | 9,6 px |

**Aman untuk semua laptop dan proyektor realistis** — termasuk proyektor 4:3
1024×768 yang masih banyak dipakai di ruang kelas.

**Batasnya di 800×600.** Di bawah lebar ~900 px, `.body.cols` melebur jadi
satu kolom; kontennya lalu menumpuk vertikal dan 3 slide meluber. 800×600
sudah tidak realistis untuk proyektor tahun 2026, jadi ini dibiarkan —
**tapi perlu diingat kalau deck ini suatu saat dibuka di ponsel** (mis. dari
tautan Vercel yang dibagikan). Kalau itu terjadi, langkah paling murah:
kunci lebar minimum dan skalakan seluruh deck dengan `transform: scale()`,
atau tampilkan pesan "buka di layar lebih besar".

## Verifikasi terakhir (semua lolos)

- 22 slide, semuanya dapat kelas `.in`
- 7 keluarga font termuat, **WebGL aktif**, 12 jalur guilloche
- **0 overflow**, **0 elemen bocor**, **0 error konsol**
- 0 slide tanpa catatan pembicara
- Panel slide 01 & 02 diuji di 1280 / 1366 / 1600 / 1920 px
- Uji kehilangan konteks WebGL: latar tetap kertas, pulih otomatis
- Klik video lewat `http://` benar-benar memutar di dalam deck (0:03 / 1:46)

## Tiga hal yang wajib diingat

1. **Jangan klik dua kali `index.html`.** YouTube menolak embed dari `file://`
   (diuji: `youtube.com/embed` → pesan error, `youtube-nocookie.com/embed` →
   layar hitam). Pakai `PUTAR-DECK.bat`. **Kalau nanti sudah di Vercel,
   batasan ini hilang sendiri** karena di sana sudah https.
2. **Jangan hapus watchdog `ensureActive()`** di `index.html`.
   `scroll-snap` + `scroll-behavior:smooth` mematikan scroll programatik;
   tanpa watchdog, seluruh slide tampil kosong.
3. **Kalau isi sebuah slide diubah, grep `data-notes`** untuk kata kunci motif
   terkait. Catatan pembicara adalah prosa yang tidak ikut berubah sendiri —
   sudah pernah kejadian di sesi ini (slide 01 vs 22).

## Data yang dipakai (semua bersumber)

Pendapatan negara 2025 Rp 2.765,13 T · penerimaan pajak Rp 1.917,6 T
(87,6% target) · rasio pajak 11,8% PDB · CPI 2025 skor 34, peringkat 109/180.
Rincian + tautan sumber ada di `content/verified-data.md`.

## Kalau dilanjutkan

1. ~~Deploy ke Vercel~~ → **SUDAH** (16 Sep 2026). Live di
   https://presentasi-kwn-web.vercel.app, auto-deploy dari GitHub aktif.
2. Opsional: varian "aman" untuk laptop kampus jadul (WebGL dimatikan).
3. Opsional: `?noanim=1` untuk memaksa animasi langsung ke keadaan akhir.
4. Opsional: tangani layar sempit (< 900 px) — deck rusak di bawah 800×600,
   relevan kalau dibuka di ponsel. Lihat §Rentang resolusi.
5. Opsional: README untuk repo (belum dibuat — worklog ini yang jadi dokumentasi).

## Status git (per 16 Sep 2026, sesi tutup)

Remote `main` = `5f37a56`. **Semua commit lokal di atasnya belum ter-push.**
Isinya murni pembukuan:

| Commit | Isi |
| --- | --- |
| `a5e42af` | worklog: catat push berhasil + verifikasi clone bersih |
| `fe90d27` | worklog: catat hasil uji rentang resolusi |
| `a17751e` | deploy: Vercel produksi + auto-deploy dari GitHub |
| `a4d33c2` | worklog: status git akhir sesi + keputusan NIM publik |
| `f3f0845` | chore: abaikan `PUSH-GIT.bat` (helper lokal) |

Tak satu pun menyentuh `index.html` — jadi **isi deck yang live di Vercel
identik dengan yang ada di disk sekarang**. Push ini pembukuan, bukan konten.

**Push harus dijalankan Arya sendiri.** Sandbox tidak punya kredensial GitHub:
`gh` belum login, tidak ada `GH_TOKEN`, tidak ada `~/.git-credentials`, dan
`cmdkey /list` diblokir. Git Credential Manager menggantung saat dipaksa
non-interaktif (coba buka GUI). Yang bisa jalan dari sandbox hanya read-only
(`git ls-remote`).

Dua cara, pilih salah satu:

```powershell
cd D:\Projects\PPT_KWN
git push
```

…atau **klik dua kali `PUSH-GIT.bat`** (dibuat di sesi ini, sudah di-`.gitignore`).

Sekali push → semua commit naik **dan** otomatis memicu deploy produksi baru di
Vercel (auto-deploy dari `main` sudah aktif).

