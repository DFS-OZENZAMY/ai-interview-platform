"""Read-only smoke tests against live Supabase-configured login and protected routes."""
from playwright.sync_api import sync_playwright, expect
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,channel="chrome")
    for viewport in [{"width":1440,"height":900},{"width":390,"height":844}]:
        page=b.new_page(viewport=viewport,reduced_motion="reduce")
        page.goto("http://localhost:3000/login",wait_until="networkidle")
        expect(page.get_by_role("heading",name="Bon retour parmi nous.")).to_be_visible()
        expect(page.get_by_role("button",name="Reprendre notre parcours")).to_be_enabled()
        assert page.get_by_text("Démonstration UX :",exact=False).count()==0
        for route in ["dashboard","onboarding","preparation","role-preview"]:
            page.goto(f"http://localhost:3000/{route}",wait_until="domcontentloaded")
            page.wait_for_url("**/login?next=*")
            assert page.url.endswith(f"next=%2F{route}"), page.url
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        print("PASS",viewport["width"],"Supabase login enabled, protected routes redirect to /login",flush=True)
        page.close()
    b.close()
