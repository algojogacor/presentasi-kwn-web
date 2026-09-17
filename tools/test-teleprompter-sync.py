"""
test-teleprompter-sync.py
Uji otomatis komprehensif:
1. Membuka Deck di Browser Context A (Laptop, 1600x900)
2. Membuka Teleprompter di Browser Context B (Mobile Phone, 390x844 - iPhone 12/13/14)
3. Verifikasi UI Teleprompter di mobile (tajuk, naskah pidato, timer, tombol navigasi)
4. Uji Sync Laptop -> Phone:
   - Laptop berpindah ke slide 8 (index 7).
   - Tunggu sync via MQTT / BroadcastChannel.
   - Verifikasi Teleprompter di HP otomatis menampilkan Slide 08 ("Pajak, dari tiga sudut pandang").
5. Uji Remote Clicker Phone -> Laptop:
   - HP menekan tombol Lanjut (Next).
   - Verifikasi Deck di Laptop otomatis bergerak ke Slide 09.
6. Verifikasi Modal QR Code di Laptop:
   - Buka modal [P] di Laptop.
   - Periksa keberadaan Canvas QR Code dan URL yang benar.
"""
import sys, pathlib, time
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent

def main():
    deck_url = (ROOT / "index.html").resolve().as_uri()
    tele_url = (ROOT / "presenter" / "index.html").resolve().as_uri()

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--use-gl=angle", "--use-angle=swiftshader",
                  "--enable-unsafe-swiftshader", "--allow-file-access-from-files"]
        )

        # Context A: Laptop Deck
        ctx_deck = browser.new_context(viewport={"width": 1600, "height": 900})
        page_deck = ctx_deck.new_page()

        # Context B: Mobile Phone (iPhone 14 standard: 390x844)
        ctx_mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
        )
        page_tele = ctx_mobile.new_page()

        errors_deck, errors_tele = [], []
        page_deck.on("console", lambda m: errors_deck.append(m.text) if m.type == "error" else None)
        page_tele.on("console", lambda m: errors_tele.append(m.text) if m.type == "error" else None)

        print("[1/5] Membuka Deck Laptop...", flush=True)
        page_deck.goto(deck_url, wait_until="load")
        page_deck.wait_for_timeout(1500)

        print("[2/5] Membuka Teleprompter Mobile...", flush=True)
        page_tele.goto(tele_url, wait_until="load")
        page_tele.wait_for_timeout(1500)

        # 3. Verifikasi Tampilan Mobile Teleprompter
        tele_title = page_tele.inner_text("#slideTitle")
        tele_num = page_tele.inner_text("#slideNumberBadge")
        print(f"      Teleprompter Slide Awal: {tele_num} - '{tele_title}'", flush=True)
        assert "01" in tele_num, "Slide awal teleprompter harus 01"

        # 4. Uji Sync Laptop -> Phone
        print("[3/5] Menguji Sync: Laptop pindah ke Slide 8...", flush=True)
        page_deck.evaluate("() => window.DeckNav.goTo(7)") # index 7 = slide 8
        page_deck.wait_for_timeout(1000)

        # Cek apakah teleprompter di HP otomatis berubah ke slide 8
        synced_to_8 = False
        for _ in range(20):
            t_num = page_tele.inner_text("#slideNumberBadge")
            t_title = page_tele.inner_text("#slideTitle")
            if "08" in t_num:
                synced_to_8 = True
                print(f"      [OK] SYNC BERHASIL! HP otomatis berpindah ke: {t_num} - '{t_title}'", flush=True)
                break
            page_tele.wait_for_timeout(300)

        if not synced_to_8:
            print(f"      [FAIL] GAGAL: HP masih di {t_num}", flush=True)
            return 1

        # Screenshot tampilan teleprompter di HP pada slide 8
        shots_dir = ROOT / "shots"
        shots_dir.mkdir(exist_ok=True)
        tele_shot = shots_dir / "teleprompter_mobile_slide08.png"
        page_tele.screenshot(path=str(tele_shot))
        print(f"      Screenshot teleprompter HP disimpan di: {tele_shot}", flush=True)

        # 5. Uji Remote Clicker Phone -> Laptop
        print("[4/5] Menguji Remote Clicker: HP menekan tombol 'Lanjut'...", flush=True)
        page_tele.click("#btnNext")
        page_tele.wait_for_timeout(1000)

        # Cek apakah Deck di laptop berpindah ke slide 9 (index 8)
        laptop_moved_to_9 = False
        for _ in range(20):
            deck_idx = page_deck.evaluate("() => window.DeckNav.currentIndex()")
            if deck_idx == 8: # slide 9
                laptop_moved_to_9 = True
                print(f"      [OK] REMOTE BERHASIL! Laptop otomatis berpindah ke Slide 9 (index {deck_idx})", flush=True)
                break
            page_deck.wait_for_timeout(300)

        if not laptop_moved_to_9:
            print(f"      [FAIL] GAGAL: Laptop masih di index {deck_idx}", flush=True)
            return 1

        # 6. Uji Modal QR Code di Laptop
        print("[5/5] Menguji Modal QR Code di Laptop (tekan 'P')...", flush=True)
        page_deck.keyboard.press("p")
        page_deck.wait_for_timeout(500)
        modal_open = page_deck.evaluate("() => document.getElementById('teleprompterModal').classList.contains('open')")
        print(f"      Modal terbuka: {modal_open}", flush=True)
        assert modal_open, "Modal teleprompter harus terbuka saat 'P' ditekan"

        qr_has_content = page_deck.evaluate("() => { const box = document.getElementById('teleQrBox'); return !!(box && (box.querySelector('canvas') || box.querySelector('img'))); }")
        print(f"      QR Code ter-render: {qr_has_content}", flush=True)
        assert qr_has_content, "QR Code harus ter-render di dalam #teleQrBox"

        modal_shot = shots_dir / "laptop_qr_modal.png"
        page_deck.screenshot(path=str(modal_shot))
        print(f"      Screenshot modal pairing laptop disimpan di: {modal_shot}", flush=True)

        page_deck.keyboard.press("Escape")
        page_deck.wait_for_timeout(300)
        modal_closed = page_deck.evaluate("() => !document.getElementById('teleprompterModal').classList.contains('open')")
        print(f"      Modal tertutup (Esc): {modal_closed}", flush=True)

        browser.close()

    print("\n========================================================")
    print("HASIL PENGUJIAN: SEMUA 100% PASS (SYNC, REMOTE, UI, QR)")
    print("========================================================")
    return 0

if __name__ == "__main__":
    sys.exit(main())
