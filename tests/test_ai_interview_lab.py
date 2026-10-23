"""Behavioral contract of the local AI coach. All provider replies here are mocked."""
import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest

DIR = Path(__file__).resolve().parents[1] / "dev" / "local-preview"
sys.path.insert(0, str(DIR))
from ai_interview import InterviewLab, OpenAIRehearsalProvider, GroqRehearsalProvider, configure_ai_provider, LabValidationError, AIUnavailableError
from server import load_questions


class FakeCoach:
    def __init__(self):
        self.followup_calls = []
        self.feedback_calls = []

    def followup(self, **kwargs):
        self.followup_calls.append(kwargs)
        return "Relance contextualisée sur : " + kwargs["answer"][:60]

    def feedback(self, **kwargs):
        self.feedback_calls.append(kwargs)
        return "Bon effort. Structurez votre prochaine réponse autour d'un exemple concret."


class InterviewLabTests(unittest.TestCase):
    def setUp(self):
        self.provider = FakeCoach()
        self.engine = InterviewLab(load_questions(), self.provider)

    def test_hr_one_question_and_ai_followup(self):
        started = self.engine.start({
            "family": "rh", "locale": "fr", "count": 1,
            "goals": ["rh_motivation", "communication"],
        })
        self.assertTrue(started["ai"])
        self.assertTrue(started["draft_preview"])
        self.assertFalse(started["persisted"])
        self.assertEqual(started["question"]["family"], "rh")
        self.assertNotIn("expected_elements", started["question"])
        self.assertNotIn("rubric_code", started["question"])
        sid = started["session_id"]
        followup = self.engine.answer({
            "session_id": sid,
            "answer": "Je suis motivé par la collaboration et la résolution de problèmes.",
        })
        self.assertEqual(followup["phase"], "followup")
        self.assertIn("collaboration", followup["question"]["prompt"])
        self.assertTrue(followup["question"]["followup_generated_by_ai"])
        self.assertEqual(self.provider.followup_calls[0]["family"], "rh")
        self.assertEqual(self.provider.followup_calls[0]["goals"], ["rh_motivation", "communication"])
        done = self.engine.answer({
            "session_id": sid, "answer": "J'ai mené un projet associatif en équipe."
        })
        self.assertTrue(done["completed"])
        self.assertEqual(len(done["transcript"]), 2)
        self.assertFalse(done["evaluated"])
        self.assertFalse(done["persisted"])
        self.assertIn("Bon effort", done["feedback"])
        with self.assertRaises(LabValidationError):
            self.engine.answer({"session_id": sid, "answer": "Réponse répétée"})

    def test_opt_in_warm_opening_before_main_questions(self):
        started = self.engine.start({
            "family": "rh", "locale": "fr", "count": 1,
            "goals": ["communication"], "warm_opening": True,
        })
        self.assertEqual(started["phase"], "icebreaker")
        self.assertIn("faire connaissance", started["question"]["prompt"])
        next_turn = self.engine.answer({
            "session_id": started["session_id"],
            "answer": "Je souhaite apprendre et accompagner des équipes.",
        })
        self.assertEqual(next_turn["phase"], "primary")
        self.assertFalse(next_turn["completed"])
        self.assertEqual(len(self.provider.followup_calls), 0)

    def test_specialized_technical_domain(self):
        started = self.engine.start({
            "family": "technical", "domain": "data_ai", "locale": "en",
            "count": 3, "difficulty": 1,
            "goals": ["tech_sql", "tech_problem_solving"],
        })
        self.assertEqual(started["question"]["category"], "data_ai")
        for q in self.engine.sessions[started["session_id"]]["selected"]:
            self.assertEqual(q["category"], "data_ai")
            self.assertEqual(q["difficulty"], 1)
        answer = self.engine.answer({
            "session_id": started["session_id"], "answer": "I would validate the query plan."
        })
        self.assertEqual(answer["question"]["category"], "data_ai")
        self.assertEqual(self.provider.followup_calls[0]["domain"], "data_ai")
        self.assertEqual(self.provider.followup_calls[0]["locale"], "en")

    def test_rejects_cross_family_and_bad_input(self):
        cases = [
            {"family": "rh", "goals": ["tech_sql"]},
            {"family": "technical", "goals": ["rh_motivation"]},
            {"family": "technical", "domain": "finance", "goals": ["tech_sql"]},
            {"family": "rh", "domain": "data_ai", "goals": ["rh_motivation"]},
            {"family": "rh", "goals": []},
            {"family": "rh", "goals": ["rh_motivation", "rh_motivation"]},
            {"family": "rh", "goals": ["rh_motivation"], "count": 90},
            {"family": "rh", "goals": ["rh_motivation"], "job_description": "x" * 3001},
        ]
        for case in cases:
            with self.subTest(case=case):
                with self.assertRaises(LabValidationError):
                    self.engine.start({"count": 2, "locale": "fr", **case})
        with self.assertRaises(LabValidationError):
            self.engine.answer({"session_id": "bad", "answer": ""})

    def test_failed_provider_does_not_mutate_session(self):
        class BrokenProvider:
            def followup(self, **kwargs):
                raise AIUnavailableError("fournisseur indisponible")
        engine = InterviewLab(load_questions(), BrokenProvider())
        s = engine.start({"family": "rh", "goals": ["rh_motivation"], "count": 1})
        with self.assertRaises(AIUnavailableError):
            engine.answer({"session_id": s["session_id"], "answer": "Réponse"})
        rec = engine.sessions[s["session_id"]]
        self.assertEqual(rec["phase"], "primary")
        self.assertEqual(rec["transcript"], [])

    def test_openai_provider_uses_server_key_and_no_remote_storage(self):
        captured = {}
        class Response(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *args): self.close()
        def opener(request, timeout=None):
            captured["url"] = request.full_url
            captured["token"] = request.get_header("Authorization")
            captured["body"] = json.loads(request.data.decode("utf-8"))
            captured["timeout"] = timeout
            return Response(json.dumps({"output":[{"content":[{"type":"output_text","text":"Pourquoi cet arbitrage ?"}]}]}).encode())
        provider = OpenAIRehearsalProvider(api_key="test-key-local-only", opener=opener)
        result = provider.followup(
            question={"fr": "Présentez votre projet"}, answer="J'ai choisi Python",
            family="technical", domain="software", locale="fr",
            goals=["tech_problem_solving"]
        )
        self.assertEqual(result, "Pourquoi cet arbitrage ?")
        self.assertEqual(captured["url"], "https://api.openai.com/v1/responses")
        self.assertEqual(captured["token"], "Bearer test-key-local-only")
        self.assertFalse(captured["body"]["store"])
        self.assertNotIn("test-key-local-only", json.dumps(captured["body"]))
        self.assertIn("J'ai choisi Python", captured["body"]["input"])


    def test_groq_provider_uses_correct_api_and_never_sends_api_key_in_json(self):
        captured = {}

        class Response(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *args): self.close()

        def opener(request, timeout=None):
            captured["url"] = request.full_url
            captured["token"] = request.get_header("Authorization")
            captured["user_agent"] = request.get_header("User-agent")
            captured["body"] = json.loads(request.data.decode("utf-8"))
            captured["timeout"] = timeout
            return Response(json.dumps({
                "choices": [{"message": {"role": "assistant",
                                          "content": "Quel exemple précis pouvez-vous donner ?"}}]
            }).encode())

        provider = GroqRehearsalProvider(api_key="gsk_mock-secret", opener=opener)
        answer = provider.followup(
            question={"fr": "Décrivez votre parcours."},
            answer="J'ai piloté un projet agile.",
            family="rh", domain=None, locale="fr",
            goals=["rh_parcours"], job_description=""
        )
        self.assertEqual(answer, "Quel exemple précis pouvez-vous donner ?")
        self.assertEqual(captured["url"],
                         "https://api.groq.com/openai/v1/chat/completions")
        self.assertEqual(captured["token"], "Bearer gsk_mock-secret")
        self.assertEqual(captured["user_agent"], "AIInterviewPlatform/0.1")
        self.assertEqual(captured["body"]["model"], "openai/gpt-oss-120b")
        self.assertEqual(captured["body"]["reasoning_effort"], "low")
        self.assertFalse(captured["body"]["include_reasoning"])
        self.assertGreaterEqual(captured["body"]["max_completion_tokens"], 512)
        self.assertEqual(captured["body"]["messages"][0]["role"], "system")
        self.assertEqual(captured["body"]["messages"][1]["role"], "user")
        self.assertIn("J'ai piloté", captured["body"]["messages"][1]["content"])
        self.assertNotIn("gsk_mock-secret", json.dumps(captured["body"]))
        self.assertNotIn("store", captured["body"])

    def test_groq_feedback_uses_same_provider(self):
        captured = []
        class Response(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *args): self.close()
        def opener(request, timeout=None):
            body = json.loads(request.data.decode("utf-8"))
            captured.append(body)
            return Response(json.dumps({
                "choices": [{"message": {"content": "Un exemple plus précis renforcerait votre réponse."}}]
            }).encode())
        provider = GroqRehearsalProvider(api_key="gsk_mock", opener=opener)
        feedback = provider.feedback(transcript=[
            {"question": "Comment gérez-vous un incident ?",
             "answer": "En observant les logs."}
        ], locale="fr", family="technical", goals=["tech_incident"])
        self.assertIn("exemple", feedback)
        self.assertGreaterEqual(captured[0]["max_completion_tokens"], 512)
        self.assertEqual(captured[0]["reasoning_effort"], "low")
        self.assertIn("logs", captured[0]["messages"][1]["content"])

    def test_groq_retired_model_reports_clear_404(self):
        import urllib.error
        def opener(request, timeout=None):
            raise urllib.error.HTTPError(
                request.full_url, 404, "model_not_found", None,
                io.BytesIO(b'{"error":{"code":"model_not_found"}}')
            )
        provider = GroqRehearsalProvider(api_key="gsk_mock", opener=opener)
        with self.assertRaises(AIUnavailableError) as caught:
            provider._complete("test", {"answer": "test"})
        self.assertIn("404", str(caught.exception))
        self.assertIn("openai/gpt-oss-120b", str(caught.exception))

    def test_groq_invalid_credentials_return_safe_error(self):
        import urllib.error

        def opener(request, timeout=None):
            raise urllib.error.HTTPError(
                request.full_url, 401, "Unauthorized", None, io.BytesIO(b'{"secret":"dont-leak"}')
            )
        provider = GroqRehearsalProvider(api_key="gsk_private", opener=opener)
        with self.assertRaises(AIUnavailableError) as caught:
            provider._complete("test", {"answer": "test"})
        self.assertIn("Groq", str(caught.exception))
        self.assertIn("401", str(caught.exception))
        self.assertNotIn("gsk_private", str(caught.exception))
        self.assertNotIn("dont-leak", str(caught.exception))

    def test_provider_auto_prefers_groq_and_supports_explicit_override(self):
        both = {"GROQ_API_KEY": "gsk_test",
                "OPENAI_API_KEY": "sk-test"}
        provider, name = configure_ai_provider(both)
        self.assertEqual(name, "groq")
        self.assertIsInstance(provider, GroqRehearsalProvider)
        self.assertEqual(provider.api_key, "gsk_test")

        provider, name = configure_ai_provider({**both, "AI_PROVIDER": "openai"})
        self.assertEqual(name, "openai")
        self.assertIsInstance(provider, OpenAIRehearsalProvider)
        self.assertNotIsInstance(provider, GroqRehearsalProvider)

        provider, name = configure_ai_provider({"GROQ_API_KEY": "gsk_test",
                                                 "AI_PROVIDER": "groq",
                                                 "GROQ_MODEL": "llama-3.1-8b-instant"})
        self.assertEqual(provider.model, "llama-3.1-8b-instant")
        self.assertEqual(name, "groq")

        provider, name = configure_ai_provider({"AI_PROVIDER": "groq"})
        self.assertEqual(name, "groq")
        self.assertFalse(provider.api_key)
        with self.assertRaises(AIUnavailableError):
            provider._complete("test", {"text": "anything"})
        with self.assertRaises(ValueError):
            configure_ai_provider({"AI_PROVIDER": "unsupported"})

    def test_misplaced_groq_key_fails_at_startup_before_network(self):
        for settings in (
            {"OPENAI_API_KEY": "gsk_fake-groq-key"},
            {"AI_PROVIDER": "openai", "OPENAI_API_KEY": "gsk_fake-groq-key"},
            {"AI_PROVIDER": "groq", "GROQ_API_KEY": "sk-fake-openai-key"},
        ):
            with self.subTest(settings=list(settings)):
                with self.assertRaisesRegex(ValueError, "Groq"):
                    configure_ai_provider(settings)
        provider, name = configure_ai_provider({
            "AI_PROVIDER": "groq",
            "GROQ_API_KEY": "gsk_valid-looking-test-value",
            "OPENAI_API_KEY": "sk_other-provider",
        })
        self.assertEqual(name, "groq")
        self.assertIsInstance(provider, GroqRehearsalProvider)
        self.assertTrue(provider.api_key.startswith("gsk_"))


if __name__ == "__main__":
    unittest.main()
