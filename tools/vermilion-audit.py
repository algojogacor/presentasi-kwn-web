"""
vermilion-audit.py: daftar semua elemen yang warna teksnya masih memakai
`--vermilion` mentah, beserta ukuran huruf dan slide-nya.

Dipakai untuk memastikan hanya teks BERUKURAN BESAR yang boleh memakai
`--vermilion`. Ambang WCAG: teks besar (>=24px, atau >=18,66px tebal) hanya
butuh 3:1, sedangkan teks kecil butuh 4,5:1, dan `--vermilion` cuma sampai
sekitar 4,4:1 di latar paling terang sekalipun.

Pakai:
  python tools/vermilion-audit.py
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    url = (ROOT / "index.html").resolve().as_uri()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--use-gl=angle", "--use-angle=swiftshader",
                  "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
                  "--allow-file-access-from-files"],
        )
        ctx = browser.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
        page = ctx.new_page()
        page.goto(url, wait_until="load")
        page.wait_for_timeout(2500)

        rows = page.evaluate("""() => {
          const out = [];
          document.querySelectorAll('.slide').forEach((s, si) => {
            s.querySelectorAll('*').forEach(e => {
              const cs = getComputedStyle(e);
              if (cs.color !== 'rgb(195, 59, 34)') return;
              let hasText = false;
              for (const n of e.childNodes)
                if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
              if (!hasText) return;
              const r = e.getBoundingClientRect();
              if (r.width < 2) return;
              out.push({
                slide: si + 1,
                cls: (e.className || e.tagName).toString(),
                size: parseFloat(cs.fontSize),
                weight: cs.fontWeight,
                text: e.textContent.trim().slice(0, 30)
              });
            });
          });
          return out;
        }""")

        print(f"{'slide':>5} {'px':>6} {'tebal':>6}  {'ambang':>7}  elemen")
        print("-" * 78)
        small = []
        for r in rows:
            big = r["size"] >= 24 or (r["size"] >= 18.66 and int(r["weight"]) >= 700)
            need = "3,0" if big else "4,5"
            if not big:
                small.append(r)
            print(f"{r['slide']:5d} {r['size']:6.1f} {r['weight']:>6}  {need:>7}  "
                  f"{r['cls'][:28]:28s} | {r['text']}")

        print(f"\n{len(rows)} elemen teks memakai --vermilion.")
        if small:
            print(f"{len(small)} di antaranya teks kecil, dan itu tidak boleh:")
            for r in small:
                print(f"  slide {r['slide']} {r['cls']} {r['size']}px")
        else:
            print("Semuanya teks besar. Aman.")
        return 1 if small else 0


if __name__ == "__main__":
    sys.exit(main())
