#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Sapu em dash untuk berkas dokumentasi dan alat (bukan index.html).

Aturan umumnya heuristik, karena di dokumen tanda pisah ini dipakai untuk
dua hal yang berbeda:

  * pemisah label pendek  -> titik tengah (·)
    mis. "Muhammad Adyan Faqih Huddin · 626103051312"
  * pemisah label dengan penjelasan -> titik dua (:)
    mis. "HASIL: BERSIH: tidak ada overflow"

Heuristiknya: kalau huruf pertama setelah tanda pisah KAPITAL, angka, atau
tanda kurung/tanda petik, anggap label pendek. Kalau huruf kecil, anggap
penjelasan. Kasus yang heuristiknya salah didaftarkan di OVERRIDES.

Pakai:
  python tools/sweep-emdash-docs.py --dry     # lihat rencana perubahan
  python tools/sweep-emdash-docs.py --apply   # tulis
  python tools/sweep-emdash-docs.py --check   # hitung sisa
"""
import re
import sys
import pathlib

EM = "\u2014"
ROOT = pathlib.Path(__file__).resolve().parent.parent

FILES = [
    "worklog.md",
    "content/design-plan.md",
    "content/verified-data.md",
    "content/yt-embed-check.json",
    "assets/fonts/fonts.css",
    "previews/style-a.html",
    "previews/style-b.html",
    "previews/style-c.html",
    "tools/yt-check.py",
    "tools/verify-deck.py",
    "tools/fetch-fonts.py",
    "tools/yt-file-test.py",
    "tools/verify.py",
    "tools/alpha-proof.py",
    ".workbuddy-ai/memory/2026-09-15.md",
    ".workbuddy-ai/memory/2026-09-16.md",
    ".workbuddy-ai/memory/2026-09-17.md",
]

# Berkas di luar folder proyek (memori pengguna dan skill), path absolut.
ABS_FILES = [
    pathlib.Path.home() / ".workbuddy-ai/MEMORY.md",
    pathlib.Path.home() / ".workbuddy-ai/skills/qr-code-generate-verify/SKILL.md",
]

# Pengecualian yang tidak boleh diserahkan ke heuristik.
# Kunci: (berkas, nomor baris) -> (potongan lama, potongan baru)
OVERRIDES = {
    ("content/verified-data.md", 64): ("| \u2014 |", "| n/a |"),
    ("worklog.md", 305): ("di-screenshot \u2014 DOM iframe", "di-screenshot: DOM iframe"),
    ("worklog.md", 216): ("SEMPURNA** \u2014", "SEMPURNA**:"),
    ("worklog.md", 524): ("jadi ini dibiarkan \u2014", "jadi ini dibiarkan,"),
    ("worklog.md", 550): ("berubah sendiri \u2014", "berubah sendiri,"),
    ("tools/yt-check.py", 63): ("[:60]}  \u2014  {", "[:60]}  \u00b7  {"),
    # sel tabel mockup yang memang kosong: tanda pisah di sini berarti
    # "tidak ada nilai", jadi ditulis apa adanya
    ("previews/style-a.html", 273): ("<span>\u2014</span>", "<span>n/a</span>"),
    ("previews/style-a.html", 274): ("<span>\u2014</span>", "<span>n/a</span>"),
    ("previews/style-a.html", 275): ("<span>\u2014</span>", "<span>n/a</span>"),
    # judul yang sudah punya titik dua sendiri; titik tengah lebih enak dibaca
    ("C:/Users/Arya Rizky/.workbuddy-ai/MEMORY.md", 37):
        ("Dua Arus \u2014 LIVE", "Dua Arus \u00b7 LIVE"),
    ("C:/Users/Arya Rizky/.workbuddy-ai/MEMORY.md", 74):
        ("Melo \u2014 DIBATALKAN", "Melo \u00b7 DIBATALKAN"),
}


SEP_RE = re.compile(r"[ \t]*\u2014[ \t]*")


def pick_replacement(line, next_text):
    """Pilih pengganti: judul dapat titik dua, label pendek dapat titik tengah,
    sisanya koma."""
    if line.lstrip().startswith("#"):
        return ": "
    head = next_text.lstrip(" \t")
    if head and (head[0].isupper() or head[0].isdigit() or head[0] in "[\"'"):
        return " \u00b7 "
    return ", "


def all_files():
    """Berkas dalam proyek plus berkas absolut di luar proyek."""
    out = [ROOT / rel for rel in FILES]
    out += ABS_FILES
    return [p for p in out if p.exists()]


def transform(path, dry):
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    try:
        rel = path.relative_to(ROOT).as_posix()
    except ValueError:
        rel = path.as_posix()  # di luar proyek, pakai path absolut
    changes = []

    for i, line in enumerate(lines, 1):
        if EM not in line:
            continue
        key = (rel, i)
        if key in OVERRIDES:
            old, new = OVERRIDES[key]
            if line.count(old) != 1:
                raise SystemExit(f"{rel} L{i}: override '{old}' ketemu {line.count(old)} kali")
            lines[i - 1] = line.replace(old, new, 1)
            changes.append((i, line, lines[i - 1]))
            continue
        # ganti dari kanan ke kiri supaya indeks tidak bergeser
        out = line
        for m in reversed(list(SEP_RE.finditer(line))):
            out = out[: m.start()] + pick_replacement(line, line[m.end():]) + out[m.end():]
        lines[i - 1] = out
        changes.append((i, line, out))

    if not dry:
        path.write_text("\n".join(lines), encoding="utf-8")
    return changes


def main():
    dry = "--dry" in sys.argv
    apply_mode = "--apply" in sys.argv

    if not dry and not apply_mode:
        total = 0
        for p in all_files():
            n = p.read_text(encoding="utf-8").count(EM)
            total += n
            if n:
                print(f"{n:4d}  {p}")
        print(f"{total:4d}  TOTAL")
        return 0

    total = 0
    for p in all_files():
        for lineno, before, after in transform(p, dry):
            total += 1
            if dry:
                print(f"--- {p.name} L{lineno}")
                print(f"  -  {before.strip()[:110]}")
                print(f"  +  {after.strip()[:110]}")
    print(f"\n{total} penggantian {'direncanakan' if dry else 'diterapkan'}")

    if not dry:
        for p in all_files():
            if EM in p.read_text(encoding="utf-8"):
                print(f"MASIH ADA EM DASH: {p}")
                return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
