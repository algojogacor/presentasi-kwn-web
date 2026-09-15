"""Uji apakah facade video benar-benar bisa memutar, via file:// dan via http://."""
import pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = 8789
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
                       cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2.5)
CASES = [("file", (ROOT / "index.html").resolve().as_uri()),
         ("http", f"http://127.0.0.1:{PORT}/index.html")]
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True, args=["--allow-file-access-from-files"])
        for label, url in CASES:
            ctx = b.new_context(locale="id-ID", viewport={"width": 1600, "height": 900})
            p = ctx.new_page()
            p.goto(url, wait_until="load", timeout=60000); p.wait_for_timeout(2500)
            p.evaluate("()=>{const d=document.getElementById('deck');d.style.scrollBehavior='auto';d.scrollTop=3*d.clientHeight;d.style.scrollBehavior='';}")
            p.wait_for_timeout(1200)
            p.click(".slide:nth-of-type(4) .video")
            p.wait_for_timeout(7000)
            src = p.evaluate("()=>{const f=document.querySelector('.slide:nth-of-type(4) .video iframe');return f?f.src:null}")
            # baca status dari dalam frame (same-origin tidak mungkin; pakai judul frame)
            title = p.evaluate("""()=>{const f=document.querySelector('.slide:nth-of-type(4) .video iframe');
                return f?f.getAttribute('title'):null}""")
            print(f"[{label}] iframe src = {src}")
            print(f"[{label}] frame title = {title}")
            ctx.close()
        b.close()
finally:
    srv.terminate()
