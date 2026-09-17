#!/usr/bin/env python3
"""Ukur presisi tabrakan antara .hint (fixed, bawah tengah) dan .ftr (footer slide).

.hint berisi "← → atau scroll untuk berpindah" dan diposisikan fixed di
bawah layar. Di viewport sempit ia jatuh tepat di atas footer slide.
"""
import pathlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").resolve().as_uri()
SHOTS = ROOT / "shots" / "audit"

JS = """() => {
  const h = document.querySelector('.hint');
  const f = document.querySelector('#deck > section:nth-child(1) .ftr');
  if (!h || !f) return null;
  const rh = h.getBoundingClientRect(), rf = f.getBoundingClientRect();
  const ox = Math.min(rh.right, rf.right) - Math.max(rh.left, rf.left);
  const oy = Math.min(rh.bottom, rf.bottom) - Math.max(rh.top, rf.top);
  return {
    hint: { x1: Math.round(rh.left), x2: Math.round(rh.right),
            y1: Math.round(rh.top), y2: Math.round(rh.bottom) },
    ftr:  { x1: Math.round(rf.left), x2: Math.round(rf.right),
            y1: Math.round(rf.top), y2: Math.round(rf.bottom) },
    ox: Math.round(ox), oy: Math.round(oy),
    collide: ox > 1 && oy > 1,
  };
}"""


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True)
        for w, h in [(1600, 900), (1200, 750), (1024, 768), (900, 600),
                     (768, 1024), (600, 900), (390, 844)]:
            ctx = b.new_context(viewport={"width": w, "height": h})
            p = ctx.new_page()
            p.goto(URL, wait_until="domcontentloaded", timeout=60000)
            p.wait_for_timeout(1800)
            d = p.evaluate(JS)
            if w == 390:
                p.add_style_tag(content=".hint{outline:2px solid magenta}")
                p.screenshot(path=str(SHOTS / "hint_vs_ftr_390.png"))
            ctx.close()
            if not d:
                print(f"{w:>5}px : .hint atau .ftr tidak ditemukan")
                continue
            verdict = (f"BERTABRAKAN {d['ox']}x{d['oy']}px" if d["collide"]
                       else "aman")
            print(f"{w:>5}px : .hint y {d['hint']['y1']}-{d['hint']['y2']}  "
                  f".ftr y {d['ftr']['y1']}-{d['ftr']['y2']}  -> {verdict}")
        b.close()


if __name__ == "__main__":
    main()
