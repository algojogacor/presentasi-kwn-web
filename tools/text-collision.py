#!/usr/bin/env python3
"""Cari pasangan TEKS yang saling menimpa di area bawah viewport.

Mengukur semua node teks yang terlihat lewat Range API, lalu melaporkan
pasangan yang kotak glyph-nya beririsan. Dipakai untuk menemukan pelanggaran
R-03 yang tidak terlihat dari pengukuran kotak layout biasa.
"""
import pathlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").resolve().as_uri()

JS = """(zoneBottom) => {
  const W = window.innerWidth, H = window.innerHeight;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const items = [];
  let node;
  while ((node = walker.nextNode())) {
    const txt = node.textContent.trim();
    if (!txt) continue;
    const el = node.parentElement;
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
    const r = document.createRange();
    r.selectNodeContents(node);
    let k = 0;
    for (const rect of r.getClientRects()) {
      if (rect.width < 4 || rect.height < 4) continue;
      if (rect.top < H - zoneBottom) continue;
      items.push({
        id: items.length, owner: node, line: k++,
        t: txt.slice(0, 30), cls: String(el.className).slice(0, 24),
        x1: rect.left, x2: rect.right, y1: rect.top, y2: rect.bottom,
      });
    }
  }
  const hits = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      // satu node teks yang membungkus jadi beberapa baris bukan tabrakan
      if (a.owner === b.owner) continue;
      // elemen yang saling bersarang bukan tabrakan
      if (a.owner.parentElement && a.owner.parentElement.contains(b.owner)) continue;
      if (b.owner.parentElement && b.owner.parentElement.contains(a.owner)) continue;
      const ox = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
      const oy = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
      if (ox > 3 && oy > 3) {
        hits.push({ a: a.t, acls: a.cls, b: b.t, bcls: b.cls,
                    ox: Math.round(ox), oy: Math.round(oy) });
      }
    }
  }
  return { total: items.length, hits };
}"""


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True)
        for w, h in [(1600, 900), (900, 600), (390, 844)]:
            ctx = b.new_context(viewport={"width": w, "height": h})
            p = ctx.new_page()
            p.goto(URL, wait_until="domcontentloaded", timeout=60000)
            p.wait_for_timeout(2200)
            d = p.evaluate(JS, 220)
            ctx.close()
            print(f"--- {w}x{h} --- {d['total']} node teks di zona bawah, "
                  f"{len(d['hits'])} pasangan bertabrakan")
            for hit in d["hits"][:8]:
                print(f"    '{hit['a']}' [{hit['acls']}]  x  '{hit['b']}' [{hit['bcls']}]"
                      f"   tumpang {hit['ox']}x{hit['oy']}px")
        b.close()


if __name__ == "__main__":
    main()
