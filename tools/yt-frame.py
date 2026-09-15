"""Ambil bingkai video lewat host page lokal (biar referrer valid, tidak Error 153)."""
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "shots" / "yt"
IDS = ["rTz_jTxitwA", "proAhdTWOH4", "Y2SvKeY1Gfw", "7Fv5eLLDkDU", "_YsXw4wKZKU"]
PORT = 8791
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
                       cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2.5)
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True)
        ctx = b.new_context(locale="id-ID", viewport={"width": 1280, "height": 720})
        p = ctx.new_page()
        for vid in IDS:
            p.goto(f"http://127.0.0.1:{PORT}/shots/yt/host.html?vid={vid}",
                   wait_until="domcontentloaded", timeout=60000)
            p.wait_for_timeout(11000)
            p.screenshot(path=str(OUT / f"frame_{vid}.png"))
            print("ok", vid)
        b.close()
finally:
    srv.terminate()
