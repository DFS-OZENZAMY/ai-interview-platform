"""Faux serveur `pocket-tts serve` (Kyutai Pocket TTS) : POST /tts (multipart : text, voice_url) → audio/wav en streaming.
Génère une tonalité dont la durée suit la longueur du texte, par morceaux, au rythme d'une génération temps réel ×4.
Statistiques dans STATS_FILE. Usage : python3 mock_pocket_tts.py 8000 french"""
import json, math, os, struct, sys, time
from email.parser import BytesParser
from email.policy import default
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
PORT, LANG = int(sys.argv[1]), sys.argv[2] if len(sys.argv) > 2 else "french"
STATS = os.environ.get("STATS_FILE", f"/tmp/pocket_{LANG}.json"); VOICES = {"estelle", "alba", "jean", "fantine", "marius"}
stats = {"requests": 0, "texts": [], "voices": [], "rejected": 0}
def save(): open(STATS, "w").write(json.dumps(stats, ensure_ascii=False))
class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def log_message(self, *a): pass
    def do_GET(self):
        body = json.dumps({"status": "healthy"}).encode() if self.path == "/health" else b"{}"
        self.send_response(200 if self.path == "/health" else 404); self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_POST(self):
        if self.path != "/tts": self.send_response(404); self.send_header("content-length", "0"); self.end_headers(); return
        raw = self.rfile.read(int(self.headers["content-length"]))
        msg = BytesParser(policy=default).parsebytes(b"Content-Type: " + self.headers["content-type"].encode() + b"\r\n\r\n" + raw)
        fields = {p.get_param("name", header="content-disposition"): p.get_content() for p in msg.iter_parts()}
        text, voice = fields.get("text", "").strip(), fields.get("voice_url")
        if not text or (voice and voice not in VOICES and not str(voice).startswith(("http://", "https://", "hf://"))):
            stats["rejected"] += 1; save(); self.send_response(400); self.send_header("content-length", "0"); self.end_headers(); return
        stats["requests"] += 1; stats["texts"].append(text[:80]); stats["voices"].append(voice); save()
        sr, dur = 24000, max(1.0, 0.33 * len(text.split()))
        self.send_response(200); self.send_header("content-type", "audio/wav"); self.send_header("transfer-encoding", "chunked"); self.end_headers()
        def chunk(b): self.wfile.write(f"{len(b):x}\r\n".encode() + b + b"\r\n"); self.wfile.flush()
        # En-tête WAV « streaming » (tailles inconnues), comme une génération progressive.
        chunk(b"RIFF" + struct.pack("<I", 0xFFFFFFFF) + b"WAVEfmt " + struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16) + b"data" + struct.pack("<I", 0xFFFFFFFF))
        n, step = int(sr * dur), int(sr * 0.2)
        for start in range(0, n, step):
            frames = b"".join(struct.pack("<h", int(6000 * math.sin(2 * math.pi * (190 + 40 * math.sin(i / 2400)) * i / sr) * min(1, (n - i) / 2400))) for i in range(start, min(n, start + step)))
            chunk(frames); time.sleep(0.05)
        chunk(b"")
ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
