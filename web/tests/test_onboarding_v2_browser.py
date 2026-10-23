"""Chromium E2E: context-adaptive onboarding and navigation in desktop/mobile preview."""
from playwright.sync_api import sync_playwright, expect

ORIGIN = "http://localhost:3000"


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, channel="chrome")
        scenarios = [
            ("Je termine mes études ou je débute", None, "Préparer mon premier emploi", "Changer de poste"),
            ("Je suis en poste", "4 à 7 ans", "Évoluer dans ma carrière", "Préparer mon premier emploi"),
            ("Je recherche un emploi", "Je débute", "Préparer mon premier emploi", "Changer de poste"),
            ("Je recherche un emploi", "4 à 7 ans", "Retrouver un emploi", "Préparer mon premier emploi"),
            ("Je travaille à mon compte", "1 à 3 ans", "Rejoindre une entreprise", "Préparer mon premier emploi"),
        ]
        for viewport in [{"width": 1440, "height": 900}, {"width": 390, "height": 844}]:
            for situation, experience, target, blocked in scenarios:
                page = browser.new_page(viewport=viewport, reduced_motion="reduce")
                page.goto(f"{ORIGIN}/onboarding", wait_until="networkidle")
                expect(page.get_by_role("heading", name="D’abord, vous.")).to_be_visible()
                page.get_by_label("Prénom", exact=True).fill("Camille")
                page.get_by_label("Nom", exact=True).fill("Martin")
                page.get_by_role("button", name="Continuer").click()
                expect(page.get_by_role("heading", name="Aujourd’hui, où en êtes-vous ?")).to_be_visible()
                assert "Pas de mauvaise réponse" not in page.locator("body").inner_text()
                expect(page.get_by_role("progressbar", name="Progression de notre parcours")).to_have_attribute("aria-valuemax", "5")
                page.get_by_role("radio", name=situation).click()
                if experience:
                    page.get_by_role("radio", name=experience, exact=True).click()
                page.get_by_role("button", name="Continuer").click()
                expect(page.get_by_role("heading", name="On vise quoi ensuite ?")).to_be_visible()
                expect(page.get_by_role("radio", name=target)).to_be_visible()
                assert page.get_by_role("radio", name=blocked).count() == 0, (situation, blocked)
                page.get_by_role("radio", name=target).click()
                page.get_by_role("button", name="Continuer").click()
                expect(page.get_by_role("heading", name="Qu’est-ce qu’on peut améliorer ensemble ?")).to_be_visible()
                page.get_by_role("button", name="Mieux communiquer").click()
                page.get_by_role("button", name="Continuer").click()
                expect(page.get_by_role("heading", name="Dans quelle langue on s’entraîne ?")).to_be_visible()
                page.get_by_role("button", name="C’est parti !").click()
                expect(page.get_by_role("heading", name="Bienvenue, Camille.")).to_be_visible()
                expect(page.get_by_text(target)).to_be_visible()
                page.get_by_role("button", name="Précédent").click()
                expect(page.get_by_role("heading", name="Dans quelle langue on s’entraîne ?")).to_be_visible()
                page.get_by_role("button", name="Retour", exact=True).click()
                expect(page.get_by_role("heading", name="Qu’est-ce qu’on peut améliorer ensemble ?")).to_be_visible()
                page.get_by_role("button", name="Continuer").click()
                page.get_by_role("button", name="C’est parti !").click()
                page.get_by_role("button", name="Découvrir notre espace").click()
                page.wait_for_url("**/dashboard")
                expect(page.get_by_text("On prépare la suite ?", exact=True)).to_be_visible()
                expect(page.get_by_role("heading", name=target)).to_be_visible()
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (viewport, situation)
                page.get_by_role("link", name="Mon profil").click()
                page.wait_for_url("**/onboarding")
                expect(page.get_by_role("heading", name="Bienvenue, Camille.")).to_be_visible()
                page.get_by_role("button", name="Précédent").click()
                expect(page.get_by_role("heading", name="Dans quelle langue on s’entraîne ?")).to_be_visible()
                page.close()
                print("PASS", viewport["width"], situation, "→", target, flush=True)

            # Critical regression: returning to previous step and changing status resets impossible goals.
            page = browser.new_page(viewport=viewport, reduced_motion="reduce")
            page.goto(f"{ORIGIN}/onboarding", wait_until="networkidle")
            page.get_by_label("Prénom", exact=True).fill("Camille")
            page.get_by_label("Nom", exact=True).fill("Martin")
            page.get_by_role("button", name="Continuer").click()
            page.get_by_role("radio", name="Je suis en poste").click()
            page.get_by_role("button", name="Continuer").click()
            page.get_by_role("radio", name="Changer de poste").click()
            page.get_by_role("button", name="Retour", exact=True).click()
            page.get_by_role("radio", name="Je termine mes études ou je débute").click()
            page.get_by_role("button", name="Continuer").click()
            assert page.get_by_role("radio", name="Changer de poste").count() == 0
            expect(page.get_by_role("radio", name="Préparer mon premier emploi")).to_have_attribute("aria-checked", "true")
            print("PASS", viewport["width"], "status change clears inconsistent target", flush=True)
            page.close()
        browser.close()


if __name__ == "__main__":
    run()
