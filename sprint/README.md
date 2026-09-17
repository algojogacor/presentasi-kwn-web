# Sprint FX — Berkas Handoff

Dokumen ini untuk **agent yang mengerjakan**, bukan untuk dibaca Arya.
Sistem FX sudah terbangun dan gerbang kualitas hijau; sprint ini = **QA
akhir + pengaman regresi + log**.

## Susunan baca

| Berkas | Isi | Kapan dibaca |
|---|---|---|
| `00-BRIEF.md` | Konteks projek, batasan keras, cara melihat hasil | Paling awal |
| `01-ARSITEKTUR.md` | Peta 10 modul, urutan muat, API publik, mesin state, registry | Sebelum menyentuh kode |
| `02-TASKS.md` | **Daftar pekerjaan T1–T6 + Definition of Done** | Ini yang dikerjakan |
| `03-GERBANG-KUALITAS.md` | Cara menjalankan 4 alat uji + ambang lulus | Tiap kali selesai mengubah |
| `04-KONVENSI-FX.md` | Aturan kode + 6 jebakan bug yang sudah diperbaiki | Sebelum edit FX |

## Ringkas status (saat handoff)

- **Selesai & terverifikasi:** seluruh sistem FX modular; 22 slide; 21
  transisi; WebGL hero/fluid/ash; fisika puing; panggung SVG persisten;
  entrance SplitText; reduced-motion; mode cetak.
- **Baru diperbaiki (jaga jangan balik):** chain slide 18 (`attr r`),
  lantai puing di atas footer, gradien isian siluet, tuning fluida 22.
- **Gerbang saat handoff:** `fx-verify` ✅ · `smoke` ✅ · `bg-exact`
  worst `#D9D2C5` ✅ · `verify-deck` (jalankan ulang).
- **Belum dikerjakan (tugas agent):** QA visual 22 lembar (T1), kunci
  regresi di `fx-verify` (T3), bersihkan artefak + `worklog.md` (T4),
  konfirmasi deploy/cetak (T5).

## Cara mulai

1. Baca `00` → `01` → `04`.
2. Buka `02-TASKS.md`, kerjakan **T1** lebih dulu.
3. Setelah tiap perubahan: `03-GERBANG-KUALITAS.md`.
4. Penuhi **Definition of Done** sebelum menyatakan sprint selesai.

Server lokal: `py -3 -m http.server 8755 --bind 127.0.0.1` →
`http://127.0.0.1:8755/index.html`.
