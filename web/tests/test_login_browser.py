"""Visual and UX smoke test of login when public Supabase config is absent."""
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, channel="chrome")
    for viewport in [{"width": 1440, "height": 900}, {"width": 390, "height": 844}]:
        page = browser.new_page(viewport=viewport, reduced_motion="reduce")
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto("http://localhost:3000/login", wait_until="networkidle")
        expect(page.get_by_role("heading", name="Bon retour parmi nous.")).to_be_visible()
        expect(page.get_by_role("textbox", name="Adresse e-mail")).to_be_visible()
        expect(page.get_by_label("Mot de passe", exact=True)).to_be_visible()
        expect(page.get_by_role("button", name="Reprendre notre parcours")).to_be_enabled()
        page.get_by_role("button", name="Afficher le mot de passe").click()
        expect(page.get_by_role("button", name="Masquer le mot de passe")).to_be_visible()
        page.get_by_role("button", name="Mot de passe oublié ?").click()
        expect(page.get_by_role("heading", name="Retrouvons votre accès.")).to_be_visible()
        expect(page.get_by_label("Mot de passe", exact=True)).to_have_count(0)
        page.get_by_role("button", name="Se connecter").click()
        page.get_by_role("button", name="S’inscrire").click()
        expect(page.get_by_role("heading", name="On commence ensemble ?")).to_be_visible()
        expect(page.get_by_role("button", name="Créer mon compte")).to_be_visible()
        page.get_by_role("button", name="Se connecter").click()
        expect(page.get_by_role("heading", name="Bon retour parmi nous.")).to_be_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), viewport
        assert not errors, errors
        print("PASS", viewport["width"], "login/signup/reset flow, a11y labels, no overflow", flush=True)
        page.close()
    browser.close()
