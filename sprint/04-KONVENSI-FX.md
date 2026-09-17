# Konvensi FX & Jebakan Terbukti

Baca sebelum menyentuh `assets/js/fx-*.js`. Bagian "Jebakan" adalah bug yang
**benar-benar terjadi dan sudah diperbaiki** di sprint ini — jangan kembalikan.

## Konvensi kode

- **Satu IIFE per modul**, expose lewat `window.FX*`. Tidak ada bundler;
  urutan `<script>` = urutan dependensi (core paling akhir).
- **Konfigurasi hanya di `fx-registry.js`.** Menambah slide/efek/transisi =
  menyunting registry, bukan menyebarkan `if (index===n)` ke modul.
- **Selalu tandai elemen yang di-`gsap.set` dengan `own(el)`** lalu andalkan
  `FXEntrances.revert(slide)` saat keluar. Tanpa ini, inline style tertinggal.
- **Hormati `ctx.tl`** (timeline milik slide) untuk animasi entrance; jangan
  `gsap.to` liar yang tak bisa dibatalkan.
- **Warna pakai token CSS** (`--ink`, `--paper`, `--vermilion`, `--muted`,
  `--rule`, …). Jangan hardcode hex baru kecuali untuk shader/kanvas.
- **Zona footer = keramat.** Apa pun yang digambar di ±90px terbawah
  (siluet, puing, fluida) harus memudar→0 di sana.
- **Jangan** menambah aset remote; vendor lokal (`assets/vendor/`).
- **Jangan** mengubah satu karakter teks materi pun.

## Jebakan terbukti (WAJIB jaga)

1. **GSAP `scale` + `transform-box:fill-box` pada `<circle>` SVG yang juga
   punya `transform:scale()` di CSS → translasi sisa.**
   Gejala: simpul chain slide 18 menumpuk di kiri atas, menutupi judul.
   Solusi: animasikan **`attr: { r: … }`**, bukan `scale`; dan matikan
   transform CSS-nya di `html.fx-on` (`transform:none`).
   → Lihat `fx-entrances.js::chainDraw` dan `index.html` blok
   `html.fx-on .chain-node circle`.

2. **Lantai fisika puing harus DI ATAS footer.**
   `fx-physics.js`: `FLOOR = Hp - Math.max(96, Hp*0.13)`. Kalau `<` nilai ini,
   tumpukan shard menutupi teks atribusi sumber (slide 15→16).

3. **Isian siluet kota harus memudar ke nol menjelang dasar.**
   `fx-svg-stage.js`: `<linearGradient id="svFill">` (alpha .085→.05→0),
   dipakai `.sv-master{fill:url(#svFill)}`. Isian solid bikin `bg-exact`
   memburuk (footer `--muted` gagal kontras).

4. **Fluida slide 22 = aircolor, bukan noda.**
   `fx-webgl.js::fluidScene`: `state.opacity` target **0.66**, display
   `gl_FragColor.a = smoothstep(0.06,0.40,len) * uOpacity * 0.55`, warna
   `INK` dipertebang ke `(0.50,0.44,0.35)`, radius splat kecil. Menaikkan
   lagi → menutupi teks kesimpulan.

5. **Timing QA.** Entrance panjang (chain, redaksi, kpi, stamp) tuntas
   ± 4–6 s. Screenshot "cacat" sering cuma **frame tengah** — tunggu ≥ 6 s
   sebelum menyimpulkan bug. (Bar redaksi 22 terlihat menutupi label jika
   ditembak < 4 s; itu normal.)

6. **`FX.nav(i)` = indeks absolut 0‑based**, bukan delta. Salah pakai →
   loop navigasi tak pernah maju.

## Kontras (angka kerja)

`bg-exact.py` melaporkan latar terburuk di belakang teks. Deck ini sudah
menetapkan `--muted` supaya lolos pada latar terburuk ≈ `#DAD2C5`. Setiap
kali menambah FX di dekat teks kecil: jalankan `bg-exact.py`, pastikan
angka tidak memburuk. Bila perlu gelapkan `--muted` sesuai saran kandidat
yang dicetak alat itu (jangan ubah hue/saturasi).

## Format entri `worklog.md` (T2/T4 wajib tambah satu)

Repo ini menjaga `worklog.md` sebagai jurnal. Tambah seksi FX dengan pola
sama seperti entri lain:

```
## Sprint FX (modular cinematic layer) — <tanggal>
- Arsitektur: 10 modul `assets/js/fx-*.js`, orkestrasi `fx-core.js`,
  konfigurasi terpusat `fx-registry.js` (lihat `sprint/01-ARSITEKTUR.md`).
- Fitur: panggung SVG persisten, WebGL hero/fluid/ash, fisika puing,
  21 transisi, entrance SplitText.
- Perbaikan bug: chain fill-box→attr r; FLOOR puing di atas footer;
  gradien isian siluet; tuning fluida 22.
- Gerbang: `fx-verify` / `smoke` / `bg-exact` / `verify-deck` hijau.
- Temuan QA & sisa: <isi dari sprint/02-TASKS.md T1>.
```
