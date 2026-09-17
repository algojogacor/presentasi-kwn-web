"""Ambil tangkapan satu slide untuk pemeriksaan mata.

Pakai:
  python tools/shot-slide.py 5 1600x900
  python tools/shot-slide.py 5 390x844
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "shots"
OUT.mkdir(exist_ok=True)


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    vp = sys.argv[2] if len(sys.argv) > 2 else "1600x900"
    w, h = (int(x) for x in vp.lower().split("x"))
    url = (ROOT / "index.html").resolve().as_uri()
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True, args=[
            "--use-gl=angle", "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
            "--allow-file-access-from-files"])
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
        page = ctx.new_page()
        page.goto(url, wait_until="load")
        page.wait_for_timeout(2200)
        page.evaluate("""(n) => {
          const d = document.getElementById('deck');
          const s = document.querySelectorAll('.slide')[n-1];
          d.style.scrollBehavior = 'auto';
          d.scrollTop = s.offsetTop;
        }""", n)
        page.wait_for_timeout(1400)
        p = OUT / f"slide-{n:02d}-{w}x{h}.png"
        page.screenshot(path=str(p))
        print("OK ->", p)
        b.close()


if __name__ == "__main__":
    main()
