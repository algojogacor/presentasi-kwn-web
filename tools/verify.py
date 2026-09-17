"""
verify.py · Cek preview/deck: screenshot + error konsol + status WebGL.

Pakai:
  python tools/verify.py previews/style-a.html
  python tools/verify.py previews/*.html

Output:
  shots/<nama>.png
"""
import sys, os, json, pathlib, time
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "shots"
OUT.mkdir(exist_ok=True)

W, H = 1600, 900
SETTLE_MS = 3200          # biar font & animasi selesai


def check(page_path: str):
    p = pathlib.Path(page_path)
    if not p.is_absolute():
        p = ROOT / p
    url = p.resolve().as_uri()
    name = p.stem

    report = {"file": str(p), "errors": [], "warnings": [], "webgl": None, "overflow": None}

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--use-gl=angle",
                "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
                "--ignore-gpu-blocklist",
            ],
        )
        ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=1)
        page = ctx.new_page()

        page.on("console", lambda m: (
            report["errors"].append(f"[console.{m.type}] {m.text}")
            if m.type == "error"
            else report["warnings"].append(f"[console.{m.type}] {m.text}")
            if m.type == "warning" else None
        ))
        page.on("pageerror", lambda e: report["errors"].append(f"[pageerror] {e}"))

        page.goto(url, wait_until="load", timeout=45000)
        page.wait_for_timeout(SETTLE_MS)

        # Status WebGL
        report["webgl"] = page.evaluate("""() => {
            const c = document.querySelector('canvas#gl');
            if (!c) return 'no-canvas';
            const gl = c.getContext('webgl2');
            if (!gl) return 'no-webgl2';
            const px = new Uint8Array(4);
            gl.readPixels(Math.floor(c.width/2), Math.floor(c.height/2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
            const renderer = gl.getParameter(gl.RENDERER);
            return { ok: true, renderer: renderer, centerPixel: Array.from(px) };
        }""")

        # Deteksi overflow viewport
        report["overflow"] = page.evaluate("""() => {
            const s = document.querySelector('.slide');
            if (!s) return 'no-slide';
            return {
                scrollH: s.scrollHeight, clientH: s.clientHeight,
                scrollW: s.scrollWidth, clientW: s.clientWidth,
                docScrollH: document.documentElement.scrollHeight,
                winH: window.innerHeight,
                overflowing: s.scrollHeight > s.clientHeight + 2 || s.scrollWidth > s.clientWidth + 2
            };
        }""")

        shot = OUT / f"{name}.png"
        page.screenshot(path=str(shot), full_page=False)
        report["shot"] = str(shot)
        browser.close()

    return report


def main():
    targets = sys.argv[1:]
    if not targets:
        targets = sorted(str(x) for x in (ROOT / "previews").glob("*.html"))
    allok = True
    for t in targets:
        r = check(t)
        print("=" * 68)
        print("FILE :", r["file"])
        print("SHOT :", r["shot"])
        print("WEBGL:", r["webgl"])
        print("LAYOUT:", r["overflow"])
        if r["errors"]:
            allok = False
            print("ERRORS:")
            for e in r["errors"]:
                print("   -", e)
        else:
            print("ERRORS: none")
        if r["warnings"]:
            print("WARNINGS:")
            for w in r["warnings"][:6]:
                print("   -", w)
    print("=" * 68)
    print("RESULT:", "OK" if allok else "ADA ERROR")
    return 0 if allok else 1


if __name__ == "__main__":
    sys.exit(main())
