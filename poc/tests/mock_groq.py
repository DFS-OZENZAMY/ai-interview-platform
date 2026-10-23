"""Faux Groq (API compatible OpenAI) : enregistre chaque requête dans STATS_FILE et renvoie une relance ou un bilan.
Usage : python3 mock_groq.py 9200"""
import json, os, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
STATS = os.environ.get("STATS_FILE", "/tmp/groq_stats.json"); log = []
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_POST(self):
        b = json.loads(self.rfile.read(int(self.headers["content-length"])))
        log.append({"path": self.path, "auth": self.headers.get("authorization"), "ua": self.headers.get("user-agent"), "body": b}); open(STATS, "w").write(json.dumps(log, ensure_ascii=False))
        if self.headers.get("authorization") != "Bearer gsk_test_groq": self.send_response(401); self.end_headers(); return
        system = b["messages"][0]["content"]
        text = "Concrètement, quel indicateur avez-vous suivi pour mesurer l'effet de votre action ?" if "relance" in system else "Point fort : vos exemples sont concrets. À améliorer : chiffrez davantage vos résultats. Exercice : préparez trois histoires avec un indicateur."
        out = json.dumps({"choices": [{"message": {"role": "assistant", "content": text}}]}).encode()
        self.send_response(200); self.send_header("content-type", "application/json"); self.end_headers(); self.wfile.write(out)
HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
