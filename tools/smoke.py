"""Tes cepat: error konsol + gambar yang gagal dimuat + screenshot slide tertentu."""
import pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "shots" / "smoke"; OUT.mkdir(parents=True, exist_ok=True)
url = (ROOT / "index.html").resolve().as_uri()
TARGET = [0, 3, 11, 20, 21]   # slide 01, 04, 12, 21, 22 (0-based)
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True, args=["--use-gl=angle","--use-angle=swiftshader",
        "--enable-unsafe-swiftshader","--allow-file-access-from-files"])
    ctx = b.new_context(viewport={"width":1600,"height":900})
    p = ctx.new_page()
    errs = []
    p.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    p.on("pageerror", lambda e: errs.append(str(e)))
    p.goto(url, wait_until="load", timeout=60000); p.wait_for_timeout(3500)
    broken = p.evaluate("""()=>[...document.images]
        .filter(i=>i.complete && i.naturalWidth===0)
        .map(i=>i.getAttribute('src'))""")
    for i in TARGET:
        p.evaluate(f"()=>{{const d=document.getElementById('deck');d.style.scrollBehavior='auto';d.scrollTop={i}*d.clientHeight;d.style.scrollBehavior='';}}")
        p.wait_for_timeout(4200)
        p.screenshot(path=str(OUT / f"{i+1:02d}.png"))
        print("shot", i+1)
    print("GAMBAR GAGAL DIMUAT:", broken or "tidak ada")
    print("ERROR KONSOL:", errs[:8] or "tidak ada")
    b.close()
