"""Browser integration: cinematic welcome, skip, motion preference and dashboard handoff."""
from playwright.sync_api import sync_playwright, expect

def journey(page):
    page.goto("http://localhost:3000/onboarding", wait_until="networkidle")
    page.get_by_label("Prénom", exact=True).fill("Camille")
    page.get_by_label("Nom", exact=True).fill("Martin")
    page.get_by_role("button", name="Continuer").click()
    page.get_by_role("radio", name="Je suis en poste").click()
    page.get_by_role("button", name="Continuer").click()
    page.get_by_role("radio", name="Évoluer dans ma carrière").click()
    page.get_by_role("button", name="Continuer").click()
    page.get_by_role("button", name="Mieux communiquer").click()
    page.get_by_role("button", name="Continuer").click()
    page.get_by_role("button", name="C’est parti !").click()
    expect(page.get_by_test_id("welcome-sequence")).to_be_visible()
    expect(page.get_by_role("heading", name="Bienvenue, Camille.")).to_be_visible()
    expect(page.get_by_text("Évoluer dans ma carrière")).to_be_visible()

def run():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True, channel="chrome")
        for motion, viewport in [("no-preference", {"width":1440,"height":900}),("reduce", {"width":390,"height":844})]:
            page = b.new_page(viewport=viewport, reduced_motion=motion)
            journey(page)
            expect(page.get_by_role("button", name="Passer l’animation")).to_have_count(0)
            expect(page.get_by_test_id("welcome-sequence")).to_have_css("position", "fixed")
            expect(page.get_by_test_id("welcome-sequence")).to_have_css("background-color", "rgb(237, 243, 254)")
            if motion == "no-preference":
                expect(page.get_by_test_id("welcome-cta")).to_have_count(0)
                expect(page.get_by_test_id("welcome-cta")).to_be_visible(timeout=6500)
            else:
                expect(page.get_by_test_id("welcome-cta")).to_be_visible()
            expect(page.get_by_role("button", name="Découvrir notre espace")).to_be_visible()
            expect(page.get_by_test_id("welcome-cta")).to_have_css("color", "rgb(255, 255, 255)")
            assert page.get_by_test_id("welcome-cta").evaluate("""
              el => {
                const styles = getComputedStyle(el);
                return styles.backgroundImage.includes("rgb(41, 71, 163)") &&
                  styles.color === "rgb(255, 255, 255)";
              }"""), "CTA must show white text on a saturated blue gradient"
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            page.get_by_role("button", name="Découvrir notre espace").click()
            page.wait_for_url("**/dashboard")
            expect(page.get_by_text("On prépare la suite ?", exact=True)).to_be_visible()
            print("PASS", viewport["width"], motion, "welcome → dashboard", flush=True)
            page.close()
        b.close()

if __name__ == "__main__":
    run()
