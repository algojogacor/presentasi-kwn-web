#!/usr/bin/env python3
"""Ukur apakah anak-anak .ftr saling tumpang tindih pada berbagai lebar viewport.

Dipakai untuk membuktikan pelanggaran R-03 (teks bertabrakan di layar sempit).
"""
import pathlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").resolve().as_uri()

WIDTHS = [(1600, 900), (1200, 750), (1100, 700), (1024, 768),
          (1000, 650), (900, 600), (768, 1024), (600, 900), (390, 844)]

JS = """() => {
  const f = document.querySelector('#deck > section:nth-child(1) .ftr');
  if (!f) return null;
  return [...f.children].map(c => {
    const r = c.getBoundingClientRect();
    return { t: c.textContent.trim().slice(0, 30),
             x1: Math.round(r.left), x2: Math.round(r.right) };
  });
}"""


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True)
        for w, h in WIDTHS:
            ctx = b.new_context(viewport={"width": w, "height": h})
            p = ctx.new_page()
            p.goto(URL, wait_until="domcontentloaded", timeout=60000)
            p.wait_for_timeout(1500)
            kids = p.evaluate(JS)
            ctx.close()
            if not kids or len(kids) < 2:
                print(f"{w:>5}px : footer tidak ketemu")
                continue
            a, c = kids[0], kids[1]
            gap = c["x1"] - a["x2"]
            status = f"TUMPANG TINDIH {abs(gap)}px" if gap < 0 else f"aman, jarak {gap}px"
            print(f"{w:>5}px : '{a['t'][:24]}' [{a['x1']}-{a['x2']}]"
                  f"  vs  [{c['x1']}-{c['x2']}]  -> {status}")
        b.close()


if __name__ == "__main__":
    main()
