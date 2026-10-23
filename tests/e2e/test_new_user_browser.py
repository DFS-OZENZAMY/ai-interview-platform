"""Browser-level E2E: new candidate -> signup -> onboarding -> simulation -> recap.
The demo is explicitly local. Live Auth is tested against a browser-network mock,
not claimed as real Supabase user provisioning.
"""
import json
import os
import subprocess
import sys
import time
import urllib.request
import unittest
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
PORT = int(os.environ.get("AI_E2E_PORT", "18765"))
ORIGIN = f"http://127.0.0.1:{PORT}"
FAKE_PROJECT = "https://fake-reference.supabase.co"
USER_ID = "123e4567-e89b-42d3-a456-426614174001"


def start_server(live=False):
    env = dict(os.environ)
    if live:
        env["SUPABASE_URL"] = FAKE_PROJECT
        env["SUPABASE_PUBLISHABLE_KEY"] = "sb_publishable_e2e_mock_only"
    else:
        env.pop("SUPABASE_URL", None)
        env.pop("SUPABASE_PUBLISHABLE_KEY", None)
    proc = subprocess.Popen(
        [sys.executable, str(ROOT / "dev/local-preview/server.py"),
         "--port", str(PORT), "--no-open"],
        cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
    )
    for _ in range(120):
        if proc.poll() is not None:
            raise RuntimeError(f"Preview server exited: {proc.stderr.read().decode()}")
        try:
            with urllib.request.urlopen(ORIGIN + "/api/health", timeout=.5) as response:
                if json.loads(response.read()).get("ready"):
                    return proc
        except Exception:
            time.sleep(.1)
    proc.terminate()
    raise RuntimeError("Local preview did not start")


class NewUserBrowserE2ETests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.process = start_server()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.process.terminate()
        try:
            cls.process.wait(timeout=4)
        except subprocess.TimeoutExpired:
            cls.process.kill()

    def page(self):
        context = self.browser.new_context(viewport={"width": 1360, "height": 900})
        self.addCleanup(context.close)
        page = context.new_page()
        page.goto(ORIGIN + "/e2e")
        return page

    def test_new_user_onboarding_interview_recap_and_preferences_isolation(self):
        page = self.page()
        expect(page.get_by_text("Bienvenue dans votre")).to_be_visible()
        page.locator("#chooseDemo").click()
        expect(page.locator("#authHeading")).to_have_text("Créer mon compte")
        page.locator("#email").fill("new.user@example.test")
        page.locator("#password").fill("temporary-example-password")
        page.locator("#authSubmit").click()

        expect(page.locator("#onboarding")).to_be_visible()
        page.locator('#professionalOptions input[value="job_change"]').check(force=True)
        page.locator('#preparationOptions input[value="communication"]').check(force=True)
        page.locator('#preparationOptions input[value="answer_structure"]').check(force=True)
        page.locator("#targetRole").fill("DevOps Engineer")
        page.locator("#saveProfile").click()

        expect(page.locator("#dashboard")).to_be_visible()
        expect(page.locator("#profileGoal")).to_have_text("Changer de poste")
        expect(page.locator("#profilePrep")).to_contain_text("Communication")
        expect(page.locator("#profilePrep")).to_contain_text("Structurer mes réponses")
        expect(page.locator("#profileRole")).to_have_text("DevOps Engineer")

        page.locator("#goConfigure").click()
        expect(page.locator('#simulationGoals input[value="communication"]')).to_be_checked()
        expect(page.locator('#simulationGoals input[value="answer_structure"]')).to_be_checked()
        page.locator('#simulationGoals input[value="answer_structure"]').uncheck(force=True)
        page.locator('#simulationGoals input[value="stress_management"]').check(force=True)
        page.locator("#simJobDescription").fill("Ceci est une offre fictive pour cette simulation uniquement.")
        page.locator("#simCount").select_option("3")
        page.locator("#launchInterview").click()

        expect(page.locator("#interview")).to_be_visible()
        codes = []
        for index in range(3):
            code = page.locator("#interviewCode").inner_text()
            codes.append(code)
            page.locator("#interviewAnswer").fill(f"Ma réponse fictive numéro {index + 1}")
            page.locator("#submitAnswer").click()

        self.assertEqual(len(set(codes)), 3)
        expect(page.locator("#recap")).to_be_visible()
        expect(page.locator("#recapCount")).to_have_text("3 question(s)")
        expect(page.locator("#recapAnswers .item")).to_have_count(3)
        expect(page.locator("#recapPersistentGoals")).to_contain_text("Structurer mes réponses")
        expect(page.locator("#recapPersistentGoals")).not_to_contain_text("Gestion du stress")
        expect(page.locator("#recapSimulationGoals")).to_contain_text("Gestion du stress")
        expect(page.locator("#recapSimulationGoals")).not_to_contain_text("Structurer mes réponses")

        page.locator("#returnDashboard").click()
        expect(page.locator("#profilePrep")).to_contain_text("Structurer mes réponses")
        page.locator("#signOut").click()
        page.locator("#chooseDemo").click()
        page.locator("#toggleAuth").click()
        page.locator("#email").fill("new.user@example.test")
        page.locator("#password").fill("temporary-example-password")
        page.locator("#authSubmit").click()
        expect(page.locator("#profileGoal")).to_have_text("Changer de poste")
        expect(page.locator("#profilePrep")).to_contain_text("Structurer mes réponses")

    def test_preparation_goal_is_required_and_resume_is_not_requested(self):
        page = self.page()
        page.locator("#chooseDemo").click()
        page.locator("#email").fill("test@example.test")
        page.locator("#password").fill("example_password_123")
        page.locator("#authSubmit").click()
        page.locator('#professionalOptions input[value="first_job"]').check(force=True)
        page.locator("#saveProfile").click()
        expect(page.locator("#onboardingError")).to_contain_text("au moins un objectif")
        self.assertEqual(page.locator('input[type="file"]').count(), 0)
        self.assertEqual(page.locator("#simJobDescription").count(), 1)


class NewUserLiveMockE2ETests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.process = start_server(live=True)
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.process.terminate()
        cls.process.wait(timeout=5)

    def test_live_signup_auth_and_profile_persistence_via_mocked_supabase(self):
        context = self.browser.new_context()
        self.addCleanup(context.close)
        page = context.new_page()
        captured = {"profile": None, "login": 0, "api_calls": []}

        def mock_supabase(route):
            request = route.request
            path = request.url
            headers = {"access-control-allow-origin": "*",
                       "access-control-allow-headers": "authorization,apikey,content-type,prefer",
                       "access-control-allow-methods": "GET,POST,OPTIONS"}
            if request.method == "OPTIONS":
                route.fulfill(status=204, headers=headers)
                return
            captured["api_calls"].append(path)
            if "/auth/v1/signup" in path:
                body = {"access_token": "test-jwt", "user": {"id": USER_ID,
                         "email": "actual.user@example.test"}}
            elif "/auth/v1/token" in path:
                captured["login"] += 1
                body = {"access_token": "test-jwt", "user": {"id": USER_ID,
                         "email": "actual.user@example.test"}}
            elif "/auth/v1/user" in path:
                body = {"id": USER_ID, "email": "actual.user@example.test"}
            elif "/rest/v1/candidate_profiles" in path:
                if request.method == "GET":
                    body = [captured["profile"]] if captured["profile"] else []
                else:
                    payload = request.post_data_json
                    assert "file" not in payload and "cv" not in payload
                    assert "job_description" not in payload
                    assert request.headers.get("authorization") == "Bearer test-jwt"
                    captured["profile"] = dict(payload)
                    body = [captured["profile"]]
            elif "/auth/v1/logout" in path:
                body = {}
            else:
                route.fulfill(status=404, headers=headers, body='{"error":"not_found"}')
                return
            route.fulfill(status=200, headers={**headers,"content-type":"application/json"},
                          body=json.dumps(body))

        page.route("https://fake-reference.supabase.co/**", mock_supabase)
        page.goto(ORIGIN + "/e2e")
        expect(page.locator("#chooseLive")).to_be_enabled()
        page.locator("#chooseLive").click()
        page.locator("#email").fill("actual.user@example.test")
        page.locator("#password").fill("testing-only-passphrase")
        page.locator("#authSubmit").click()
        expect(page.locator("#onboarding")).to_be_visible()
        page.locator('#professionalOptions input[value="career_growth"]').check(force=True)
        page.locator('#preparationOptions input[value="domain_knowledge"]').check(force=True)
        page.locator("#targetRole").fill("Business Analyst")
        page.locator("#saveProfile").click()
        expect(page.locator("#dashboard")).to_be_visible()
        self.assertEqual(captured["profile"]["user_id"], USER_ID)
        self.assertEqual(captured["profile"]["professional_goal"], "career_growth")
        self.assertEqual(captured["profile"]["preparation_goals"], ["domain_knowledge"])

        page.locator("#goConfigure").click()
        page.locator("#simJobDescription").fill("Fiche de poste fictive pour simulation seulement")
        page.locator("#launchInterview").click()
        expect(page.locator("#configurationError")).to_contain_text("0 question")
        self.assertEqual(page.locator("#interview").is_visible(), False)
        self.assertNotIn("job_description", captured["profile"])

        page.locator("#backDashboard").click()
        page.locator("#signOut").click()
        page.locator("#chooseLive").click()
        page.locator("#toggleAuth").click()
        page.locator("#email").fill("actual.user@example.test")
        page.locator("#password").fill("testing-only-passphrase")
        page.locator("#authSubmit").click()
        expect(page.locator("#dashboard")).to_be_visible()
        expect(page.locator("#profileGoal")).to_have_text("Évoluer")
        self.assertGreaterEqual(captured["login"], 1)


if __name__ == "__main__":
    unittest.main()
