#!/usr/bin/env python3
"""Ukur luas TEKS sebenarnya di .ftr, bukan kotak flex-nya.

getBoundingClientRect() pada anak flex hanya mengembalikan kotak layout. Kalau
teks meluber keluar kotak (tidak membungkus, atau lebih lebar dari kolomnya),
kotaknya tetap terlihat "aman" padahal glyph-nya bertabrakan. Probe ini memakai
Range API untuk mengukur tepi glyph yang sesungguhnya.
"""
import pathlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").resolve().as_uri()
SHOTS = ROOT / "shots" / "audit"

WIDTHS = [(1600, 900), (1024, 768), (900, 600), (768, 1024), (600, 900), (390, 844)]

JS = """() => {
  const f = document.querySelector('#deck > section:nth-child(1) .ftr');
  if (!f) return null;
  return [...f.children].map(c => {
    const box = c.getBoundingClientRect();
    const r = document.createRange();
    r.selectNodeContents(c);
    const t = r.getBoundingClientRect();
    const cs = getComputedStyle(c);
    return {
      text: c.textContent.trim().slice(0, 26),
      boxL: Math.round(box.left), boxR: Math.round(box.right),
      txL: Math.round(t.left), txR: Math.round(t.right),
      nowrap: cs.whiteSpace,
      lines: Math.round(t.height / parseFloat(cs.lineHeight || 14)),
    };
  });
}"""


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True)
        for w, h in WIDTHS:
            ctx = b.new_context(viewport={"width": w, "height": h})
            p = ctx.new_page()
            p.goto(URL, wait_until="domcontentloaded", timeout=60000)
            p.wait_for_timeout(1500)
            kids = p.evaluate(JS)
            if w == 390:
                p.screenshot(path=str(SHOTS / "ftr_390.png"))
            ctx.close()
            if not kids or len(kids) < 2:
                print(f"{w:>5}px : footer tidak ketemu")
                continue
            a, c = kids[0], kids[1]
            overlap = a["txR"] - c["txL"]
            status = (f"TEKS BERTABRAKAN {overlap}px" if overlap > 0
                      else f"aman, jarak {abs(overlap)}px")
            print(f"{w:>5}px : teks kiri {a['txL']}-{a['txR']} ({a['lines']} baris, "
                  f"{a['nowrap']})  vs  teks kanan {c['txL']}-{c['txR']}  -> {status}")
        b.close()


if __name__ == "__main__":
    main()
