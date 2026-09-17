"""Verifikasi perilaku FX: counter, transisi (frame tengah), wheel,
reduced-motion, dan mode cetak.

Pakai: py -3 tools/fx-verify.py
"""
import pathlib
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "shots" / "fx-verify"
OUT.mkdir(parents=True, exist_ok=True)
PORT = 8791
URL = f"http://127.0.0.1:{PORT}/index.html"

fails = []


def check(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name + (" · " + str(extra) if extra else ""))
    if not cond:
        fails.append(name)


def main():
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
        cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    errors = []
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(headless=True, args=[
                "--use-gl=angle", "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader"])

            # ---------- konteks normal ----------
            ctx = b.new_context(viewport={"width": 1600, "height": 900})
            p = ctx.new_page()
            p.on("console", lambda m: errors.append("CONSOLE: " + m.text) if m.type == "error" else None)
            p.on("pageerror", lambda e: errors.append("PAGEERROR: " + str(e)))
            p.goto(URL, wait_until="load", timeout=60000)
            p.wait_for_timeout(4000)

            # counter slide 05
            p.evaluate("() => FX.nav(4)")
            p.wait_for_timeout(4500)
            vals = p.evaluate("""() => [...document.querySelectorAll('.slide')[4]
                .querySelectorAll('[data-count]')].map(e => e.textContent)""")
            check("counter slide 05 selesai", vals == ["2.765,13", "1.917,6", "87,6%"], vals)

            # frame tengah transisi 05->06 (bars-shutter)
            p.evaluate("() => FX.nav(5)")
            p.wait_for_timeout(120)
            cov = p.evaluate("""() => ({
                n: document.getElementById('fx-overlay').children.length,
                busy: FX.isBusy
            })""")
            check("overlay transisi aktif", cov["n"] > 0 and cov["busy"], cov)
            p.wait_for_timeout(300)
            p.screenshot(path=str(OUT / "mid-transisi-05-06.png"))
            p.wait_for_timeout(3000)

            # wheel menavigasi
            before = p.evaluate("() => FX.current")
            p.mouse.move(800, 450)
            p.mouse.wheel(0, 240)
            p.wait_for_timeout(2600)
            after = p.evaluate("() => FX.current")
            check("wheel menavigasi maju", after == before + 1, f"{before}->{after}")

            # keyboard mundur
            p.keyboard.press("ArrowLeft")
            p.wait_for_timeout(2600)
            check("keyboard mundur", p.evaluate("() => FX.current") == before, p.evaluate("() => FX.current"))

            # lifecycle: tidak ada tween bocor dari slide yang sudah ditinggalkan
            leaks = p.evaluate("""() => {
                const s = document.querySelectorAll('.slide')[4];
                return gsap.getTweensOf(Array.from(s.querySelectorAll('*'))).length;
            }""")
            check("tween slide 05 (sudah ditinggalkan) = 0", leaks == 0, leaks)

            # cetak
            p.evaluate("() => FX.preparePrint()")
            p.wait_for_timeout(400)
            pr = p.evaluate("""() => {
                const ch = document.querySelector('.fx-ch');
                const bar = document.querySelectorAll('.slide')[5].querySelector('.bar-track i');
                return {
                    cls: document.documentElement.classList.contains('fx-print'),
                    charOp: ch ? getComputedStyle(ch).opacity : null,
                    barW: bar ? getComputedStyle(bar).width : null
                };
            }""")
            check("print: kelas fx-print", pr["cls"])
            check("print: karakter terlihat", pr["charOp"] == "1", pr["charOp"])
            check("print: bar lebar penuh", pr["barW"] not in ("0px", None), pr["barW"])
            p.screenshot(path=str(OUT / "print-state.png"))
            p.evaluate("() => FX.restorePrint()")
            p.wait_for_timeout(1500)
            check("restore print: slide hidup lagi",
                  p.evaluate("() => FX.current") == before, p.evaluate("() => FX.current"))
            ctx.close()

            # ---------- konteks reduced motion ----------
            ctx2 = b.new_context(viewport={"width": 1600, "height": 900},
                                 reduced_motion="reduce")
            p2 = ctx2.new_page()
            errs2 = []
            p2.on("pageerror", lambda e: errs2.append(str(e)))
            p2.goto(URL, wait_until="load", timeout=60000)
            p2.wait_for_timeout(2500)
            check("reduced: fx-off", not p2.evaluate(
                "() => document.documentElement.classList.contains('fx-on')"))
            p2.keyboard.press("ArrowRight")
            p2.wait_for_timeout(1200)
            check("reduced: navigasi klasik jalan",
                  p2.evaluate("() => Math.round(document.getElementById('deck').scrollTop / document.getElementById('deck').clientHeight)") == 1)
            check("reduced: tanpa error", not errs2, errs2[:3])
            p2.screenshot(path=str(OUT / "reduced-slide02.png"))
            ctx2.close()
            b.close()
    finally:
        server.terminate()

    print("\nERROR KONSOL:", len(errors))
    for e in errors[:15]:
        print(" -", e)
    print("\nGAGAL:", fails or "tidak ada")
    sys.exit(1 if (fails or errors) else 0)


if __name__ == "__main__":
    main()
