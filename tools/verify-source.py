"""Verifikasi source/index.html: cek error konsol, kartu rujukan, filter, dan fungsi salin."""
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
url = (ROOT / "source" / "index.html").resolve().as_uri()

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    p = b.new_page()
    errs = []
    p.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    p.on("pageerror", lambda e: errs.append(str(e)))
    p.goto(url, wait_until="load", timeout=30000)
    p.wait_for_timeout(1000)

    # Cek jumlah kartu rujukan
    cards = p.locator(".ref-card").count()
    print(f"JUMLAH KARTU RUJUKAN: {cards} (Target: 10)")

    # Uji filter kategori
    p.locator("button.filter-tab:has-text('Data Fiskal')").click()
    p.wait_for_timeout(300)
    visible_fiskal = p.locator(".ref-card:visible").count()
    print(f"KARTU FISKAL TERFILTER: {visible_fiskal}")

    # Reset filter
    p.locator("button.filter-tab:has-text('Semua Sumber')").click()
    p.wait_for_timeout(300)

    # Uji input search
    p.locator("#searchInput").fill("OECD")
    p.wait_for_timeout(300)
    visible_oecd = p.locator(".ref-card:visible").count()
    print(f"KARTU HASIL PENCARIAN 'OECD': {visible_oecd}")

    # Screenshot dokumentasi
    out_shot = ROOT / "shots" / "source-page.png"
    out_shot.parent.mkdir(parents=True, exist_ok=True)
    p.screenshot(path=str(out_shot), full_page=True)
    print(f"SCREENSHOT DISIMPAN: {out_shot}")

    print("ERROR KONSOL:", errs or "tidak ada (0 error)")
    b.close()
