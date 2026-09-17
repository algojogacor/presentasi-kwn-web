#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Sapu em dash (U+2014) dari berkas deck.

Bukan find-replace buta: setiap penggantian dideklarasikan sebagai
(baris, potongan lama, potongan baru). Skrip gagal keras kalau potongan
lama tidak ketemu persis satu kali di baris itu, supaya pergeseran nomor
baris tidak diam-diam menghasilkan penggantian yang salah tempat.

Pemilihan pengganti mengikuti fungsi tanda pisahnya:
  koma       -> klausa lanjutan yang masih satu napas
  titik koma -> dua klausa setara
  titik      -> kalimat baru
  titik dua  -> label diikuti penjelasan
  titik tengah (·) -> pemisah label pendek, sudah dipakai deck ini
                      sendiri (mis. "Klik untuk memutar · 3:18")

Pakai:
  python tools/sweep-emdash.py --check     # hanya laporkan sisa em dash
  python tools/sweep-emdash.py --apply     # jalankan penggantian
"""
import sys
import pathlib

EM = "\u2014"

# (nomor baris, lama, baru). Nomor baris 1-based, mengacu index.html
# SEBELUM sapuan ini dijalankan.
RULES = [
    # -- head, terlihat di tab browser dan cuplikan tautan ------------
    (6, "Anti Korupsi \u2014 Kewarganegaraan", "Anti Korupsi: Kewarganegaraan"),
    (7, "PDB 93 \u2014 Kesadaran Pajak", "PDB 93: Kesadaran Pajak"),

    # -- komentar gaya ------------------------------------------------
    (14, 'KEWARGANEGARAAN \u2014 "BERKAS NEGARA"', 'KEWARGANEGARAAN \u00b7 "BERKAS NEGARA"'),
    (20, "(WAJIB \u2014 tiap slide pas 100dvh)", "(WAJIB: tiap slide pas 100dvh)"),
    (89, "VIEWPORT FITTING \u2014 setiap slide PAS 100dvh", "VIEWPORT FITTING: setiap slide PAS 100dvh"),
    (133, "sepenuhnya \u2014 yang terlihat latar body", "sepenuhnya; yang terlihat latar body"),
    (136, "muncul kertas \u2014 bukan hitam", "muncul kertas, bukan hitam"),
    (143, "Grain film \u2014 SVG inline", "Grain film: SVG inline"),
    (150, "Guilloche \u2014 satu rosette", "Guilloche: satu rosette"),
    (200, "/* 21 \u2014 kolom kanan lebih lega: panel metrik butuh ruang, bukan kolom sempit */",
          "/* Slide 21: kolom kanan lebih lega, panel metrik butuh ruang, bukan kolom sempit */"),
    (333, "nama anggota \u2014 metadata", "nama anggota: metadata"),
    (726, "09. CHROME \u2014 navigasi", "09. CHROME: navigasi"),
    (779, "Kursor tinta \u2014 hanya di", "Kursor tinta: hanya di"),
    (953, "DECK \u2014 21 slide", "DECK: 22 slide"),

    # -- penanda bagian per slide (01..22) ----------------------------
    (958, "01 \u2014 JUDUL", "01 \u00b7 JUDUL"),
    (1017, "02 \u2014 IDENTITAS", "02 \u00b7 IDENTITAS"),
    (1065, "03 \u2014 PETA PAPARAN", "03 \u00b7 PETA PAPARAN"),
    (1127, "04 \u2014 VIDEO: PENDAPATAN NEGARA", "04 \u00b7 VIDEO: PENDAPATAN NEGARA"),
    (1185, "05 \u2014 PAJAK: KONTRIBUTOR UTAMA", "05 \u00b7 PAJAK: KONTRIBUTOR UTAMA"),
    (1235, "06 \u2014 RASIO PAJAK", "06 \u00b7 RASIO PAJAK"),
    (1300, "07 \u2014 KE MANA UANG PAJAK PERGI", "07 \u00b7 KE MANA UANG PAJAK PERGI"),
    (1349, "08 \u2014 DEFINISI PAJAK", "08 \u00b7 DEFINISI PAJAK"),
    (1407, "09 \u2014 FAKTOR KEPATUHAN", "09 \u00b7 FAKTOR KEPATUHAN"),
    (1461, "10 \u2014 TIGA PILAR", "10 \u00b7 TIGA PILAR"),
    (1517, "11 \u2014 FONDASI SISTEM (jembatan)", "11 \u00b7 FONDASI SISTEM (jembatan)"),
    (1549, "12 \u2014 VIDEO: ANTI KORUPSI", "12 \u00b7 VIDEO: ANTI KORUPSI"),
    (1599, "13 \u2014 HAKIKAT PENDIDIKAN ANTI KORUPSI", "13 \u00b7 HAKIKAT PENDIDIKAN ANTI KORUPSI"),
    (1646, "14 \u2014 TUJUAN", "14 \u00b7 TUJUAN"),
    (1693, "15 \u2014 DAMPAK PADA GENERASI MUDA", "15 \u00b7 DAMPAK PADA GENERASI MUDA"),
    (1745, "16 \u2014 CPI", "16 \u00b7 CPI"),
    (1818, "17 \u2014 DUA SISI SATU KOIN", "17 \u00b7 DUA SISI SATU KOIN"),
    (1866, "18 \u2014 RANTAI SEBAB-AKIBAT", "18 \u00b7 RANTAI SEBAB-AKIBAT"),
    (1952, "19 \u2014 PERAN MAHASISWA & DOSEN", "19 \u00b7 PERAN MAHASISWA & DOSEN"),
    (1999, "20 \u2014 TIGA PROGRAM", "20 \u00b7 TIGA PROGRAM"),
    (2049, "21 \u2014 METRIK & JURANG", "21 \u00b7 METRIK & JURANG"),
    (2116, "22 \u2014 KESIMPULAN", "22 \u00b7 KESIMPULAN"),

    # -- catatan pembicara (tampil di mode presenter) -----------------
    (961, "jadi dasar kami \u2014 kalau ada yang mau dicek", "jadi dasar kami. Kalau ada yang mau dicek"),
    (1141, '"Dari Mana Negara Bisa Dapat Uang?" \u2014 kanal Kok Bisa?',
           '"Dari Mana Negara Bisa Dapat Uang?" dari kanal Kok Bisa?'),
    (1147, "Dari Mana Negara Bisa Dapat Uang? \u2014 Kok Bisa?", "Dari Mana Negara Bisa Dapat Uang? (Kok Bisa?)"),
    (1068, "di babak empat \u2014 kesadaran pajak", "di babak empat: kesadaran pajak"),
    (1188, "sumber pemasukan \u2014 ia tulang punggung", "sumber pemasukan; ia tulang punggung"),
    (1238, "bukan angka statistik \u2014 itu kapasitas negara", "bukan angka statistik; itu kapasitas negara"),
    (1410, "bertumpu pada yang pertama \u2014 yang kedua hanya jaring pengaman",
          "bertumpu pada yang pertama; yang kedua hanya jaring pengaman"),
    (1464, "Jangan berhenti lama di sini \u2014 ini jembatan", "Jangan berhenti lama di sini: ini jembatan"),
    (1520, "pindah topik ke anti korupsi \u2014 tapi tegaskan dulu", "pindah topik ke anti korupsi, tapi tegaskan dulu"),
    (1602, "bukan kampanye sesaat \u2014 ia usaha sadar", "bukan kampanye sesaat; ia usaha sadar"),
    (1696, "dimulai dari pejabat \u2014 ia dimulai dari kebiasaan kecil",
          "dimulai dari pejabat; ia dimulai dari kebiasaan kecil"),
    (1748, "naik ke tiga puluh tujuh \u2014 kita sempat berharap", "naik ke tiga puluh tujuh, kita sempat berharap"),
    (1821, "satu mata uang \u2014 dua sisinya berbeda", "satu mata uang, dua sisinya berbeda"),
    (1869, "dimulai dari pendidikan \u2014 bukan dari penindakan", "dimulai dari pendidikan, bukan dari penindakan"),
    (1955, "sebut nama \u2014 misalnya himpunan mahasiswa", "sebut nama, misalnya himpunan mahasiswa"),
    (2002, "sebagai usulan, bukan klaim \u2014 dan sebut targetnya", "sebagai usulan, bukan klaim, dan sebut targetnya"),
    (2052, "pekerjaan yang belum selesai \u2014 dan itu justru alasan", "pekerjaan yang belum selesai, dan itu justru alasan"),
    (2119, "slide 'terima kasih' \u2014 akhiri di sini", "slide 'terima kasih'; akhiri di sini"),

    # -- teks yang dibaca penonton ------------------------------------
    (978, "dan bertanggung jawab \u2014", "dan bertanggung jawab,"),
    (1322, "pendidikan nasional \u2014 dari gedung sekolah", "pendidikan nasional, dari gedung sekolah"),
    (1337, "Ini hak yang dibiayai bersama \u2014", "Ini hak yang dibiayai bersama,"),
    (1383, "<em>public saving</em> \u2014 sumber utama", "<em>public saving</em>, sumber utama"),
    (1439, "diri wajib pajak \u2014 tanpa perlu diawasi", "diri wajib pajak, tanpa perlu diawasi"),
    (1445, "individu \u2014 bekerja ketika kesadaran", "individu, dan bekerja ketika kesadaran"),
    (1531, "berkualitas \u2014 sistem perpajakan", "berkualitas, sistem perpajakan"),
    (1580, "Kemendikdasmen RI \u2014", "Kemendikdasmen RI,"),
    (1622, "lingkungan pendidikan \u2014 bukan kampanye sesaat", "lingkungan pendidikan, bukan kampanye sesaat"),
    (1669, "secara luas \u2014 bukan sekadar tahu", "secara luas, bukan sekadar tahu"),
    (1681, "luas \u2014 sehingga kejujuran", "luas, sehingga kejujuran"),
    (1716, "antisosial pada anak \u2014 batas antara benar", "antisosial pada anak, batas antara benar"),
    (1733, "yang dibesarkan \u2014 semuanya kecil", "yang dibesarkan, semuanya kecil"),
    (1762, "kembali ke titik awal \u2014", "kembali ke titik awal,"),
    (1812, "skor 45 pada 2028 \u2014 masih 11 poin", "skor 45 pada 2028, masih 11 poin"),
    (1854, "akan menolak korupsi \u2014", "akan menolak korupsi,"),
    (1975, "di masyarakat \u2014 dimulai dari lingkaran", "di masyarakat, dimulai dari lingkaran"),
    (1981, "di lingkungan kampus \u2014 lewat keteladanan", "di lingkungan kampus, lewat keteladanan"),
    (2012, "<span>Bukan sekadar gagasan \u2014</span>", "<span>Bukan sekadar gagasan,</span>"),
    (2067, "bukan kegagalan \u2014 itu daftar pekerjaan", "bukan kegagalan, itu daftar pekerjaan"),
    (2134, "dihadapi Indonesia \u2014 salah satunya pemahaman", "dihadapi Indonesia, salah satunya pemahaman"),

    # -- grafik: tanda pisah dipakai sebagai penanda "data tidak ada"
    (1804, ">Peringkat \u2014</text>", ">Peringkat n/a</text>"),

    # -- komentar mesin ----------------------------------------------
    (2188, "DECK KEWARGANEGARAAN \u2014 MESIN", "DECK KEWARGANEGARAAN \u00b7 MESIN"),
    (2190, "1. WebGL \u2014 kertas + noda tinta", "1. WebGL: kertas + noda tinta"),
    (2191, "2. Guilloche \u2014 satu rosette per babak", "2. Guilloche: satu rosette per babak"),
    (2192, "3. Navigasi \u2014 keyboard", "3. Navigasi: keyboard"),
    (2193, "4. Animasi masuk \u2014 dipicu", "4. Animasi masuk: dipicu"),
    (2211, "1. WEBGL \u2014 kertas + noda tinta", "1. WEBGL: kertas + noda tinta"),
    (2339, "tanpa isi \u2014 itu yang dicegah di sini", "tanpa isi; itu yang dicegah di sini"),
    (2408, "WebGL hilang \u2014 latar dialihkan", "WebGL hilang, latar dialihkan"),
    (2411, "WebGL pulih \u2014 menggambar ulang", "WebGL pulih, menggambar ulang"),
    (2422, "2. GUILLOCHE \u2014 satu pola per babak", "2. GUILLOCHE: satu pola per babak"),
    # tiga baris ini sengaja disejajarkan; titik tengah menjaga kolomnya
    (2574, "a. IntersectionObserver \u2014 jalur utama", "a. IntersectionObserver \u00b7 jalur utama"),
    (2575, "b. scrollend / scroll   \u2014 cadangan", "b. scrollend / scroll   \u00b7 cadangan"),
    (2576, "c. watchdog interval    \u2014 jaring terakhir", "c. watchdog interval    \u00b7 jaring terakhir"),
    (2611, "paksa tampil \u2014", "paksa tampil."),
    (2636, "c. Watchdog \u2014 sangat murah", "c. Watchdog: sangat murah"),
    (2719, "8. VIDEO \u2014 facade", "8. VIDEO: facade"),
    (2727, "di depan kelas \u2014 alihkan ke YouTube", "di depan kelas; alihkan ke YouTube"),
    (2815, "Mode edit aktif \u2014 klik teks", "Mode edit aktif: klik teks"),
    (2818, "Mode edit nonaktif \u2014 perubahan tersimpan", "Mode edit nonaktif: perubahan tersimpan"),
    (2837, "HTML terunduh \u2014 simpan menimpa", "HTML terunduh: simpan menimpa"),
    (2923, "langsung aktif \u2014 tanpa menunggu scroll", "langsung aktif, tanpa menunggu scroll"),
    (2942, "'[deck] siap \u2014 '", "'[deck] siap \u00b7 '"),
]

TARGET = pathlib.Path(__file__).resolve().parent.parent / "index.html"


def apply_rules(path):
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    problems = []
    applied = 0

    for lineno, old, new in RULES:
        if new is None:
            continue  # placeholder
        idx = lineno - 1
        if idx >= len(lines):
            problems.append(f"L{lineno}: di luar jangkauan berkas")
            continue
        count = lines[idx].count(old)
        if count != 1:
            problems.append(f"L{lineno}: '{old[:48]}' ketemu {count} kali, harus 1")
            continue
        lines[idx] = lines[idx].replace(old, new, 1)
        applied += 1

    if problems:
        print("GAGAL, tidak ada yang ditulis:")
        for p in problems:
            print("  " + p)
        return 1

    # jaring terakhir: pastikan tidak ada em dash tersisa
    out = "\n".join(lines)
    if EM in out:
        print("GAGAL: masih ada em dash setelah semua aturan diterapkan")
        return 1

    path.write_text(out, encoding="utf-8")
    print(f"OK. {applied} penggantian diterapkan, em dash tersisa: 0")
    return 0


def check(path):
    text = path.read_text(encoding="utf-8")
    n = text.count(EM)
    print(f"{path.name}: em dash = {n}")
    if n:
        for i, line in enumerate(text.split("\n"), 1):
            if EM in line:
                print(f"  L{i}: {line.strip()[:100]}")
    return 0


if __name__ == "__main__":
    if "--apply" in sys.argv:
        sys.exit(apply_rules(TARGET))
    sys.exit(check(TARGET))
