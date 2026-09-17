"""
layout-probe.py: ukur tata letak di banyak ukuran layar, per slide.

Yang diukur, dan kenapa:

  luapan .body      selisih scrollHeight dan clientHeight. Kalau positif,
                    isi slide tidak muat dan terpotong oleh overflow:hidden.
  elemen terpotong  elemen yang kotaknya keluar dari kotak slide. Karena
                    .slide memakai overflow:hidden, elemen seperti ini tidak
                    terlihat sama sekali. `.stamp` dikecualikan: memang sengaja
                    digeser keluar tepi dan dimiringkan.
  scroll mendatar   #deck harus tidak pernah bisa digeser ke samping.
  tabrakan chrome   kotak yang tumpang tindih antar elemen tetap (.hint,
                    .ftr, .nav-mini), dan antara .nav-mini dengan isi slide.
  target sentuh     ukuran .dots button, .edit-toggle, .nav-mini .nm-btn.

Pakai:
  python tools/layout-probe.py            # ringkas, hanya masalah
  python tools/layout-probe.py --full     # tampilkan semua viewport
"""
import sys

from playwright.sync_api import sync_playwright

import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

VIEWPORTS = [
    ("1920x1080", 1920, 1080),
    ("1600x900", 1600, 900),
    ("1366x768", 1366, 768),
    ("1024x768", 1024, 768),
    ("900x600", 900, 600),
    ("768x1024", 768, 1024),
    ("390x844", 390, 844),
    ("844x390", 844, 390),
]

SETTLE = 620

PROBE_JS = """() => {
  const deck = document.getElementById('deck');
  const slides = [...document.querySelectorAll('.slide')];
  const idx = slides.findIndex(s => Math.abs(s.getBoundingClientRect().top) < 4);
  const slide = slides[idx] || slides[0];
  const sr = slide.getBoundingClientRect();

  const overflow = {
    body: slide.querySelector('.body')
      ? slide.querySelector('.body').scrollHeight - slide.querySelector('.body').clientHeight
      : 0,
    slide: slide.scrollHeight - slide.clientHeight,
  };

  // elemen yang kotaknya keluar dari kotak slide -> terpotong overflow:hidden
  const clipped = [];
  slide.querySelectorAll('*').forEach(el => {
    if (el.classList.contains('stamp')) return;       // sengaja keluar tepi
    if (el.closest('.mask') && el.tagName === 'SPAN') return;  // animasi reveal
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (parseFloat(cs.opacity) === 0) return;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const dx = Math.max(0, sr.left - r.left, r.right - sr.right);
    const dy = Math.max(0, sr.top - r.top, r.bottom - sr.bottom);
    if (dx > 1.5 || dy > 1.5) {
      clipped.push({
        sel: (el.className || el.tagName).toString().slice(0, 34),
        dx: Math.round(dx), dy: Math.round(dy),
        text: (el.textContent || '').trim().slice(0, 28)
      });
    }
  });

  const box = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
  const shown = e => e && e.width > 0 && e.height > 0;
  const overlap = (a, b) => {
    if (!shown(a) || !shown(b)) return 0;
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return (w > 0 && h > 0) ? Math.round(w) + 'x' + Math.round(h) : 0;
  };

  const hint = box('.hint'), ftr = box('.slide:nth-child(3) .ftr');
  const bar = box('.nav-mini');
  const activeFtr = box('.slide .ftr');
  const dots = box('.dots'), edit = box('.edit-toggle');
  const nmBtn = box('.nm-btn');

  // apakah bar menutupi teks di dalam slide?
  let barHits = [];
  if (shown(bar)) {
    slide.querySelectorAll('p,h1,h2,h3,h4,li,span,text').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      let hasText = false;
      for (const n of el.childNodes)
        if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
      if (!hasText) return;
      const r = el.getBoundingClientRect();
      const w = Math.min(r.right, bar.right) - Math.max(r.left, bar.left);
      const h = Math.min(r.bottom, bar.bottom) - Math.max(r.top, bar.top);
      if (w > 0 && h > 0) barHits.push({
        sel: (el.className || el.tagName).toString().slice(0, 30),
        area: Math.round(w) + 'x' + Math.round(h)
      });
    });
  }

  return {
    idx: idx + 1,
    overflow,
    clipped: clipped.slice(0, 6),
    clippedCount: clipped.length,
    hScroll: deck.scrollWidth - deck.clientWidth,
    hint_vs_ftr: overlap(hint, activeFtr),
    bar_vs_ftr: overlap(bar, activeFtr),
    hint_vs_bar: overlap(hint, bar),
    barHits,
    targets: {
      dots: dots ? Math.round(dots.width) + 'x' + Math.round(dots.height) : null,
      dotsBtn: (() => {
        const b = document.querySelector('.dots button');
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return Math.round(r.width) + 'x' + Math.round(r.height);
      })(),
      edit: edit ? Math.round(edit.width) + 'x' + Math.round(edit.height) : null,
      nmBtn: nmBtn ? Math.round(nmBtn.width) + 'x' + Math.round(nmBtn.height) : null,
    },
  };
}"""


def main():
    full = "--full" in sys.argv
    url = (ROOT / "index.html").resolve().as_uri()
    problems = 0

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--use-gl=angle", "--use-angle=swiftshader",
                  "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
                  "--allow-file-access-from-files"],
        )
        for label, w, h in VIEWPORTS:
            ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
            page = ctx.new_page()
            errs = []
            page.on("pageerror", lambda e: errs.append(str(e)))
            page.goto(url, wait_until="load")
            page.wait_for_timeout(2200)
            page.evaluate("""() => {
              const d = document.getElementById('deck');
              d.style.scrollBehavior = 'auto';
            }""")

            total = page.evaluate("() => document.querySelectorAll('.slide').length")
            rows = []
            for i in range(total):
                page.evaluate(f"""() => {{
                  const d = document.getElementById('deck');
                  d.scrollTop = document.querySelectorAll('.slide')[{i}].offsetTop;
                }}""")
                page.wait_for_timeout(SETTLE)
                rows.append(page.evaluate(PROBE_JS))

            # ringkas
            over = [(r["idx"], r["overflow"]["body"], r["overflow"]["slide"])
                    for r in rows if r["overflow"]["body"] > 1 or r["overflow"]["slide"] > 1]
            clip = [(r["idx"], r["clippedCount"]) for r in rows if r["clippedCount"]]
            hs = max(r["hScroll"] for r in rows)
            hvf = [r for r in rows if r["hint_vs_ftr"]]
            bvf = [r for r in rows if r["bar_vs_ftr"]]
            hvb = [r for r in rows if r["hint_vs_bar"]]
            barh = [(r["idx"], r["barHits"]) for r in rows if r["barHits"]]
            t = rows[0]["targets"]

            bad = bool(over or clip or hs > 0 or hvf or bvf or hvb or barh or errs)
            if bad:
                problems += 1

            print("=" * 78)
            print(f"{label}   ({'ADA MASALAH' if bad else 'bersih'})")
            print(f"  target sentuh : dots={t['dots']} btn={t['dotsBtn']} "
                  f"edit={t['edit']} navBtn={t['nmBtn']}")
            print(f"  scroll samping: {hs}px")
            if over:
                print(f"  luapan isi    : {len(over)} slide -> " +
                      ", ".join(f"#{i} body+{b}/slide+{s}" for i, b, s in over[:8]))
            else:
                print("  luapan isi    : tidak ada")
            if clip:
                print(f"  elemen terpotong: {len(clip)} slide -> " +
                      ", ".join(f"#{i}:{n}" for i, n in clip[:8]))
                for r in rows:
                    if r["clippedCount"] and (full or r["clippedCount"] >= 5):
                        for c in r["clipped"][:4]:
                            print(f"      slide {r['idx']:2d}  {c['sel']:34s} "
                                  f"dx={c['dx']} dy={c['dy']}  {c['text']}")
            else:
                print("  elemen terpotong: tidak ada")
            if hvf:
                print(f"  .hint vs .ftr : " + ", ".join(f"#{r['idx']} {r['hint_vs_ftr']}" for r in hvf))
            if bvf:
                print(f"  .nav-mini vs .ftr: " + ", ".join(f"#{r['idx']} {r['bar_vs_ftr']}" for r in bvf))
            if hvb:
                print(f"  .hint vs .nav-mini: " + ", ".join(f"#{r['idx']} {r['hint_vs_bar']}" for r in hvb))
            if barh:
                print(f"  bar menutupi teks: " + ", ".join(
                    f"#{i} {[x['area'] for x in v][:3]}" for i, v in barh[:4]))
            if errs:
                print(f"  error halaman : {errs[:2]}")

            ctx.close()

        browser.close()

    print("=" * 78)
    print(f"{len(VIEWPORTS)} viewport diperiksa, {problems} bermasalah")
    return 0


if __name__ == "__main__":
    sys.exit(main())
