"""Debug WebSocket connection and collab sync."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"
TEST_EMAIL = f"ws_{int(time.time())}@test.com"
TEST_PASSWORD = "Password123"
TEST_NAME = "WS Tester"

def click_button_containing(page, text_fragment):
    """Click first button whose text contains a given ASCII fragment."""
    return page.evaluate(f"""
        (frag) => {{
            for (const b of document.querySelectorAll('button')) {{
                if (b.textContent.includes(frag) && !b.disabled) {{
                    b.click(); return b.textContent.trim();
                }}
            }}
            return null;
        }}
    """, text_fragment)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        console_msgs = []
        page = context.new_page()
        page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))

        # ── Register ────────────────────────────────────────────────────
        print("Step 1: Register...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")

        # Switch to register mode (button text "Đăng ký" — click by index)
        buttons = page.locator("button").all()
        print(f"  Buttons on login page: {[b.inner_text() for b in buttons]}")

        # Find and click "Đăng ký" (register) button
        clicked = click_button_containing(page, "ng k")  # "Đăng ký" contains "ng k"
        print(f"  Clicked: '{clicked}'")
        page.wait_for_timeout(300)

        # Fill name input (only visible in register mode)
        name_input = page.locator('input[placeholder]').all()
        print(f"  Inputs: {[i.get_attribute('placeholder') for i in name_input]}")

        page.locator('input').nth(0).fill(TEST_NAME)   # name
        page.locator('input[type="email"]').fill(TEST_EMAIL)
        page.locator('input[type="password"]').fill(TEST_PASSWORD)

        # Click submit
        clicked = click_button_containing(page, "ng k")  # submit "Đăng ký"
        print(f"  Submit clicked: '{clicked}'")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        print(f"  URL after register: {page.url}")

        # ── Reconnaissance: Dashboard DOM ───────────────────────────────
        print("\nStep 2: Inspect Dashboard DOM...")
        page.screenshot(path="tests/screenshots/recon_dashboard.png", full_page=True)
        buttons = page.locator("button").all()
        print(f"  Buttons: {[b.inner_text() for b in buttons]}")

        # ── Create document ─────────────────────────────────────────────
        print("\nStep 3: Create document...")
        # "+ Tạo mới" contains "m" and "i" (ASCII-safe fragments)
        # Try clicking by index: first button in header area
        btn_texts = [b.inner_text() for b in page.locator("button").all()]
        create_idx = None
        for i, t in enumerate(btn_texts):
            if "m" in t.lower() and "i" in t.lower() and "ng xu" not in t:
                create_idx = i
                break

        if create_idx is not None:
            page.locator("button").nth(create_idx).click()
            print(f"  Clicked button[{create_idx}]: '{btn_texts[create_idx]}'")
        else:
            print(f"  Could not find create button! All buttons: {btn_texts}")
            browser.close()
            return

        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        doc_url = page.url
        print(f"  Doc URL: {doc_url}")

        if "/doc/" not in doc_url:
            page.screenshot(path="tests/screenshots/recon_after_create.png", full_page=True)
            print(f"  ERROR: Still at {doc_url}")
            # Maybe API failed? Check console
            for m in console_msgs[-10:]:
                print(f"    {m}")
            browser.close()
            return

        # ── Editor page ─────────────────────────────────────────────────
        print("\nStep 4: Editor page...")
        page.wait_for_selector(".ProseMirror", timeout=10000)
        print("  ProseMirror ready. Waiting 8s for WebSocket...")
        page.wait_for_timeout(8000)
        page.screenshot(path="tests/screenshots/recon_editor.png", full_page=True)

        # Check online/offline badge text
        body_text = page.locator("body").inner_text()
        if "Online" in body_text:
            print("  STATUS: ONLINE ✓")
        elif "Offline" in body_text:
            print("  STATUS: OFFLINE ✗")

        # Token check
        token = page.evaluate("""
            () => {
                try {
                    return JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token || null;
                } catch(e) { return 'parse-error'; }
            }
        """)
        print(f"  Auth token: {'YES (' + str(token)[:30] + '...)' if token else 'NO'}")

        # WS-related console messages
        ws_msgs = [m for m in console_msgs if any(k in m.lower() for k in
                   ["websocket", "ws ", "error", "failed", "warn", "auth", "token", "connect"])]
        if ws_msgs:
            print(f"  Console ({len(ws_msgs)} relevant msgs):")
            for m in ws_msgs[:20]:
                print(f"    {m}")
        else:
            print("  No WS/error console messages")

        # ── Tab 2 collab ────────────────────────────────────────────────
        print("\nStep 5: Tab 2 collab test...")
        page2 = context.new_page()
        tab2_msgs = []
        page2.on("console", lambda msg: tab2_msgs.append(f"[{msg.type}] {msg.text}"))
        page2.goto(doc_url)
        page2.wait_for_selector(".ProseMirror", timeout=10000)
        page2.wait_for_timeout(6000)

        body2 = page2.locator("body").inner_text()
        if "Online" in body2:
            print("  Tab2 STATUS: ONLINE ✓")
        else:
            print("  Tab2 STATUS: OFFLINE ✗")

        # Type from Tab 1
        editor1 = page.locator(".ProseMirror")
        editor1.click()
        page.keyboard.press("Control+a")
        page.keyboard.press("Delete")
        page.keyboard.type("Tab1-hello")
        page.wait_for_timeout(2500)

        # Type from Tab 2
        editor2 = page2.locator(".ProseMirror")
        editor2.click()
        page2.keyboard.press("End")
        page2.keyboard.type(" Tab2-world")
        page2.wait_for_timeout(2500)

        # Check sync
        page.bring_to_front()
        page.wait_for_timeout(2000)
        page.screenshot(path="tests/screenshots/recon_collab_tab1.png", full_page=True)
        content1 = editor1.inner_text()

        page2.bring_to_front()
        page2.wait_for_timeout(500)
        page2.screenshot(path="tests/screenshots/recon_collab_tab2.png", full_page=True)
        content2 = page2.locator(".ProseMirror").inner_text()

        print(f"  Tab1 content: '{content1}'")
        print(f"  Tab2 content: '{content2}'")
        print(f"  Tab1<-Tab2 sync: {'OK' if 'Tab2-world' in content1 else 'FAILED'}")
        print(f"  Tab2<-Tab1 sync: {'OK' if 'Tab1-hello' in content2 else 'FAILED'}")

        page2.close()
        browser.close()
        print("\nDone. Screenshots saved to tests/screenshots/")

if __name__ == "__main__":
    import os
    os.makedirs("tests/screenshots", exist_ok=True)
    run()
