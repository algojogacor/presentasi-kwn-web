"""Smoke test sistem FX: jalankan server lokal, buka deck, navigasi lewat
FX.nav (transisi penuh), tangkap error konsol + screenshot slide kunci.

Pakai: py -3 tools/fx-smoke.py
"""
import pathlib
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "shots" / "fx-smoke"
OUT.mkdir(parents=True, exist_ok=True)
PORT = 8790
URL = f"http://127.0.0.1:{PORT}/index.html"


def main():
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
        cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    time.sleep(1.2)
    errors = []
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(headless=True, args=[
                "--use-gl=angle", "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"])
            ctx = b.new_context(viewport={"width": 1600, "height": 900})
            p = ctx.new_page()
            p.on("console", lambda m: errors.append("CONSOLE: " + m.text) if m.type == "error" else None)
            p.on("pageerror", lambda e: errors.append("PAGEERROR: " + str(e)))

            p.goto(URL, wait_until="load", timeout=60000)
            p.wait_for_timeout(5000)

            state = p.evaluate("""() => ({
                fxOn: document.documentElement.classList.contains('fx-on'),
                locked: document.getElementById('deck').classList.contains('fx-locked'),
                current: window.FX ? FX.current : null,
                gsap: !!window.gsap,
                three: !!window.THREE,
                morph: !!window.MorphSVGPlugin,
                split: !!window.SplitText,
                draw: !!window.DrawSVGPlugin,
                svgMaster: !!document.querySelector('#svMaster'),
                chars: document.querySelectorAll('.slide .fx-ch').length,
                heroCanvasVisible: getComputedStyle(document.getElementById('fx-three')).display,
            })""")
            print("STATE AWAL:", state)
            p.screenshot(path=str(OUT / "01-judul.png"))

            # navigasi beruntun dengan transisi
            targets = [(5, "06-rasio", 4200), (6, "07-layanan", 2600),
                       (15, "16-cpi", 7000), (16, "17-koin", 3000),
                       (21, "22-penutup", 7000)]
            for idx, name, wait in targets:
                p.evaluate(f"() => FX.nav({idx})")
                p.wait_for_timeout(wait)
                busy = p.evaluate("() => FX.isBusy")
                cur = p.evaluate("() => FX.current")
                print(f"slide {idx+1}: current={cur} busy={busy}")
                p.screenshot(path=str(OUT / f"{name}.png"))

            # periksa nilai akhir statistik slide 22 (counter harus selesai)
            vals = p.evaluate("""() => [...document.querySelectorAll('.slide [data-count]')]
                .map(e => e.textContent).slice(0, 6)""")
            print("NILAI COUNTER:", vals)

            # uji cetak
            p.emulate_media(media="print")
            p.wait_for_timeout(800)
            print("PRINT-CLASS:", p.evaluate("() => document.documentElement.classList.contains('fx-print')"))
            p.emulate_media(media="screen")
            p.wait_for_timeout(1200)
            print("SETELAH PRINT current=", p.evaluate("() => FX.current"))

            b.close()
    finally:
        server.terminate()

    print("\nERROR KONSOL:", len(errors))
    for e in errors[:20]:
        print(" -", e)
    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
