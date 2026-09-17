"""
test-stabilo.py — Playwright test for naskah + stabilo highlight feature.
Requires: playwright, http.server (stdlib)
Run: py -3 tools/test-stabilo.py
"""
import pathlib
import threading
import http.server
import socketserver
import time
import sys
import os
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "shots" / "stabilo"
OUT.mkdir(parents=True, exist_ok=True)

# Start local HTTP server to avoid file:// restrictions
PORT = 8791

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def start_server():
    os.chdir(str(ROOT))
    with socketserver.TCPServer(("", PORT), QuietHandler) as httpd:
        httpd.serve_forever()

server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()
time.sleep(0.8)

URL = f"http://localhost:{PORT}/presenter/index.html"
print(f"Testing: {URL}")

PASS = 0
FAIL = 0

def check(label, cond, detail=""):
    global PASS, FAIL
    if cond:
        print(f"  PASS: {label}")
        PASS += 1
    else:
        print(f"  FAIL: {label}" + (f" -- {detail}" if detail else ""))
        FAIL += 1

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
    )
    page = context.new_page()

    console_errors = []
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: console_errors.append(str(e)))

    print("Navigating to mobile teleprompter:", URL)
    page.goto(URL, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)

    # Dismiss PIN modal via JS so clicks work
    page.evaluate("""() => {
        const m = document.getElementById('pinModal');
        if (m) { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
    }""")
    page.wait_for_timeout(400)

    # Diagnose slide data loading
    slides_len = page.evaluate("() => (window.PRESENTATION_SLIDES || []).length")
    print(f"Slides loaded: {slides_len}")
    
    # Force renderSlide(0) to populate script content via exposed goTo
    page.evaluate("() => { if (typeof window.kwn_goTo === 'function') window.kwn_goTo(0); }")
    page.wait_for_timeout(500)
    
    # Check content after render
    sc_preview = page.evaluate("() => document.getElementById('scriptContent').innerHTML.substring(0, 100)")
    marks_count = page.evaluate("() => document.querySelectorAll('#scriptContent mark').length")
    print(f"scriptContent preview: {sc_preview[:80]}...")
    print(f"Marks in content: {marks_count}")

    # 1. Verify default stabilo is ON
    is_on = page.evaluate("() => document.getElementById('scriptContent').classList.contains('stabilo-on')")
    print(f"[TEST 1] Stabilo active by default: {is_on}")
    assert is_on, "Stabilo should be active by default"

    # Verify legend is visible
    legend_disp = page.evaluate("() => window.getComputedStyle(document.getElementById('stabiloLegend')).display")
    print(f"[TEST 2] Stabilo legend display: {legend_disp}")
    assert legend_disp != "none", "Stabilo legend should be displayed when ON"

    # 2. Toggle Stabilo to OFF
    page.click("#btnToggleStabilo")
    page.wait_for_timeout(400)

    is_off = page.evaluate("() => document.getElementById('scriptContent').classList.contains('stabilo-off')")
    print(f"[TEST 3] Stabilo toggled to OFF: {is_off}")
    assert is_off, "Stabilo should be off after clicking toggle"

    legend_disp_off = page.evaluate("() => window.getComputedStyle(document.getElementById('stabiloLegend')).display")
    print(f"[TEST 4] Stabilo legend hidden when OFF: {legend_disp_off}")
    assert legend_disp_off == "none", "Stabilo legend should be hidden when OFF"

    badge_text = page.evaluate("() => document.getElementById('stabiloToggleBadge').textContent")
    print(f"[TEST 5] Badge text when OFF: {badge_text}")
    assert badge_text == "OFF", f"Badge should say OFF, got: {badge_text}"

    # Screenshot OFF state
    page.screenshot(path=str(OUT / "teleprompter_slide01_stabilo_OFF.png"))
    print("Saved screenshot: teleprompter_slide01_stabilo_OFF.png")

    # 3. Toggle back to ON and test navigation across key slides
    page.click("#btnQuickStabilo")
    page.wait_for_timeout(300)

    test_slides = [
        (4, "Slide 05 - APBN 2025"),
        (5, "Slide 06 - Rasio Pajak"),
        (15, "Slide 16 - Skor CPI 34"),
        (21, "Slide 22 - Penutup")
    ]

    for idx, name in test_slides:
        page.evaluate(f"() => window.kwn_goTo && window.kwn_goTo({idx})")
        page.wait_for_timeout(500)

        num = idx + 1
        script_text = page.evaluate("() => document.getElementById('scriptContent').innerText")
        print(f"[TEST SLIDE {num:02d}] {name} - Script length: {len(script_text)} chars")
        assert len(script_text) > 80, f"Slide {num} script should have substantial content"

        # Check that marks exist
        mark_count = page.evaluate("() => document.querySelectorAll('#scriptContent mark').length")
        print(f"  Marks found: {mark_count}")
        assert mark_count > 0, f"Slide {num} should contain stabilo marks"

        page.screenshot(path=str(OUT / f"teleprompter_slide{num:02d}_mobile.png"))
        print(f"  Saved screenshot: teleprompter_slide{num:02d}_mobile.png")

    print("\n--- ALL TELEPROMPTER STABILO TESTS PASSED! ---")
    print("Console errors:", console_errors or "None")
    browser.close()
