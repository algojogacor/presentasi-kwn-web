"""Cari elemen apa yang berada di titik tertentu sebuah slide.

Dipakai untuk melacak garis atau kotak yang muncul tanpa jelas asalnya:
`elementsFromPoint` mengembalikan seluruh lapisan di titik itu, dari yang
paling atas, lengkap dengan latar, tebal garis, dan tingginya.

Pakai:
  python tools/probe-el.py 18 300,168 400,170 500,172
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    slide_no = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    pts = []
    for a in sys.argv[2:]:
        x, y = a.split(",")
        pts.append((int(x), int(y)))
    if not pts:
        pts = [(300, 170), (400, 170), (500, 170)]

    url = (ROOT / "index.html").resolve().as_uri()
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True, args=[
            "--use-gl=angle", "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
            "--allow-file-access-from-files"])
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
        p = ctx.new_page()
        p.goto(url, wait_until="load")
        p.wait_for_timeout(2500)
        p.evaluate("""(n) => {
          const d = document.getElementById('deck');
          const s = document.querySelectorAll('.slide')[n - 1];
          d.style.scrollBehavior = 'auto';
          d.scrollTop = s.offsetTop;
        }""", slide_no)
        p.wait_for_timeout(1600)

        res = p.evaluate("""(pts) => {
          const out = [];
          for (const [x, y] of pts) {
            const els = document.elementsFromPoint(x, y).slice(0, 5).map(e => {
              const cs = getComputedStyle(e);
              const r = e.getBoundingClientRect();
              return (e.tagName + '.' + (e.className || '')).toString().slice(0, 46)
                + ' | bg=' + cs.backgroundColor
                + ' | bd-top=' + cs.borderTopWidth + ' ' + cs.borderTopColor
                + ' | h=' + Math.round(r.height)
                + ' | y=' + Math.round(r.top) + '..' + Math.round(r.bottom);
            });
            out.push(x + ',' + y + '\\n    ' + els.join('\\n    '));
          }
          return out;
        }""", pts)
        for r in res:
            print(r)
            print("-" * 70)
        b.close()


if __name__ == "__main__":
    main()
