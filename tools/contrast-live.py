"""
contrast-live.py: ukur kontras teks sekunder dari piksel yang benar-benar dirender.

Kenapa tidak cukup menghitung dari token warna? Karena latar slide bukan cuma
`--paper`. Ada dua gradien radial di atasnya, ada grain film dengan
`mix-blend-mode:multiply`, dan ada `.slide::after` yang menggelapkan tepi atas.
Semua itu menggeser warna latar, dan tidak satu pun terlihat kalau cuma membaca
nilai token. Terbukti: footer yang seharusnya 3,28:1 dari token, ternyata
2,67:1 di layar.

Cara kerja: untuk tiap slide, cari semua elemen yang warna teksnya sama dengan
token sekunder, lalu ambil WARNA MEDIAN dari kotak elemen itu di screenshot.
Teks adalah minoritas piksel, jadi median mendekati warna latar di belakangnya.

Pakai:
  python tools/contrast-live.py            # laporan semua
  python tools/contrast-live.py --worst    # hanya yang terburuk
"""
import pathlib
import struct
import statistics
import sys
import zlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "shots" / "kontras"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1600, 900
NAV_SETTLE = 700


# ---------------------------------------------------------------- PNG
def decode_png(data):
    """Kembalikan (w, h, pixels) dengan pixels = bytearray RGB."""
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
    if bitdepth != 8 or colortype not in (2, 6):
        raise SystemExit(f"format PNG tak terduga: depth={bitdepth} color={colortype}")
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


def median_color(png, clip):
    w, h, px, buf = decode_png(png)
    x0, y0 = max(0, int(clip[0])), max(0, int(clip[1]))
    x1, y1 = min(w, int(clip[0] + clip[2])), min(h, int(clip[1] + clip[3]))
    rs, gs, bs = [], [], []
    for y in range(y0, y1):
        row = y * w * px
        for x in range(x0, x1):
            i = row + x * px
            rs.append(buf[i])
            gs.append(buf[i + 1])
            bs.append(buf[i + 2])
    if not rs:
        return None
    return (statistics.median(rs), statistics.median(gs), statistics.median(bs))


# ------------------------------------------------------------ kontras
def rel_lum(rgb):
    vals = []
    for c in rgb:
        c = c / 255
        vals.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = vals
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = rel_lum(a), rel_lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


FIND_JS = """(colors) => {
  const out = [];
  const slides = [...document.querySelectorAll('.slide')];
  const si = slides.findIndex(s => s.getBoundingClientRect().top > -window.innerHeight/2);
  const slide = slides[si] || slides[0];
  const all = slide.querySelectorAll('*');
  let n = 0;
  for (const e of all) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const key = colors.indexOf(cs.color);
    if (key < 0) continue;
    let hasText = false;
    for (const node of e.childNodes)
      if (node.nodeType === 3 && node.textContent.trim()) hasText = true;
    if (!hasText) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    out.push({
      slide: si, token: key, color: cs.color,
      size: parseFloat(cs.fontSize),
      cls: (e.className || e.tagName).toString().slice(0, 40),
      text: e.textContent.trim().slice(0, 34),
      box: [r.x, r.y, r.width, r.height]
    });
    if (++n >= 8) break;
  }
  return out;
}"""


def main():
    only_worst = "--worst" in sys.argv
    url = (ROOT / "index.html").resolve().as_uri()
    rows = []

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

        tokens = page.evaluate("""() => {
          const s = getComputedStyle(document.documentElement);
          const names = ['--muted','--vermilion','--vermilion-2','--ink-3'];
          return names.map(n => {
            const v = s.getPropertyValue(n).trim();
            const d = document.createElement('div');
            d.style.color = v; document.body.appendChild(d);
            const rgb = getComputedStyle(d).color; d.remove();
            return [n, v, rgb];
          });
        }""")
        print("Token diuji:")
        for name, raw, rgb in tokens:
            print(f"  {name:14s} {raw:9s} -> {rgb}")
        colors = [t[2] for t in tokens]

        # pastikan dek bisa dinavigasi tanpa animasi
        page.evaluate("""() => {
          const d = document.getElementById('deck');
          d.style.scrollBehavior = 'auto';
        }""")

        total = page.evaluate("() => document.querySelectorAll('.slide').length")
        for i in range(total):
            page.evaluate(f"""() => {{
              const d = document.getElementById('deck');
              const s = document.querySelectorAll('.slide')[{i}];
              d.scrollTop = s.offsetTop;
            }}""")
            page.wait_for_timeout(NAV_SETTLE)
            found = page.evaluate(FIND_JS, colors)
            for f in found:
                clip = [max(0, f["box"][0]), max(0, f["box"][1]),
                        min(f["box"][2], W), min(f["box"][3], H)]
                png = page.screenshot(clip={"x": clip[0], "y": clip[1],
                                            "width": clip[2], "height": clip[3]})
                bg = median_color(png, [0, 0, clip[2], clip[3]])
                if not bg:
                    continue
                fg = tuple(int(v) for v in f["color"].replace("rgb(", "").replace(")", "").split(",")[:3])
                r = ratio(fg, bg)
                rows.append({
                    "slide": f["slide"] + 1, "token": tokens[f["token"]][0],
                    "cls": f["cls"], "size": f["size"], "fg": fg, "bg": bg, "r": r,
                    "text": f["text"],
                })

    rows.sort(key=lambda x: x["r"])
    shown = rows[:14] if only_worst else rows
    print(f"\n{'slide':>5} {'token':14s} {'px':>5} {'rasio':>7}  {'putusan':10s} elemen")
    print("-" * 96)
    for x in shown:
        need = 4.5
        verdict = "PASS" if x["r"] >= need else ("besar" if x["r"] >= 3.0 and x["size"] >= 24 else "FAIL")
        print(f"{x['slide']:5d} {x['token']:14s} {x['size']:5.1f} {x['r']:6.2f}:1  {verdict:10s} "
              f"{x['cls'][:24]:24s} rgb{x['fg']} di rgb{x['bg']} | {x['text']}")

    fails = [x for x in rows if x["r"] < 4.5 and not (x["size"] >= 24 and x["r"] >= 3.0)]
    print(f"\nTotal diukur: {len(rows)} | gagal 4,5:1: {len(fails)}")
    if fails:
        worst = fails[0]
        print(f"Terburuk: slide {worst['slide']} {worst['token']} {worst['cls']} "
              f"= {worst['r']:.2f}:1 (butuh 4,50)")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
