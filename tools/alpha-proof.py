"""
alpha-proof.py — Apa yang terjadi pada canvas WebGL saat konteksnya hilang?

Warna dibikin saling berbeda supaya bisa dibedakan:
  body   : hijau   (0,255,0)
  canvas : biru    (0,0,255)   <- lewat CSS background
  isi GL : merah   (128,0,0)   <- lewat gl.clearColor + clear

Maka:
  merah  = GL masih menggambar normal
  biru   = canvas tembus pandang -> latar CSS canvas yang terlihat
  hijau  = canvas benar-benar dilewati -> latar body yang terlihat
  hitam  = canvas opaque kosong (inilah yang perlu dihindari)

Pakai: python tools/alpha-proof.py
"""
import asyncio, io
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

PAGE = """
<body style="margin:0;background:#00FF00">
<canvas id="c" style="position:fixed;inset:0;width:100%;height:100%;background:#0000FF"></canvas>
<script>
  const c = document.getElementById('c');
  const gl = c.getContext('webgl2', { alpha: __ALPHA__, antialias: false });
  if (gl) {
    gl.clearColor(0.502, 0.0, 0.0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    window.__ext = gl.getExtension('WEBGL_lose_context');
  }
</script>
</body>
"""

NAMA = {(255, 0, 0): "MERAH (GL normal)", (0, 0, 255): "BIRU (canvas tembus pandang)",
        (0, 255, 0): "HIJAU (canvas dilewati)", (128, 0, 0): "MERAH GELAP (GL normal)"}


async def mean_rgb(pg):
    a = np.asarray(Image.open(io.BytesIO(await pg.screenshot())).convert("RGB"))
    return tuple(int(v) for v in a.reshape(-1, 3).mean(axis=0).round(0))


def label(c):
    best = min(NAMA, key=lambda k: sum((a - b) ** 2 for a, b in zip(k, c)))
    if sum((a - b) ** 2 for a, b in zip(best, c)) > 9000:
        return f"lain ({c})"
    return NAMA[best]


async def probe(pw, alpha):
    b = await pw.chromium.launch(args=[
        "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await b.new_page(viewport={"width": 600, "height": 400})
    await pg.set_content(PAGE.replace("__ALPHA__", alpha))
    await pg.wait_for_timeout(500)
    before = await mean_rgb(pg)
    await pg.evaluate("() => window.__ext && window.__ext.loseContext()")
    await pg.wait_for_timeout(900)
    after = await mean_rgb(pg)
    await b.close()
    print(f"alpha={alpha:5s}")
    print(f"   sebelum konteks hilang : {before} -> {label(before)}")
    print(f"   sesudah konteks hilang : {after} -> {label(after)}")


async def main():
    async with async_playwright() as pw:
        for a in ("false", "true"):
            await probe(pw, a)


asyncio.run(main())
