# Tugas Sprint (untuk agent)

Sistem FX **sudah jadi dan semua gerbang hijau**. Yang tersisa adalah
QA akhir, pengaman regresi, dan dokumentasi log. Kerjakan berurutan
P0 → P1 → P2. **Jangan** menulis ulang modul dari nol.

Aturan main: sentuh **isi/materi** = DILARANG. Sentuh **FX & alat ukur** =
boleh, asal `03-GERBANG-KUALITAS.md` tetap hijau setelahnya.

---

## T1 (P0) — QA visual penuh 22 lembar

**Tujuan:** memastikan tidak ada slide yang cacat secara visual, baik
state akhir maupun frame tengah transisi.

**Lakukan:**
1. Jalankan server lokal (lihat `03-GERBANG-KUALITAS.md`), lalu tembak
   screenshot **setiap** slide pada state selesai (tunggu ≥ 6 detik
   setelah `FX.nav(i)` agar entrance panjang — chain, redaksi, kpi —
   tuntas). Simpan ke `tools/_shot/qa-NN.png`.
2. Untuk tiap batas slide `i→i+1`, tembak juga 2 frame transisi
   (±150 ms dan ±400 ms setelah `FX.nav`) untuk memastikan overlay
   transisi bersih (tidak ada fragmen nyangkut, tidak menutupi teks
   permanen).
3. Isi tabel temuan (format di bawah). Untuk tiap temuan: sertakan
   screenshot, slide, elemen, dan tingkat keparahan.

**Tabel temuan (isi):**
| # | Slide | Elemen | Gejala | Keparahan | Status |
|---|---|---|---|---|---|
| | | | | Blocker/Major/Minor | Terbuka/Perbaikan/ Natar |

**Fokus khusus (pernah bermasalah, pastikan masih baik):**
- 15 → 16: tumpukan puing **tidak** menutupi footer (FLOOR di atas footer).
- 16: titik CPI & garis tidak tertutup siluet; footer terbaca.
- 18: simpul chain 01–05 **di posisinya** (bukan menumpuk di kiri).
- 22: fluida = sapuan aircolor tipis, **bukan** noda pekat di atas teks;
  bar redaksi akhirnya terbuka (teks terlihat).
- 02 & semua: siluet kota memudar → 0 menjelang dasar (footer bersih).

**Acceptance:** 22/22 slide punya screenshot state akhir; tabel temuan
terisi; tidak ada temuan Blocker yang tersisa Terbuka.

---

## T2 (P0) — Perbaiki temuan T1 (hanya FX, aman)

Perbaiki temuan Blocker/Major dari T1. Perubahan minimal, sesuai
`04-KONVENSI-FX.md`. Setelah tiap perbaikan jalankan ulang gerbang
kualitas. Kalau perbaikan menyentuh area sensitif (footer/kontras),
wajib `bg-exact.py` tetap ≈ `#DAD2C5`.

**Acceptance:** tidak ada Blocker/Major Terbuka; semua gerbang hijau.

---

## T3 (P1) — Kunci regresi di `tools/fx-verify.py`

Bug yang **sudah diperbaiki** di sprint ini harus punya penjaga otomatis
agar tidak balik diam-diam. Tambahkan assertion:

1. **Chain (slide 18):** setelah `FX.nav(17)` + tunggu, tiap
   `.chain-node circle` punya `getBoundingClientRect().x` yang **meningkat
   monoton** dan spread > 600px (mencegah regresi "menumpuk di kiri" dari
   bug GSAP `transform-box:fill-box`).
2. **Siluet footer:** `getComputedStyle` fill master tidak boleh solid di
   zona footer — cek `#svgStage` punya `<linearGradient id="svFill">` dan
   `.sv-master` `fill:url(#svFill)`.
3. **Puing di atas footer:** setelah meninggalkan hero, bounding box kanvas
   physics / cluster shard terendah **di atas** batas `.ftr` (y_footer_top).
4. **Fluida 22:** opacity display fluid ≤ ambang (baca konstanta di
   `fx-webgl.js`) — atau cukup assertion visual: piksel median di zona
   body-text slide 22 tetap terang (reuse decoder PNG dari `bg-exact.py`).

**Acceptance:** `fx-verify.py` mencetak baris PASS baru untuk 1–4, dan
PASS lama tetap hijau.

---

## T4 (P1) — Bersihkan artefak & log

- Hapus screenshot sementara `tools/_shot/*` hasil T1 (atau pindahkan ke
  `previews/qa/` kalau Arya ingin menyimpan bukti).
- Audit `console.log` di jalur produksi: pesan boot `[fx] sistem visual
  aktif …` boleh, tapi tidak boleh ada `console.log` debug per-frame.
  `fx-verify`/`smoke` melaporkan **ERROR KONSOL: 0** — jaga itu.
- Pastikan tidak ada `debugger;` tertinggal.

**Acceptance:** `git status`/daftar file bersih dari artefak sementara;
`smoke.py` tetap `ERROR KONSOL: tidak ada`.

---

## T5 (P1) — Konfirmasi jalur deploy & cetak

- Deploy: `.vercel/` ada dan semua aset lokal → jalankan build/preview
  Vercel lokal bila tooling tersedia; kalau tidak, minimal verifikasi
  `index.html` + `assets/` tidak mereferensikan apa pun di luar repo
  (grep `http://`/`https://` di `index.html` dan `assets/js/` → harus nol
  untuk aset yang dibutuhkan saat tampil).
- Cetak: buka `index.html`, panggil `FX.preparePrint()`, screenshot, pastikan
  teks lengkap & bar redaksi = 0 (sudah diuji `fx-verify` blok "print" —
  cukup pastikan tetap hijau).

**Acceptance:** nol referensi aset remote; blok print `fx-verify` hijau.

---

## T6 (P2, opsional) — Kilau tambahan

Hanya jika T1–T5 selesai dan masih ada waktu:
- Pastikan **setiap** transisi punya hook suara simetris (masuk/keluar) dan
  seluruhnya **senyap** saat `FXSound.isEnabled() === false`.
- Idle ambient: slide data (05,16,21) boleh punya denyut halus agar tidak
  terasa mati saat dibiarkan — jangan menambah kontras risiko (tetap hati
  terhadap `bg-exact`).
- `prefers-reduced-motion`: sapu manual — deck klasik harus tetap enak
  dibaca (tidak ada elemen `opacity:0` permanen).

---

## Definition of Done (sprint ini selesai bila)

1. T1 tabel temuan terisi, tanpa Blocker/Major Terbuka.
2. `fx-verify.py`, `smoke.py`, `bg-exact.py` semuanya hijau (lihat
   `03-GERBANG-KUALITAS.md`).
3. `worklog.md` punya entri FX sprint (format entri: lihat `04-KONVENSI-FX.md`
   §Worklog) — **ini bagian dari T2/T4, jangan lewat**.
4. Tidak ada perubahan pada satu karakter pun teks materi.
5. Artefak sementara dibersihkan; tidak ada regresi aset remote.
