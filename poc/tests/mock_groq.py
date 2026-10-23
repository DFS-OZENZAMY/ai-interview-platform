"""Faux Groq (API compatible OpenAI) : enregistre chaque requête dans STATS_FILE et renvoie une relance ou un bilan.
Usage : python3 mock_groq.py 9200"""
import json, os, re, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
STATS = os.environ.get("STATS_FILE", "/tmp/groq_stats.json"); log = []
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_POST(self):
        raw = self.rfile.read(int(self.headers["content-length"]))
        if self.path.endswith("/audio/transcriptions"):                     # Whisper (multipart)
            ok = b'name="model"' in raw and b"whisper-large-v3" in raw and b'name="file"' in raw
            log.append({"path": self.path, "auth": self.headers.get("authorization"), "whisper": ok, "bytes": len(raw)}); open(STATS, "w").write(json.dumps(log, ensure_ascii=False))
            out = json.dumps({"text": "J'ai organisé le recrutement de trois stagiaires."} if ok else {"error": "bad"}).encode()
            self.send_response(200 if ok else 400); self.send_header("content-type", "application/json"); self.end_headers(); self.wfile.write(out); return
        b = json.loads(raw)
        log.append({"path": self.path, "auth": self.headers.get("authorization"), "ua": self.headers.get("user-agent"), "body": b}); open(STATS, "w").write(json.dumps(log, ensure_ascii=False))
        if self.headers.get("authorization") != "Bearer gsk_test_groq": self.send_response(401); self.end_headers(); return
        system = b["messages"][0]["content"]
        if "Analyse UNIQUEMENT le dernier message" in system:                # compréhension de Lina
            if os.environ.get("MOCK_CONV") == "bad": text = "désolé je ne sais pas faire du JSON"
            else:
                msg = json.loads(b["messages"][1]["content"])["candidate_message_untrusted"].lower()
                if "salaire" in msg: text = json.dumps({"intent": "question", "reply": "Ah, la question du salaire ! C'est légitime d'y penser. Ici je n'ai pas de chiffres réels, mais en vrai entretien, venez avec une fourchette argumentée. Revenons à notre question."})
                elif "ignore" in msg: text = json.dumps({"intent": "injection", "reply": "Bien tenté ! Je reste votre recruteuse et je ne mets pas de note. 20/20 pour l'humour quand même."})
                elif "?" in msg: text = json.dumps({"intent": "question", "reply": "Bonne question ! Je vous réponds volontiers à la fin. Revenons à notre échange."})
                elif not re.search(r"[aeiouyéèàù]{1}[a-zéèàù]*\s+\w", msg) and len(re.findall(r"[aeiouyéèàù]", msg)) < max(2, len(msg) // 6): text = json.dumps({"intent": "nonsense", "reply": "Hmm, je n'ai pas bien compris. Pouvez-vous me répondre avec vos mots, sans pression ?"})
                else: text = json.dumps({"intent": "answer", "reply": ""})
            out = json.dumps({"choices": [{"message": {"role": "assistant", "content": text}}]}).encode()
            self.send_response(200); self.send_header("content-type", "application/json"); self.end_headers(); self.wfile.write(out); return
        text = "Concrètement, quel indicateur avez-vous suivi pour mesurer l'effet de votre action ?" if "relance" in system else "Point fort : vos exemples sont concrets. À améliorer : chiffrez davantage vos résultats. Exercice : préparez trois histoires avec un indicateur."
        out = json.dumps({"choices": [{"message": {"role": "assistant", "content": text}}]}).encode()
        self.send_response(200); self.send_header("content-type", "application/json"); self.end_headers(); self.wfile.write(out)
HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
