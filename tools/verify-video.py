#!/usr/bin/env python3
"""Verifikasi video YouTube di deck: ID-nya benar dan videonya diputar di tempat.

Yang diperiksa per slide video:
  1. thumbnail termuat (bukan gambar rusak)
  2. klik pada facade benar-benar menyuntik <iframe>
  3. ID video di dalam iframe sama dengan yang diharapkan
  4. QR di panel kanan menunjuk URL video yang sama

Pakai:
    python tools/verify-video.py              # situs live Vercel
    python tools/verify-video.py --local      # file:// (iframe memang tidak jalan)
    python tools/verify-video.py --url <url>

Catatan: deck memakai scroll-snap dan scroll-behavior:smooth. Navigasi harus
memaksa scrollBehavior='auto' dulu, kalau tidak scrollTop diabaikan.
"""
import argparse
import pathlib
import subprocess
import sys
import tempfile
import time

import cv2
import numpy as np
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / "shots" / "video"
SHOTS.mkdir(parents=True, exist_ok=True)

LIVE = "https://presentasi-kwn-web.vercel.app"
LOCAL_PORT = 8792

# indeks slide (0-based) -> ID video yang diharapkan
TARGETS = {
    3: "kcZktSqKgNI",   # slide 04, pendapatan negara
    11: "_YsXw4wKZKU",  # slide 12, anti korupsi
}

SETTLE = 2500


def decode_qr(path):
    img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return ""
    p = cv2.copyMakeBorder(img, 60, 60, 60, 60, cv2.BORDER_CONSTANT, value=255)
    p = cv2.resize(p, None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST)
    text, _pts, _straight = cv2.QRCodeDetector().detectAndDecode(p)
    return text or ""


def goto_slide(page, i):
    page.evaluate(
        """(i) => {
             const d = document.getElementById('deck');
             d.style.scrollBehavior = 'auto';
             d.scrollTop = i * d.clientHeight;
             d.style.scrollBehavior = '';
           }""",
        i,
    )
    page.wait_for_timeout(SETTLE)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=None)
    ap.add_argument("--local", action="store_true")
    args = ap.parse_args()

    srv = None
    if args.local:
        srv = subprocess.Popen(
            [sys.executable, "-m", "http.server", str(LOCAL_PORT), "--bind", "127.0.0.1"],
            cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(2.5)
        url = f"http://127.0.0.1:{LOCAL_PORT}/index.html"
    else:
        url = args.url or LIVE

    print(f"URL: {url}")
    if args.local:
        print("MODE LOKAL: iframe memang tidak akan jalan kalau lewat file://,"
              " tapi lewat http ini tetap diuji.")

    problems = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(locale="id-ID", viewport={"width": 1600, "height": 900})
        page = ctx.new_page()
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(2500)

        for idx, want in sorted(TARGETS.items()):
            label = f"slide {idx + 1:02d} (video {want})"
            print(f"\n--- {label} ---")
            goto_slide(page, idx)

            sel = f"#deck > section:nth-child({idx + 1})"

            # 1. thumbnail
            thumb_ok = page.evaluate(
                """(sel) => {
                     const im = document.querySelector(sel + ' .video img');
                     if (!im) return 'tidak ada gambar';
                     if (!im.complete || im.naturalWidth === 0) return 'gagal muat';
                     return 'ok ' + im.naturalWidth + 'x' + im.naturalHeight;
                   }""", sel)
            print(f"  thumbnail : {thumb_ok}")
            if not thumb_ok.startswith("ok"):
                problems.append(f"{label}: thumbnail {thumb_ok}")

            # 2. klik facade -> iframe
            page.evaluate(f"document.querySelector('{sel} .video').click()")
            page.wait_for_timeout(3000)

            src = page.evaluate(
                f"(sel) => {{ const f = document.querySelector(sel + ' .video iframe');"
                f" return f ? f.src : null; }}", sel)
            if not src:
                print("  iframe    : TIDAK tersuntik")
                problems.append(f"{label}: iframe tidak tersuntik")
            else:
                print(f"  iframe    : {src[:88]}")
                if want not in src:
                    problems.append(f"{label}: iframe menunjuk video lain")
                    print("              SALAH, ID tidak cocok")

            # 3. QR
            box = page.evaluate(
                f"(sel) => {{ const im = document.querySelector(sel + ' .qr img');"
                f" if (!im) return null; const r = im.getBoundingClientRect();"
                f" return {{x:r.x, y:r.y, width:r.width, height:r.height}}; }}", sel)
            if not box or box["width"] < 8:
                print("  QR        : tidak ditemukan")
                problems.append(f"{label}: QR tidak ditemukan")
            else:
                tmp = pathlib.Path(tempfile.gettempdir()) / f"qr_probe_{idx}.png"
                page.screenshot(path=str(tmp), clip=box)
                got = decode_qr(tmp)
                want_url = f"https://youtu.be/{want}"
                if got == want_url:
                    print(f"  QR        : benar ({got})")
                else:
                    print(f"  QR        : SALAH -> {got!r}, seharusnya {want_url}")
                    problems.append(f"{label}: QR menunjuk {got!r}")

            page.screenshot(path=str(SHOTS / f"slide{idx + 1:02d}.png"))

        browser.close()

    if srv:
        srv.terminate()

    print("\n" + "=" * 68)
    print(f"ERROR KONSOL: {len(errors)}")
    for e in errors[:5]:
        print("  ", e[:110])
    if problems:
        print(f"HASIL: {len(problems)} MASALAH")
        for p in problems:
            print("  -", p)
        return 1
    print("HASIL: BERSIH, semua video dan QR sesuai")
    return 0


if __name__ == "__main__":
    sys.exit(main())
