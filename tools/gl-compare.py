"""Bandingkan satu slide dengan dan tanpa lapisan WebGL.

Gunanya untuk memisahkan mana yang berasal dari shader kertas dan mana yang
berasal dari DOM. Caranya: ambil tangkapan apa adanya, lalu sembunyikan
`canvas`, lalu ambil lagi.

Pakai:
  python tools/gl-compare.py 18
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "shots"


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
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
        }""", n)
        p.wait_for_timeout(1600)
        OUT.mkdir(exist_ok=True)
        p.screenshot(path=str(OUT / f"gl-{n:02d}-on.png"))
        p.evaluate("""() => {
          document.querySelectorAll('canvas').forEach(c => c.style.display = 'none');
        }""")
        p.wait_for_timeout(400)
        p.screenshot(path=str(OUT / f"gl-{n:02d}-off.png"))
        print("OK ->", OUT / f"gl-{n:02d}-on.png", "dan", OUT / f"gl-{n:02d}-off.png")
        b.close()


if __name__ == "__main__":
    main()
