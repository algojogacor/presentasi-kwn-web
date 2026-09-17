# Sprint FX — Brief

**Projek:** deck web "Kewarganegaraan" 22 lembar (`index.html`, 1600×900,
editorial kertas+tinta). Sprint ini mengubah presentasi statis menjadi
**pengalaman sinematik modular** tanpa mengubah satu kata pun isi materi.

## Yang dibangun

1. **Arsitektur modular** — 10 file JS terpisah di `assets/js/` (lihat
   `01-ARSITEKTUR.md`), dimuat berurutan sebelum `</body>`.
2. **Mesin state navigasi** (`fx-core.js`) — satu slide aktif, entrance
   per slide, transisi keluar-masuk, kunci anti-spam saat transisi.
3. **Panggung SVG persisten** (`fx-svg-stage.js`) — siluet kota yang
   *morph* antar slide + layer ikon per bab + parallax kursor.
4. **WebGL** (`fx-webgl.js`) — hero partikel (slide 01), fluida tinta
   (slide 22), abu (collapse slide 15).
5. **Fisika puing** (`fx-physics.js`) — slide 15 "runtuh" jadi shard saat
   ditinggalkan.
6. **8 transisi** (`fx-transitions.js`) — ink-wipe, grid-slice,
   bars-shutter, iris, wind-stagger, blur-dissolve, cell-sweep, shards-fly.
7. **Entrance GSAP + SplitText** (`fx-entrances.js`) — judul terurai per
   huruf, bar spring, chain draw, KPI, redaksi.

## Batasan keras (JANGAN dilanggar)

| Aturan | Alasan |
|---|---|
| Teks materi tidak boleh diubah | Kontrak ke Arya; data sudah diverifikasi di `content/verified-data.md` |
| Kontras teks kecil `--muted` ≥ ambang deck | Diukur `tools/bg-exact.py`; latar terburuk harus ≈ `#DAD2C5` |
| `prefers-reduced-motion` → deck klasik jalan penuh | Uji `tools/fx-verify.py` blok "reduced" |
| Mode cetak (`html.fx-print`) menghasilkan teks lengkap | Bar redaksi = 0, karakter split terlihat |
| Semua aset lokal (`assets/vendor/`) | Deploy tanpa CDN; tidak boleh tambah `<script src="https://…">` |
| Zona footer (±90px bawah) bersih dari FX berat | Teks atribusi sumber harus terbaca |

## Cara melihat hasil

Server lokal sudah standar: `py -3 -m http.server 8755 --bind 127.0.0.1`
dari root projek → `http://127.0.0.1:8755/index.html`.

## Status & cara ambil alih

Sistem FX **sudah terbangun dan seluruh gerbang kualitas hijau**
(`fx-verify`, `smoke`, `bg-exact` lulus — lihat `03-GERBANG-KUALITAS.md`).
Sprint ini untuk agent lain adalah **QA akhir + dokumentasi + pengaman
regresi**, BUKAN membangun dari nol. Ambil pekerjaan dari
`02-TASKS.md`. Aturan kode & jebakan yang sudah terbukti:
`04-KONVENSI-FX.md`. Peta modul & API: `01-ARSITEKTUR.md`.
