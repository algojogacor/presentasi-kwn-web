#!/usr/bin/env python3
"""Audit antislop untuk deck PPT_KWN.

Mengumpulkan bukti untuk gate Hard Gate (R-03, R-25, R-26, R-32, R-35):
  - overflow per slide dan bocor horizontal di banyak viewport
  - ukuran tap target elemen navigasi
  - apakah indikator fokus terlihat saat di-Tab
  - error konsol

Pakai:
    python tools/audit-antislop.py
    python tools/audit-antislop.py --url https://presentasi-kwn-web.vercel.app
"""
import argparse
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / "shots" / "audit"
SHOTS.mkdir(parents=True, exist_ok=True)

VIEWPORTS = [
    ("1920x1080 proyektor FHD", 1920, 1080),
    ("1600x900  laptop 16:9", 1600, 900),
    ("1366x768  laptop umum", 1366, 768),
    ("1280x800  laptop 16:10", 1280, 800),
    ("1024x768  proyektor 4:3", 1024, 768),
    ("900x600   jendela kecil", 900, 600),
    ("768x1024  tablet tegak", 768, 1024),
    ("390x844   ponsel", 390, 844),
]

PER_SLIDE_JS = """
() => {
  const deck = document.getElementById('deck');
  const H = deck.clientHeight, W = deck.clientWidth;
  const out = [];
  document.querySelectorAll('#deck > section').forEach((s, i) => {
    const r = s.getBoundingClientRect();
    let leak = 0, worst = '';
    s.querySelectorAll('*').forEach(el => {
      const b = el.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) return;
      const over = Math.max(b.right - W, -b.left);
      if (over > 2) { leak++; if (over > 0 && !worst) worst = el.className || el.tagName; }
    });
    out.push({
      i: i + 1,
      overflow: s.scrollHeight > s.clientHeight + 2,
      overBy: s.scrollHeight - s.clientHeight,
      leak,
      worst: String(worst).slice(0, 40),
    });
  });
  return { H, W, slides: out };
}
"""

TARGETS_JS = """
() => {
  const rows = [];
  const push = (label, el) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    rows.push({ label, w: Math.round(r.width), h: Math.round(r.height) });
  };
  push('titik navigasi (.dots button)', document.querySelector('.dots button'));
  push('tombol mode edit (.edit-toggle)', document.querySelector('.edit-toggle'));
  push('kartu video (.video)', document.querySelector('.video'));
  return rows;
}
"""

FOCUS_JS = """
() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { none: true };
  const cs = getComputedStyle(el);
  return {
    tag: el.tagName,
    cls: String(el.className).slice(0, 40),
    outlineStyle: cs.outlineStyle,
    outlineWidth: cs.outlineWidth,
    outlineColor: cs.outlineColor,
    boxShadow: cs.boxShadow === 'none' ? 'none' : 'ada',
  };
}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=None)
    args = ap.parse_args()
    url = args.url or (ROOT / "index.html").resolve().as_uri()
    print(f"URL: {url}\n")

    report = {"url": url, "viewports": [], "targets": [], "focus": [], "console": []}

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)

        for label, w, h in VIEWPORTS:
            ctx = browser.new_context(viewport={"width": w, "height": h})
            page = ctx.new_page()
            errs = []
            page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(2200)

            data = page.evaluate(PER_SLIDE_JS)
            bad = [s for s in data["slides"] if s["overflow"] or s["leak"]]
            hscroll = page.evaluate(
                "() => document.documentElement.scrollWidth > "
                "document.documentElement.clientWidth + 2")

            print(f"--- {label} ---")
            print(f"  slide bermasalah : {len(bad)} dari {len(data['slides'])}")
            if hscroll:
                print("  SCROLL HORIZONTAL: ya")
            for s in bad[:6]:
                print(f"    slide {s['i']:02d}: overflow={s['overflow']} "
                      f"(+{s['overBy']}px) bocor={s['leak']} [{s['worst']}]")
            if len(bad) > 6:
                print(f"    ... dan {len(bad) - 6} lagi")

            report["viewports"].append({
                "label": label, "w": w, "h": h,
                "bad": len(bad), "total": len(data["slides"]),
                "hscroll": hscroll,
                "detail": [{"slide": s["i"], "overBy": s["overBy"], "leak": s["leak"]}
                           for s in bad],
            })

            if w == 390:
                page.screenshot(path=str(SHOTS / "ponsel_390.png"))
            if w == 900:
                page.screenshot(path=str(SHOTS / "kecil_900.png"))

            if errs:
                report["console"].extend(errs)
            ctx.close()

        # tap target + fokus, pada viewport ponsel
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(2200)
        report["targets"] = page.evaluate(TARGETS_JS)
        print("\n--- ukuran target sentuh (viewport 390px) ---")
        for t in report["targets"]:
            verdict = "OK" if (t["w"] >= 44 and t["h"] >= 44) else "KURANG dari 44px"
            print(f"  {t['label']:34} {t['w']}x{t['h']}px  {verdict}")

        print("\n--- indikator fokus (Tab 6x) ---")
        for i in range(6):
            page.keyboard.press("Tab")
            page.wait_for_timeout(220)
            f = page.evaluate(FOCUS_JS)
            report["focus"].append(f)
            if f.get("none"):
                print(f"  Tab {i + 1}: (tidak ada elemen fokus)")
            else:
                print(f"  Tab {i + 1}: <{f['tag']} class='{f['cls']}'> "
                      f"outline={f['outlineStyle']} {f['outlineWidth']} {f['outlineColor']} "
                      f"shadow={f['boxShadow']}")
        ctx.close()
        browser.close()

    out = ROOT / "shots" / "audit" / "audit.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nlaporan mentah: {out}")
    print(f"error konsol total: {len(report['console'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
