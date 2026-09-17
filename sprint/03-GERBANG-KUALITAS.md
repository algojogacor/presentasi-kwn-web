# Gerbang Kualitas

Jalankan dari root projek. Semua pakai Playwright (sudah terpasang) +
server statis lokal. **Sprint dianggap utuh hanya bila keempatnya hijau.**

## 0. Server lokal (prasyarat)

```
py -3 -m http.server 8755 --bind 127.0.0.1
```
Lalu buka `http://127.0.0.1:8755/index.html`. Alat ukur di bawah sudah
mengarah ke URL ini — bila port diganti, sesuaikan konstanta URL di
`tools/*.py`.

## 1. `tools/fx-verify.py` — mesin FX & aksesibilitas

```
py -3 tools/fx-verify.py
```
Cakupan (±12 assertion): counter slide selesai, overlay transisi aktif
(`FX.isBusy` + jumlah bar), roda navigasi maju, keyboard mundur, tween
slide yang ditinggalkan = 0 (bocor/tidak), mode cetak (`fx-print`: kelas,
karakter terlihat, bar penuh), restore setelah cetak, `prefers-reduced-motion`
→ `fx-off` + navigasi klasik + tanpa error.
**Lulus:** semua `PASS`, `ERROR KONSOL: 0`, `GAGAL: tidak ada`.
→ Di sinilah **T3** menambah assertion baru (chain, siluet, puing, fluida).

## 2. `tools/smoke.py` — screenshot + aset + konsol

```
py -3 tools/smoke.py
```
Menembak beberapa slide, memeriksa **tidak ada gambar gagal dimuat** dan
**tidak ada error konsol**. **Lulus:** `GAMBAR GAGAL DIMUAT: tidak ada`,
`ERROR KONSOL: tidak ada`.

## 3. `tools/bg-exact.py` — anggaran kontras

```
py -3 tools/bg-exact.py
```
Mengukur latar **di belakang** teks (header/footer, semua slide) dengan teks
dibuat transparan, melaporkan latar terburuk. Ini penjaga aturan "footer
bersih". **Lulus:** latar terburuk ≈ `#D9D2C5`–`#DAD2C5` (jangan lebih gelap
dari ambang yang sudah ditentukan deck). Kalau FX menambah tinta di zona
teks kecil dan angka ini memburuk → **gagal**, kurangi opasitas FX di area
itu (lihat `04-KONVENSI-FX.md` §Kontras).

## 4. `tools/verify-deck.py` — verifier deck menyeluruh

```
py -3 tools/verify-deck.py            # penuh
py -3 tools/verify-deck.py --shot-only
```
Pemeriksaan layout/kontras/teks deck secara luas. Jalankan sebelum
menyimpulkan sprint selesai.

## Alat bantu QA visual (bukan gerbang, untuk T1)

```
py -3 tools/shot-slide.py 18 1600x900     # satu slide, viewport tertentu
py -3 tools/anim-shot.py                  # frame transisi (lihat --help file)
```
Simpan hasil T1 ke `tools/_shot/qa-NN.png`; **bersihkan setelahnya** (T4).

## Rutin saat mengerjakan

Setelah **tiap** perubahan FX: `fx-verify.py` + `smoke.py`.
Setelah perubahan yang menyentuh zona teks: tambah `bg-exact.py`.
Sebelum menutup sprint: keempatnya + `verify-deck.py`.
