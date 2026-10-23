"""Chromium contract: preparation goals follow HR/technical type and specialty."""
import json
import unittest
from playwright.sync_api import sync_playwright, expect
from test_new_user_browser import start_server, ORIGIN

class AIFamilyBrowser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = start_server()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.terminate()
        cls.server.wait(timeout=5)

    def bootstrap(self, ai_enabled=False, handler=None):
        context = self.browser.new_context()
        self.addCleanup(context.close)
        p = context.new_page()
        if ai_enabled:
            p.route("**/api/ai/status", lambda route: route.fulfill(
                status=200, content_type="application/json",
                body=json.dumps({"available": True, "draft_preview": True})))
        if handler:
            p.route("**/api/ai/session/**", handler)
        p.goto(ORIGIN + "/e2e")
        p.locator("#chooseDemo").click()
        p.locator("#email").fill("new.ai.user@example.test")
        p.locator("#password").fill("synthetic-passphrase-123")
        p.locator("#authSubmit").click()
        p.locator('#professionalOptions input[value="job_change"]').check(force=True)
        p.locator('#preparationOptions input[value="communication"]').check(force=True)
        p.locator('#preparationOptions input[value="answer_structure"]').check(force=True)
        p.locator('#preparationOptions input[value="domain_knowledge"]').check(force=True)
        p.locator("#saveProfile").click()
        p.locator("#goConfigure").click()
        expect(p.locator("#configure")).to_be_visible()
        return p

    def test_family_and_specialty_options(self):
        p = self.bootstrap()
        expect(p.locator("#simGoalsTitle")).to_have_text("Objectifs de préparation RH")
        expect(p.locator('#simulationGoals input[value="communication"]')).to_be_checked()
        expect(p.locator('#simulationGoals input[value="answer_structure"]')).to_be_checked()
        self.assertEqual(p.locator('#simulationGoals input[value="tech_sql"]').count(),0)
        expect(p.locator("#simDomainWrap")).to_be_hidden()
        p.locator("#simFamily").select_option("technical")
        expect(p.locator("#simGoalsTitle")).to_have_text("Objectifs de préparation technique")
        expect(p.locator("#simDomainWrap")).to_be_visible()
        expect(p.locator('#simulationGoals input[value="tech_fundamentals"]')).to_be_checked()
        self.assertEqual(p.locator('#simulationGoals input[value="rh_motivation"]').count(),0)
        p.locator("#simDomain").select_option("data_ai")
        self.assertEqual(p.locator('#simulationGoals input[value="tech_sql"]').count(),1)
        p.locator('#simulationGoals input[value="tech_sql"]').check(force=True)
        p.locator("#simDomain").select_option("cloud_devops")
        self.assertEqual(p.locator('#simulationGoals input[value="tech_sql"]').count(),0)
        self.assertEqual(p.locator('#simulationGoals input[value="tech_cloud"]').count(),1)
        p.locator("#simFamily").select_option("rh")
        expect(p.locator('#simulationGoals input[value="communication"]')).to_be_checked()
        self.assertEqual(p.locator('#simulationGoals input[value="tech_fundamentals"]').count(),0)

    def test_ai_followup_requires_consent_and_preserves_profile(self):
        interactions=[]
        def ai_handler(route):
            req = route.request
            payload = req.post_data_json
            interactions.append(payload)
            if req.url.endswith("/start"):
                response={
                    "session_id":"fake-local-ai","phase":"primary","index":1,"total":1,
                    "question":{"code":"TECH-003","category":"data_ai","difficulty":1,
                                "prompt":"Expliquez les jointures SQL."},
                }
                route.fulfill(status=201,content_type="application/json",body=json.dumps(response))
                return
            if len(interactions)==2:
                response={
                    "completed":False,"phase":"followup","index":1,"total":1,
                    "question":{"code":"TECH-003","category":"data_ai","difficulty":1,
                                "prompt":"Pourquoi utiliser un LEFT JOIN ?",
                                "followup_generated_by_ai":True},
                }
            else:
                response={
                    "completed":True,"feedback":"Bilan IA : un exemple concret serait utile.",
                    "transcript":[
                        {"code":"TECH-003","question":"Expliquez les jointures SQL.",
                         "answer":"Je vérifie la cardinalité."},
                        {"code":"TECH-003","question":"Pourquoi utiliser un LEFT JOIN ?",
                         "answer":"Pour garder les lignes sans correspondance."},
                    ],
                }
            route.fulfill(status=200,content_type="application/json",body=json.dumps(response))

        p=self.bootstrap(ai_enabled=True,handler=ai_handler)
        p.locator("#simFamily").select_option("technical")
        p.locator("#simDomain").select_option("data_ai")
        expect(p.locator("#simMode")).to_have_value("ai")
        p.locator('#simulationGoals input[value="tech_sql"]').check(force=True)
        p.locator("#launchInterview").click()
        expect(p.locator("#configurationError")).to_contain_text("Acceptez")
        p.locator("#aiPrivacyConsent").check()
        p.locator("#launchInterview").click()
        expect(p.locator("#interview")).to_be_visible()
        self.assertIn("tech_sql",interactions[0]["goals"])
        self.assertEqual(interactions[0]["domain"],"data_ai")
        p.locator("#interviewAnswer").fill("Je vérifie la cardinalité.")
        p.locator("#submitAnswer").click()
        expect(p.locator("#interviewPrompt")).to_have_text("Pourquoi utiliser un LEFT JOIN ?")
        expect(p.locator("#interviewStatus")).to_contain_text("RELANCE GÉNÉRÉE")
        p.locator("#interviewAnswer").fill("Pour garder les lignes sans correspondance.")
        p.locator("#submitAnswer").click()
        expect(p.locator("#recap")).to_be_visible()
        expect(p.locator("#aiRecapFeedback")).to_contain_text("Bilan IA")
        expect(p.locator("#recapAnswers .item")).to_have_count(2)
        expect(p.locator("#recapPersistentGoals")).to_contain_text("Communication")
        self.assertEqual(len(interactions),3)
