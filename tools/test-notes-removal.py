import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        
        file_url = Path("index.html").resolve().as_uri()
        page.goto(file_url)
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        
        # 1. Check notes element in DOM
        notes = page.query_selector("#notes")
        notes_text = page.query_selector("#notesText")
        print(f"Notes in DOM: {notes is not None}")
        print(f"NotesText in DOM: {notes_text is not None}")
        
        # 2. Press 'p'
        page.keyboard.press("p")
        time.sleep(0.5)
        
        modal_open = page.evaluate("() => document.getElementById('teleprompterModal').classList.contains('open')")
        print(f"Teleprompter modal open on 'p': {modal_open}")
        
        # Verify no '.notes' is visible
        notes_visible = page.evaluate("() => { const el = document.querySelector('.notes'); return el ? getComputedStyle(el).display !== 'none' : false; }")
        print(f"Notes bar visible: {notes_visible}")
        
        # Take screenshot
        Path("tools/_shot").mkdir(parents=True, exist_ok=True)
        page.screenshot(path="tools/_shot/deck_after_p.png")
        
        # Close modal with escape
        page.keyboard.press("Escape")
        time.sleep(0.3)
        modal_open_after_esc = page.evaluate("() => document.getElementById('teleprompterModal').classList.contains('open')")
        print(f"Teleprompter modal open after Escape: {modal_open_after_esc}")
        
        page.screenshot(path="tools/_shot/deck_normal.png")
        
        browser.close()
        
    print("Verification completed successfully!")

if __name__ == "__main__":
    main()
