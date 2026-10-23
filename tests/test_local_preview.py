"""Localhost preview HTTP contract tests (no external dependencies)."""
import http.client
import importlib.util
import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_FILE = ROOT / "dev" / "local-preview" / "server.py"
spec = importlib.util.spec_from_file_location("local_preview", MODULE_FILE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class LocalPreviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.questions = module.load_questions()
        cls.sessions = {}
        cls.lock = threading.RLock()
        handler = module.make_handler(cls.questions, cls.sessions, cls.lock)
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.port = cls.server.server_port
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=3)

    def request(self, method, path, data=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        body = json.dumps(data, ensure_ascii=False).encode("utf-8") if data is not None else None
        request_headers = dict(headers or {})
        if body is not None:
            request_headers.setdefault("Content-Type", "application/json")
        conn.request(method, path, body=body, headers=request_headers)
        response = conn.getresponse()
        raw = response.read()
        code = response.status
        kind = response.getheader("content-type")
        conn.close()
        return code, json.loads(raw) if "json" in kind else raw.decode("utf-8")

    def test_corpus_size_and_private_scoring_fields(self):
        self.assertEqual(len(self.questions), 120)
        self.assertEqual(len({q["code"] for q in self.questions}), 120)
        code, stats = self.request("GET", "/api/stats")
        self.assertEqual(code, 200)
        self.assertEqual(stats["questions"], 120)
        self.assertEqual(stats["families"], {"rh": 50, "technical": 70})
        self.assertEqual(stats["localizations"], 240)
        self.assertFalse(stats["supabase_connected"])
        code, data = self.request("GET", "/api/questions?locale=fr")
        self.assertEqual(code, 200)
        self.assertEqual(len(data["items"]), 120)
        self.assertTrue(data["preview_only"])
        for q in data["items"]:
            self.assertEqual(q["status"], "draft")
            for field in ("expected_elements_fr", "red_flags_fr", "evaluation_notes_fr",
                          "acceptable_variations_fr", "rubric_code", "weights", "scale"):
                self.assertNotIn(field, q)

    def test_fr_en_localizations(self):
        code, fr = self.request("GET", "/api/questions?family=technical&locale=fr")
        self.assertEqual(code, 200)
        self.assertEqual(fr["count"], 70)
        code, en = self.request("GET", "/api/questions?family=technical&locale=en")
        self.assertEqual(code, 200)
        self.assertEqual(en["count"], 70)
        self.assertNotEqual(fr["items"][0]["prompt"], en["items"][0]["prompt"])

    def test_mock_interview_full_lifecycle(self):
        code, start = self.request("POST", "/api/session/start",
                                    {"family": "rh", "locale": "fr", "count": 3})
        self.assertEqual(code, 201)
        self.assertTrue(start["preview_only"])
        self.assertEqual(start["total"], 3)
        self.assertEqual(start["index"], 1)
        sid = start["session_id"]
        codes = {start["question"]["code"]}
        for i in range(3):
            code, result = self.request("POST", "/api/session/answer",
                                        {"session_id": sid, "answer": "Réponse test " + str(i)})
            self.assertEqual(code, 200)
            if i < 2:
                self.assertFalse(result["completed"])
                codes.add(result["question"]["code"])
                self.assertEqual(result["index"], i + 2)
            else:
                self.assertTrue(result["completed"])
                self.assertFalse(result["evaluated"])
                self.assertFalse(result["persisted"])
                self.assertEqual(len(result["answers"]), 3)
        self.assertEqual(len(codes), 3)
        code, result = self.request("POST", "/api/session/answer",
                                    {"session_id": sid, "answer": "After completion"})
        self.assertEqual(code, 404)

    def test_reject_bad_filters_and_oversized_answers(self):
        code, data = self.request("POST", "/api/session/start",
                                  {"family": "rh", "locale": "es"})
        self.assertEqual(code, 400)
        code, data = self.request("POST", "/api/session/start",
                                  {"family": "technical", "difficulty": 9})
        self.assertEqual(code, 400)
        code, data = self.request("GET", "/api/questions?locale=es")
        self.assertEqual(code, 400)
        code, data = self.request("POST", "/api/session/answer",
                                  {"session_id": "fake", "answer": "x" * 8001})
        self.assertEqual(code, 413)

    def test_host_origin_and_content_type_checks(self):
        code, _ = self.request("GET", "/api/stats", headers={"Host": "attacker.example"})
        self.assertEqual(code, 403)
        code, _ = self.request("POST", "/api/session/start",
                                {"family": "rh"}, headers={"Origin": "https://attacker.example"})
        self.assertEqual(code, 403)
        code, _ = self.request("POST", "/api/session/start",
                                {"family": "rh"}, headers={"Content-Type": "text/plain"})
        self.assertEqual(code, 415)

    def test_frontend_is_served(self):
        code, html = self.request("GET", "/")
        self.assertEqual(code, 200)
        self.assertIn("INTERVIEW PLATFORM", html)
        self.assertIn("Mode démonstration locale", html)
        self.assertIn("simulation", html.lower())


if __name__ == "__main__":
    unittest.main()
