"""
verify-deck.py · Verifikasi deck: tiap slide di-screenshot + dicek.

Yang diperiksa per slide:
  - overflow (konten lebih tinggi/lebar dari viewport slide)
  - elemen yang bocor keluar batas
  - error konsol

Pakai:
  python tools/verify-deck.py
  python tools/verify-deck.py --shot-only
"""
import sys, json, pathlib, time
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "shots" / "deck"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1600, 900
SETTLE = 4400


def main():
    shot_only = "--shot-only" in sys.argv
    url = (ROOT / "index.html").resolve().as_uri()
    problems = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--use-gl=angle", "--use-angle=swiftshader",
                  "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
                  "--allow-file-access-from-files"],
        )
        ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=1)
        page = ctx.new_page()

        errors, warnings = [], []
        page.on("console", lambda m: (
            errors.append(m.text) if m.type == "error"
            else warnings.append(m.text) if m.type == "warning" else None))
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(url, wait_until="load", timeout=60000)
        page.wait_for_timeout(2500)

        # --- Font & WebGL ---
        info = page.evaluate("""() => {
          const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight);
          const c = document.querySelector('canvas#gl');
          const gl = c && c.getContext('webgl2');
          return {
            fonts: [...new Set(loaded)],
            fontsReady: document.fonts.status,
            webgl: !!gl,
            noGl: document.documentElement.classList.contains('no-gl'),
            slides: document.querySelectorAll('.slide').length,
            rosettePaths: document.querySelectorAll('.rosette path').length
          };
        }""")
        print("=" * 72)
        print("FONT   :", ", ".join(info["fonts"]) or "(tidak ada)")
        print("        status:", info["fontsReady"])
        print("WEBGL  :", "aktif" if info["webgl"] and not info["noGl"] else "TIDAK AKTIF")
        print("SLIDE  :", info["slides"], "| jalur guilloche:", info["rosettePaths"])
        print("=" * 72)

        n = info["slides"]
        for i in range(n):
            page.evaluate(f"""() => {{
              const d = document.getElementById('deck');
              d.style.scrollBehavior = 'auto';
              d.scrollTop = {i} * d.clientHeight;
              d.style.scrollBehavior = '';
            }}""")
            page.wait_for_timeout(SETTLE)

            rep = page.evaluate("""(idx) => {
              const s = document.querySelectorAll('.slide')[idx];
              const r = s.getBoundingClientRect();
              const out = [];
              // elemen yang keluar dari batas slide
              s.querySelectorAll('*').forEach(el => {
                const cs = getComputedStyle(el);
                if (cs.display === 'none' || cs.position === 'fixed') return;
                const b = el.getBoundingClientRect();
                if (b.width === 0 || b.height === 0) return;
                const overR = b.right  - r.right;
                const overB = b.bottom - r.bottom;
                const overL = r.left - b.left;
                const overT = r.top  - b.top;
                if (overR > 3 || overB > 3 || overL > 3 || overT > 3) {
                  out.push({
                    tag: el.tagName.toLowerCase(),
                    cls: (el.className || '').toString().slice(0, 40),
                    txt: (el.textContent || '').trim().slice(0, 34),
                    over: {r: Math.round(overR), b: Math.round(overB), l: Math.round(overL), t: Math.round(overT)}
                  });
                }
              });
              return {
                n: idx + 1,
                title: (s.querySelector('h1,h2') || {}).textContent || '',
                scrollH: s.scrollHeight, clientH: s.clientHeight,
                hasIn: s.classList.contains('in'),
                overflow: s.scrollHeight > s.clientHeight + 2,
                leaked: out.slice(0, 6)
              };
            }""", i)

            flag = ""
            if rep["overflow"]:
                flag += " OVERFLOW"
                problems.append((rep["n"], "overflow", rep))
            if rep["leaked"]:
                flag += " BOCOR"
                problems.append((rep["n"], "leaked", rep))

            title = " ".join(rep["title"].split())[:52]
            print(f"{rep['n']:02d}. {title:<54s} in={str(rep['hasIn']):<5s}{flag}")
            if rep["leaked"]:
                for L in rep["leaked"]:
                    print(f"      ↳ <{L['tag']} class='{L['cls']}'> \"{L['txt']}\" {L['over']}")

            page.screenshot(path=str(OUT / f"{i+1:02d}.png"))

        print("=" * 72)
        if errors:
            print("ERROR KONSOL:")
            for e in errors[:12]:
                print("  -", e)
        else:
            print("ERROR KONSOL: tidak ada")

        wl = [w for w in warnings if "ReadPixels" not in w and "GPU stall" not in w]
        if wl:
            print("PERINGATAN:")
            for w in wl[:6]:
                print("  -", w)

        print("=" * 72)
        if problems:
            print(f"HASIL: {len(problems)} masalah ditemukan")
        else:
            print("HASIL: BERSIH, tidak ada overflow, tidak ada elemen bocor")

        browser.close()

    return 1 if (problems or errors) else 0


if __name__ == "__main__":
    sys.exit(main())
