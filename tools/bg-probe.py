"""
bg-probe.py: cari tahu apa yang menggelapkan latar di belakang teks sekunder.

Temuan yang memicu alat ini: kontras `.hdr-r` ("Lembar 14 / 22") cuma 2,37:1,
padahal dari token `--muted` di `--paper` seharusnya 3,28:1. Artinya latar yang
benar-benar dirender BUKAN `--paper`. Alat ini mematikan lapisan satu per satu
untuk menemukan penyebabnya, bukan menebaknya.

Pakai:
  python tools/bg-probe.py
"""
import pathlib
import struct
import statistics
import sys
import zlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
W, H = 1600, 900

# Titik sampel: kotak kecil di area yang tidak ada teksnya.
# Koordinat dalam piksel viewport 1600x900.
SPOTS = [
    ("header kanan (dekat .hdr-r)", 1330, 40, 60, 14),
    ("header tengah (tanpa teks)", 760, 40, 60, 14),
    ("footer kiri (dekat .ftr)", 120, 862, 60, 14),
    ("tengah slide (kosong)", 800, 470, 60, 14),
    ("kanan tengah (rosette)", 1520, 470, 40, 40),
]

CONDITIONS = [
    ("apa adanya", None),
    ("tanpa grain", ".grain{display:none !important}"),
    ("tanpa slide::after", ".slide::after{display:none !important}"),
    ("tanpa rosette", ".rosettes{display:none !important}"),
    ("tanpa grain + after", ".grain{display:none !important}.slide::after{display:none !important}"),
    ("tanpa semua lapisan",
     ".grain{display:none !important}.slide::after{display:none !important}"
     ".rosettes{display:none !important}#gl{display:none !important}"),
]


def decode_png(data):
    pos = 8
    w = h = None
    idat = b""
    bitdepth = colortype = None
    while pos < len(data):
        (ln,) = struct.unpack(">I", data[pos:pos + 4])
        typ = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            w, h, bitdepth, colortype = struct.unpack(">IIBB", body[:10])
        elif typ == b"IDAT":
            idat += body
        pos += 12 + ln
    px = 3 if colortype == 2 else 4
    raw = zlib.decompress(idat)
    stride = w * px
    prev = bytearray(stride)
    out = bytearray()
    p = 0
    for _ in range(h):
        ft = raw[p]
        p += 1
        line = bytearray(raw[p:p + stride])
        p += stride
        if ft == 1:
            for i in range(px, stride):
                line[i] = (line[i] + line[i - px]) & 0xFF
        elif ft == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ft == 3:
            for i in range(stride):
                a = line[i - px] if i >= px else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
        elif ft == 4:
            for i in range(stride):
                a = line[i - px] if i >= px else 0
                b = prev[i]
                c = prev[i - px] if i >= px else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 0xFF
        out += line
        prev = line
    return w, h, px, out


def median_rgb(png):
    w, h, px, buf = decode_png(png)
    rs, gs, bs = [], [], []
    for y in range(h):
        row = y * w * px
        for x in range(w):
            i = row + x * px
            rs.append(buf[i])
            gs.append(buf[i + 1])
            bs.append(buf[i + 2])
    return (int(statistics.median(rs)), int(statistics.median(gs)), int(statistics.median(bs)))


def main():
    url = (ROOT / "index.html").resolve().as_uri()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--use-gl=angle", "--use-angle=swiftshader",
                  "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
                  "--allow-file-access-from-files"],
        )
        ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=1)
        page = ctx.new_page()
        page.goto(url, wait_until="load")
        page.wait_for_timeout(2500)
        page.evaluate("() => { document.querySelectorAll('.hint,.dots').forEach(e => e.style.display='none'); }")

        print(f"{'kondisi':26s} " + " ".join(f"{n[:22]:>22s}" for n, *_ in SPOTS))
        print("-" * 140)
        for label, css in CONDITIONS:
            handle = page.add_style_tag(content=css) if css else None
            page.wait_for_timeout(450)
            cells = []
            for _n, x, y, w, h in SPOTS:
                png = page.screenshot(clip={"x": x, "y": y, "width": w, "height": h})
                rgb = median_rgb(png)
                cells.append(f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}")
            print(f"{label:26s} " + " ".join(f"{c:>22s}" for c in cells))
            if handle:
                handle.evaluate("e => e.remove()")
            page.wait_for_timeout(250)

        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
