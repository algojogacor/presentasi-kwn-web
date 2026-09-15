import pathlib, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "shots" / "anim"; OUT.mkdir(parents=True, exist_ok=True)
url = (ROOT / "index.html").resolve().as_uri()
for label, wait in [("censored", 1300), ("opening", 2900)]:
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True, args=["--use-gl=angle","--use-angle=swiftshader",
            "--enable-unsafe-swiftshader","--allow-file-access-from-files"])
        ctx = b.new_context(viewport={"width":1600,"height":900})
        p = ctx.new_page(); p.goto(url, wait_until="load"); p.wait_for_timeout(2500)
        p.evaluate("()=>{const d=document.getElementById('deck');d.style.scrollBehavior='auto';d.scrollTop=21*d.clientHeight;d.style.scrollBehavior='';}")
        p.wait_for_timeout(wait)
        p.screenshot(path=str(OUT / f"t_{label}.png"), clip={"x":950,"y":330,"width":600,"height":200})
        print("ok", label)
        b.close()
