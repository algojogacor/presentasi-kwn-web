#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
fix-contrast.py: naikkan kontras teks sekunder ke WCAG AA.

Dasar keputusan (semua terukur, lihat tools/bg-exact.py dan tools/contrast-live.py):

  Latar slide bukan `--paper` murni. Lapisan atmosfer (noda tinta di shader,
  vignette, grain multiply, pita `.slide::after`) menggelapkan latar di
  belakang teks chrome. Setelah lapisan itu diturunkan sedikit, latar TERBURUK
  di belakang teks sekunder adalah #DAD2C5, bukan #F2EDE3.

  Akibatnya `--muted` #8B8175 (rasio 3,28:1 di atas kertas polos) jatuh ke
  2,37:1 di layar. Nilai itu tidak bisa diperbaiki dengan menggeser latar:
  #8B8175 bahkan hanya mencapai 3,83:1 di atas putih murni. Jadi tone itu
  memang tidak layak untuk teks kecil, dan harus dipergelap.

  `--vermilion` #C33B22 di latar terburuk hanya 3,54:1. Cukup untuk teks besar
  dan untuk elemen grafis (ambang 3:1), tidak cukup untuk teks kecil. Token
  `--vermilion-2` #9E2E19 sudah ada di deck tapi belum terpakai; itu yang
  dipakai untuk semua teks vermilion.

Pakai:
  python tools/fix-contrast.py --dry
  python tools/fix-contrast.py --apply
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGET = ROOT / "index.html"

# (baris, lama, baru)
RULES = [
    # -- token ------------------------------------------------------
    (44, "--muted:#8B8175;", "--muted:#5F5850;"),

    # -- teks vermilion -> token yang lebih gelap -------------------
    (224, ".ftr .babak{color:var(--vermilion)}", ".ftr .babak{color:var(--vermilion-2)}"),
    (233, "color:var(--vermilion);", "color:var(--vermilion-2);"),          # .eyebrow
    (262, "em.acc{font-style:italic;font-weight:400;color:var(--vermilion)}",
          "em.acc{font-style:italic;font-weight:400;color:var(--vermilion-2)}"),
    (309, "border:2px solid var(--vermilion);color:var(--vermilion);",
          "border:2px solid var(--vermilion);color:var(--vermilion-2);"),   # .stamp
    (331, "letter-spacing:.2em;color:var(--vermilion);",
          "letter-spacing:.2em;color:var(--vermilion-2);"),                 # .card .num
    (446, ".bar-row.hi .name,.bar-row.hi .val{color:var(--vermilion)}",
          ".bar-row.hi .name,.bar-row.hi .val{color:var(--vermilion-2)}"),
    (467, "font-weight:700;color:var(--vermilion);white-space:nowrap;",
          "font-weight:700;color:var(--vermilion-2);white-space:nowrap;"),  # .avgline b
    (507, ".cpi-txt.hi{fill:var(--vermilion);font-weight:700}",
          ".cpi-txt.hi{fill:var(--vermilion-2);font-weight:700}"),
    (592, ".kpi-head .vals b{color:var(--vermilion);font-weight:700;padding:0 .35em}",
          ".kpi-head .vals b{color:var(--vermilion-2);font-weight:700;padding:0 .35em}"),
    (711, 'content:" \u00b7 buka di YouTube \u2197";color:var(--vermilion);opacity:1;',
          'content:" \u00b7 buka di YouTube \u2197";color:var(--vermilion-2);opacity:1;'),
    (780, ".hint b{color:var(--vermilion);font-weight:700}",
          ".hint b{color:var(--vermilion-2);font-weight:700}"),
    (843, "color:var(--vermilion);margin-bottom:.7em;",
          "color:var(--vermilion-2);margin-bottom:.7em;"),                  # .notes h5
    (848, "font-family:var(--font-mono);font-size:var(--t-3);color:var(--vermilion);",
          "font-family:var(--font-mono);font-size:var(--t-3);color:var(--vermilion-2);"),
    # teks vermilion yang ditulis inline di markup
    (1010, "border-top:1px solid var(--rule);color:var(--vermilion);",
           "border-top:1px solid var(--rule);color:var(--vermilion-2);"),
    (2176, "text-transform:uppercase;color:var(--vermilion)",
           "text-transform:uppercase;color:var(--vermilion-2)"),
]


def main():
    dry = "--dry" in sys.argv
    lines = TARGET.read_text(encoding="utf-8").split("\n")
    problems = []
    applied = 0

    for lineno, old, new in RULES:
        idx = lineno - 1
        if idx >= len(lines):
            problems.append(f"L{lineno}: di luar jangkauan")
            continue
        n = lines[idx].count(old)
        if n != 1:
            problems.append(f"L{lineno}: '{old[:60]}' ketemu {n} kali, harus 1")
            continue
        if dry:
            print(f"L{lineno}")
            print(f"  -  {lines[idx].strip()[:120]}")
            print(f"  +  {lines[idx].replace(old, new, 1).strip()[:120]}")
        lines[idx] = lines[idx].replace(old, new, 1)
        applied += 1

    if problems:
        print("GAGAL:")
        for p in problems:
            print("  " + p)
        return 1

    if dry:
        print(f"\n{applied} perubahan direncanakan")
        return 0

    TARGET.write_text("\n".join(lines), encoding="utf-8")
    print(f"OK. {applied} perubahan diterapkan")
    return 0


if __name__ == "__main__":
    sys.exit(main())
