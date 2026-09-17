"""
bg-exact.py: ukur latar di belakang teks TANPA pencemaran piksel huruf.

`contrast-live.py` mengambil median dari kotak elemen. Untuk teks kecil dan
rapat (mis. "Lembar 14 / 22" pada 11,5 px dengan tracking lebar), piksel huruf
bisa cukup banyak sehingga median ikut tertarik ke warna teks. Alat ini
mengulang pengukuran dengan `color:transparent`, jadi yang tersisa hanya latar.

Alat ini menyisir SEMUA slide pada empat titik yang paling sering dipakai teks
sekunder: header kiri, header kanan, footer kiri, footer kanan. Dari situ
didapat latar TERBURUK, dan itu yang dipakai untuk menentukan nilai `--muted`
baru (hue dan saturasi dipertahankan, terang diturunkan sampai lolos).

Pakai:
  python tools/bg-exact.py
"""
import colorsys
import pathlib
import struct
import statistics
import sys
import zlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
W, H = 1600, 900

SPOTS = [
    ("hdr kiri", ".hdr > div:first-child"),
    ("hdr kanan", ".hdr-r"),
    ("ftr kiri", ".ftr > div:first-child"),
    ("ftr kanan", ".ftr .babak"),
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


def lum(rgb):
    v = []
    for c in rgb:
        c = c / 255
        v.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = v
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hexs(rgb):
    return "#%02X%02X%02X" % rgb


def main():
    url = (ROOT / "index.html").resolve().as_uri()
    samples = []

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
        page.evaluate("""() => {
          document.getElementById('deck').style.scrollBehavior = 'auto';
          document.querySelectorAll('.hint,.dots,.rosettes').forEach(e => e.style.display='none');
        }""")

        total = page.evaluate("() => document.querySelectorAll('.slide').length")
        for i in range(total):
            page.evaluate(f"""() => {{
              const d = document.getElementById('deck');
              d.scrollTop = document.querySelectorAll('.slide')[{i}].offsetTop;
            }}""")
            page.wait_for_timeout(420)
            for label, sel in SPOTS:
                el = page.evaluate_handle(
                    "(s) => { const d = document.getElementById('deck');"
                    " const act = [...document.querySelectorAll('.slide')]"
                    "   .find(x => Math.abs(x.getBoundingClientRect().top) < 4);"
                    " return act ? act.querySelector(s) : null; }", sel)
                node = el.as_element()
                if not node:
                    continue
                box = node.bounding_box()
                if not box or box["width"] < 2 or box["height"] < 2:
                    continue
                x, y = max(0, box["x"]), max(0, box["y"])
                cw = min(box["width"], W - x)
                ch = min(box["height"], H - y)
                if cw < 2 or ch < 2:
                    continue
                node.evaluate("e => e.style.color = 'transparent'")
                bg = median_rgb(page.screenshot(clip={"x": x, "y": y, "width": cw, "height": ch}))
                node.evaluate("e => e.style.color = ''")
                samples.append((i + 1, label, bg))

        browser.close()

    print(f"{len(samples)} titik latar diukur dari seluruh slide.\n")
    print("Sepuluh latar TERGELAP (paling berat untuk teks):")
    for s in sorted(samples, key=lambda t: lum(t[2]))[:10]:
        print(f"  slide {s[0]:2d}  {s[1]:10s} {hexs(s[2])}  L={lum(s[2]):.4f}")

    worst = min(samples, key=lambda t: lum(t[2]))
    print(f"\nLatar terburuk: slide {worst[0]} {worst[1]} {hexs(worst[2])}")

    # ---- cari nilai --muted baru
    for target in (4.50, 4.65, 4.80):
        need = (lum(worst[2]) + 0.05) / target - 0.05
        h, l, s = colorsys.rgb_to_hls(0x8B / 255, 0x81 / 255, 0x75 / 255)
        cand = None
        for i in range(1, 1200):
            ll = l * (1 - i / 1200)
            r, g, b = colorsys.hls_to_rgb(h, ll, s)
            rgb = (round(r * 255), round(g * 255), round(b * 255))
            if lum(rgb) <= need:
                cand = rgb
                break
        print(f"\nagar {target:.2f}:1 di latar terburuk -> luminans <= {need:.5f}")
        print(f"  kandidat --muted = {hexs(cand)}  (hue tetap 33 derajat)")

    print(f"\nPembanding: --ink-3 #5C564A di latar terburuk = "
          f"{ratio((0x5C, 0x56, 0x4A), worst[2]):.2f}:1")
    return 0


if __name__ == "__main__":
    sys.exit(main())
