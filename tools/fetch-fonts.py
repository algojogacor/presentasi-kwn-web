"""
fetch-fonts.py · Unduh font dari Google Fonts dan simpan lokal sebagai woff2.

Kenapa self-host: kalau wifi kampus mati, deck harus tetap tampil sempurna.
Hanya subset `latin` yang diambil (konten berbahasa Indonesia).

Output:
  assets/fonts/*.woff2
  assets/fonts/fonts.css
"""
import re, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "assets" / "fonts"
FONT_DIR.mkdir(parents=True, exist_ok=True)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")

CSS_URL = (
    "https://fonts.googleapis.com/css2"
    "?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,700;0,6..96,900;1,6..96,400"
    "&family=Manrope:wght@400;500;600"
    "&family=Space+Mono:wght@400;700"
    "&display=swap"
)


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        data = r.read()
    return data if binary else data.decode("utf-8")


def main():
    css = fetch(CSS_URL)
    print(f"CSS diterima: {len(css)} byte")

    # Pisahkan blok @font-face beserta komentar subset di depannya
    pattern = re.compile(
        r"/\*\s*(?P<subset>[\w\-]+)\s*\*/\s*@font-face\s*\{(?P<body>[^}]+)\}",
        re.S,
    )

    out_rules = []
    count = 0

    for m in pattern.finditer(css):
        subset = m.group("subset")
        if subset != "latin":
            continue

        body = m.group("body")
        family = re.search(r"font-family:\s*'([^']+)'", body).group(1)
        style = re.search(r"font-style:\s*(\w+)", body).group(1)
        weight = re.search(r"font-weight:\s*([\d\s]+)", body).group(1).strip()
        url = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)

        fname = f"{family.replace(' ', '')}-{weight}-{style}.woff2"
        dest = FONT_DIR / fname
        if not dest.exists():
            dest.write_bytes(fetch(url, binary=True))
        size = dest.stat().st_size
        count += 1
        print(f"  {fname:38s} {size/1024:7.1f} KB")

        out_rules.append(
            "@font-face{"
            f"font-family:'{family}';font-style:{style};font-weight:{weight};"
            "font-display:swap;"
            f"src:url('{fname}') format('woff2');"
            "}"
        )

    (FONT_DIR / "fonts.css").write_text(
        "/* Font lokal, dihasilkan oleh tools/fetch-fonts.py. Jangan diedit manual. */\n"
        + "\n".join(out_rules) + "\n",
        encoding="utf-8",
    )
    print(f"\n{count} berkas font tersimpan di {FONT_DIR}")
    print(f"fonts.css: {len(out_rules)} @font-face")


if __name__ == "__main__":
    main()
