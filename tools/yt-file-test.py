"""
yt-file-test.py — Bisakah YouTube di-embed saat halaman dibuka lewat file:// ?

Menguji beberapa varian URL embed dari dua konteks: file:// dan http://127.0.0.1.
Hasilnya dinilai dari screenshot area player (bukan dari DOM iframe, karena
cross-origin tidak bisa dibaca).

Pakai: python tools/yt-file-test.py
"""
import asyncio, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
VID = "proAhdTWOH4"

VARIAN = {
    "nocookie": f"https://www.youtube-nocookie.com/embed/{VID}?autoplay=1&mute=1&rel=0",
    "youtube":  f"https://www.youtube.com/embed/{VID}?autoplay=1&mute=1&rel=0",
}


async def coba(pw, url, tag, outdir):
    b = await pw.chromium.launch(args=[
        "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await b.new_page(viewport={"width": 1000, "height": 620})
    errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    await pg.goto(url, wait_until="load")
    await pg.wait_for_timeout(1200)

    hasil = {}
    for nama, src in VARIAN.items():
        await pg.evaluate(
            """(src) => {
                 let f = document.getElementById('probe');
                 if (f) f.remove();
                 f = document.createElement('iframe');
                 f.id = 'probe';
                 f.src = src;
                 f.setAttribute('allow','autoplay; encrypted-media');
                 f.style.cssText = 'position:fixed;left:0;top:0;width:960px;height:540px;border:0;z-index:9999';
                 document.body.appendChild(f);
               }""", src)
        await pg.wait_for_timeout(6000)
        path = outdir / f"{tag}-{nama}.png"
        await pg.screenshot(path=str(path), clip={"x": 0, "y": 0, "width": 960, "height": 540})
        hasil[nama] = str(path)

    await b.close()
    return hasil, errs


async def main():
    outdir = ROOT / "shots" / "yt-file"
    outdir.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as pw:
        for tag, url in [("file", (ROOT / "index.html").resolve().as_uri()),
                         ("http", "http://127.0.0.1:8788/index.html")]:
            res, errs = await coba(pw, url, tag, outdir)
            print(f"[{tag}] {url}")
            for k, v in res.items():
                print(f"   {k:9s} -> {v}")
            print(f"   error konsol: {errs or 'tidak ada'}")


asyncio.run(main())
