"""Faux Supabase (Auth + PostgREST) pour tester l'application web d'Achraf sans son vrai projet.
Un seul compte candidat valide : jeton « tok-candidat ». Usage : python3 mock_supabase_auth.py 9300"""
import json, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
USER = {"id": "11111111-2222-4333-8444-555555555555", "aud": "authenticated", "role": "authenticated", "email": "salma@exemple.com", "app_metadata": {}, "user_metadata": {}}
PROFILE = {"first_name": "Salma", "last_name": "Idrissi", "employment_status": "student", "experience_level": None, "professional_goal": "first_job", "preparation_goals": ["communication"], "preferred_locale": "fr", "onboarding_completed_at": "2026-10-23T10:00:00Z"}
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def send(self, code, data):
        b = json.dumps(data).encode(); self.send_response(code); self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        auth = self.headers.get("authorization", "")
        if self.path.startswith("/auth/v1/user"):
            return self.send(200, USER) if auth == "Bearer tok-candidat" else self.send(401, {"msg": "invalid JWT"})
        if self.path.startswith("/rest/v1/"):
            table = self.path.split("/rest/v1/")[1].split("?")[0]
            rows = {"app_user_roles": [], "candidate_profiles": [PROFILE], "candidate_interview_results": []}.get(table, [])
            if "vnd.pgrst.object" in self.headers.get("accept", ""):
                return self.send(200, rows[0]) if rows else self.send(406, {"code": "PGRST116", "details": "0 rows", "message": "no rows"})
            return self.send(200, rows)
        self.send(404, {})
    do_HEAD = do_GET
ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
