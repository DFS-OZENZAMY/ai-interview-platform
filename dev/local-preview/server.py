#!/usr/bin/env python3
"""Local-only S2-03 question-bank preview. No database, auth, scoring or AI.

This DEV utility deliberately previews unapproved draft questions; it NEVER
calls Supabase or changes publication status. Bind to localhost only.
Run from the repo: python3 dev/local-preview/server.py
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import secrets
import threading
import webbrowser
import subprocess
import base64
import urllib.request
import urllib.error
import uuid
import tempfile
import shutil
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
NEW_USER = HERE.parent / "new-user-e2e"
sys.path.insert(0, str(HERE))
from ai_interview import InterviewLab, configure_ai_provider, LabValidationError, AIUnavailableError

BANK = ROOT / "data" / "question-bank"
FILES = (
    "rh_questions.json",
    "rh_questions_expansion.json",
    "technical_questions.json",
    "technical_questions_expansion_part1.json",
    "technical_questions_expansion_part2.json",
)
MAX_BODY = 15_000
MAX_ANSWER = 8_000


def load_questions(root: Path = BANK) -> list[dict]:
    questions = []
    for filename in FILES:
        raw = json.loads((root / filename).read_text(encoding="utf-8"))
        questions.extend(raw["questions"])
    codes = [q["code"] for q in questions]
    if len(codes) != len(set(codes)):
        raise RuntimeError("Duplicate question codes")
    # No expected answers, grading guidance or rubric weights leave this local API.
    return sorted(
        [{
            "code": q["code"],
            "family": q["family"],
            "category": q["category_code"],
            "difficulty": q["difficulty"],
            "status": q["status"],
            "fr": q["localizations"]["fr"]["prompt"],
            "en": q["localizations"]["en"]["prompt"],
            "followup_fr": q["localizations"]["fr"]["followup_seeds"][0],
            "followup_en": q["localizations"]["en"]["followup_seeds"][0],
        } for q in questions],
        key=lambda q: q["code"],
    )


def public_question(q: dict, locale: str) -> dict:
    return {
        "code": q["code"], "family": q["family"],
        "category": q["category"], "difficulty": q["difficulty"],
        "status": "draft", "prompt": q[locale],
        "followup": q["followup_" + locale],
    }


def select_questions(questions: list[dict], payload: dict) -> list[dict]:
    family = payload.get("family", "rh")
    locale = payload.get("locale", "fr")
    category = payload.get("category") or None
    difficulty = payload.get("difficulty")
    count = payload.get("count", 5)
    if family not in ("rh", "technical") or locale not in ("fr", "en"):
        raise ValueError("Invalid family or language")
    if category is not None and (not isinstance(category, str) or len(category) > 64):
        raise ValueError("Invalid category")
    if difficulty is not None and (type(difficulty) is not int or difficulty not in (1, 2, 3, 4)):
        raise ValueError("Invalid difficulty")
    if type(count) is not int or count not in range(1, 11):
        raise ValueError("Count must be between 1 and 10")
    matched = [
        q for q in questions
        if q["family"] == family and (category is None or q["category"] == category)
        and (difficulty is None or q["difficulty"] == difficulty)
    ]
    if not matched:
        raise ValueError("No questions match these filters")
    # Rotate the starting point for variety, but do not claim AI selection.
    start = secrets.randbelow(len(matched))
    return (matched[start:] + matched[:start])[:count]


def make_handler(questions: list[dict], sessions: dict, lock: threading.RLock):
    html = (HERE / "index.html").read_bytes()
    e2e_html = (NEW_USER / "index.html").read_bytes()
    e2e_js = (NEW_USER / "app.js").read_bytes()
    ai_provider, ai_provider_name = configure_ai_provider(os.environ)
    ai_lab = InterviewLab(questions, ai_provider)

    class Handler(BaseHTTPRequestHandler):
        server_version = "AIInterviewLocalPreview/1.0"

        def _headers(self, code=200, kind="application/json; charset=utf-8", length=None):
            self.send_response(code)
            self.send_header("Content-Type", kind)
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Security-Policy",
                "default-src 'self'; script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co; "
                "img-src 'self' data:; object-src 'none'; frame-ancestors 'none'")
            if length is not None:
                self.send_header("Content-Length", str(length))
            self.end_headers()

        def _send(self, obj, code=200):
            payload = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self._headers(code, length=len(payload))
            self.wfile.write(payload)

        def _allowed_host(self):
            host = self.headers.get("Host", "")
            allowed = {f"localhost:{self.server.server_port}",
                       f"127.0.0.1:{self.server.server_port}"}
            return host in allowed

        def _same_origin(self):
            origin = self.headers.get("Origin")
            if not origin:
                return True  # CLI clients can omit Origin; still loopback only.
            return origin in {f"http://localhost:{self.server.server_port}",
                              f"http://127.0.0.1:{self.server.server_port}"}

        def do_GET(self):
            if not self._allowed_host():
                return self._send({"error": "invalid_host"}, 403)
            url = urlsplit(self.path)
            if url.path == "/":
                self._headers(kind="text/html; charset=utf-8", length=len(html))
                self.wfile.write(html)
            elif url.path in ("/e2e", "/e2e/"):
                self._headers(kind="text/html; charset=utf-8", length=len(e2e_html))
                self.wfile.write(e2e_html)
            elif url.path == "/e2e/app.js":
                self._headers(kind="text/javascript; charset=utf-8", length=len(e2e_js))
                self.wfile.write(e2e_js)
            elif url.path == "/api/ai/status":
                self._send({
                    "available": bool(ai_provider.api_key),
                    "provider": ai_provider_name if ai_provider.api_key else "not_configured",
                    "model": ai_provider.model if ai_provider.api_key else None,
                    "draft_preview": True,
                    "persistent": False,
                })
            elif url.path == "/api/e2e/config":
                live_enabled = (os.environ.get("SUPABASE_URL", "").startswith("https://")
                                and bool(os.environ.get("SUPABASE_PUBLISHABLE_KEY", "")))
                self._send({
                    "live_available": live_enabled,
                    "supabase_url": os.environ.get("SUPABASE_URL", "").rstrip("/") if live_enabled else None,
                    "publishable_key": os.environ.get("SUPABASE_PUBLISHABLE_KEY") if live_enabled else None,
                    "mode": "local_e2e_frontend",
                })
            elif url.path == "/api/health":
                self._send({"ready": True, "mode": "local_draft_preview",
                            "supabase_connected": False})
            elif url.path == "/api/stats":
                counts = {"rh": 0, "technical": 0}
                for q in questions:
                    counts[q["family"]] += 1
                self._send({"questions": len(questions), "families": counts,
                            "languages": ["fr", "en"],
                            "localizations": len(questions) * 2,
                            "drafts": sum(q["status"] == "draft" for q in questions),
                            "supabase_connected": False})
            elif url.path == "/api/questions":
                params = parse_qs(url.query)
                locale = params.get("locale", ["fr"])[0]
                if locale not in ("fr", "en"):
                    return self._send({"error": "invalid_locale"}, 400)
                family = params.get("family", ["all"])[0]
                if family not in ("all", "rh", "technical"):
                    return self._send({"error": "invalid_family"}, 400)
                items = [public_question(q, locale) for q in questions
                         if family == "all" or q["family"] == family]
                return self._send({"items": items, "count": len(items),
                                   "preview_only": True})
            else:
                self._send({"error": "not_found"}, 404)

        def do_POST(self):
            if not self._allowed_host() or not self._same_origin():
                return self._send({"error": "request_origin_not_allowed"}, 403)
            if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                return self._send({"error": "content_type_must_be_json"}, 415)
            try:
                length = int(self.headers.get("Content-Length", "0"))
                max_body = 6_500_000 if urlsplit(self.path).path == "/api/ai/transcribe" else MAX_BODY
                if not 1 <= length <= max_body:
                    return self._send({"error": "invalid_body_size"}, 413)
                body = json.loads(self.rfile.read(length))
                if not isinstance(body, dict):
                    raise ValueError("Body must be an object")
            except (ValueError, json.JSONDecodeError):
                return self._send({"error": "invalid_json"}, 400)
            url = urlsplit(self.path)
            if url.path == "/api/ai/transcribe":
                sound = body.get("audio")
                context = body.get("context", "")
                mime = body.get("mime", "audio/webm")
                if not isinstance(sound, str) or not sound or len(sound) > 6_500_000:
                    return self._send({"error": "invalid_audio"}, 400)
                if not isinstance(context, str) or len(context) > 300 or mime not in (
                        "audio/webm", "audio/mp4", "audio/ogg"):
                    return self._send({"error": "invalid_audio_metadata"}, 400)
                key = os.environ.get("GROQ_API_KEY", "")
                if not key:
                    return self._send({"error": "groq_key_missing"}, 503)
                try:
                    raw = base64.b64decode(sound, validate=True)
                    if not 100 < len(raw) <= 4_800_000:
                        return self._send({"error": "invalid_audio_size"}, 400)
                    boundary = uuid.uuid4().hex
                    def part(name, value, filename=None, content_type=None):
                        lead = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\""
                                + (f"; filename=\"{filename}\"" if filename else "") + "\r\n")
                        if content_type:
                            lead += f"Content-Type: {content_type}\r\n"
                        return lead.encode() + b"\r\n" + value + b"\r\n"
                    ext = {"audio/webm": "webm", "audio/mp4": "mp4", "audio/ogg": "ogg"}[mime]
                    payload = (part("model", b"whisper-large-v3")
                               + part("response_format", b"json")
                               + part("prompt", (context or "Entretien professionnel en français et en anglais. Business, data, management, talent acquisition.").encode("utf-8"))
                               + part("file", raw, f"answer.{ext}", mime)
                               + f"--{boundary}--\r\n".encode())
                    req = urllib.request.Request(
                        "https://api.groq.com/openai/v1/audio/transcriptions", data=payload,
                        headers={"Authorization": f"Bearer {key}",
                                 "Content-Type": f"multipart/form-data; boundary={boundary}"},
                        method="POST")
                    with urllib.request.urlopen(req, timeout=40) as response:
                        transcript = json.loads(response.read(100_000))
                    text = transcript.get("text", "")
                    if not isinstance(text, str):
                        return self._send({"error": "invalid_transcription"}, 502)
                    return self._send({"text": text.strip(), "engine": "whisper-large-v3"})
                except (ValueError, urllib.error.URLError, TimeoutError, json.JSONDecodeError):
                    return self._send({"error": "transcription_unavailable"}, 502)
            if url.path == "/api/ai/tts":
                sentence = body.get("text")
                locale = body.get("locale", "fr")
                if (not isinstance(sentence, str) or not 1 <= len(sentence.strip()) <= 1200
                        or locale not in ("fr", "en")):
                    return self._send({"error": "invalid_tts_payload"}, 400)
                if sys.platform != "darwin" or not shutil.which("say") or not shutil.which("ffmpeg"):
                    return self._send({"error": "local_tts_unavailable"}, 503)
                try:
                    with tempfile.TemporaryDirectory(prefix="interview-tts-") as tmp:
                        aiff = str(Path(tmp) / "question.aiff")
                        mp3 = str(Path(tmp) / "question.mp3")
                        subprocess.run(["say", "-v", "Thomas" if locale == "fr" else "Samantha",
                                        "-r", "175", "-o", aiff, sentence], check=True,
                                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=22)
                        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", aiff,
                                        "-codec:a", "libmp3lame", "-qscale:a", "4", mp3],
                                       check=True, stdout=subprocess.DEVNULL,
                                       stderr=subprocess.DEVNULL, timeout=12)
                        sound = Path(mp3).read_bytes()
                    self._headers(200, "audio/mpeg", len(sound))
                    self.wfile.write(sound)
                except (subprocess.TimeoutExpired, subprocess.CalledProcessError, OSError):
                    return self._send({"error": "local_tts_generation_failed"}, 503)
                return
            if url.path == "/api/ai/session/start":
                if not ai_provider.api_key:
                    return self._send({"error": "Clé API du fournisseur sélectionné non configurée (GROQ_API_KEY ou OPENAI_API_KEY)."}, 503)
                try:
                    response = ai_lab.start(body)
                    return self._send(response, 201)
                except LabValidationError as exc:
                    return self._send({"error": str(exc)}, 400)
            if url.path == "/api/ai/session/answer":
                if not ai_provider.api_key:
                    return self._send({"error": "OPENAI_API_KEY non configurée sur ce serveur local."}, 503)
                try:
                    return self._send(ai_lab.answer(body))
                except LabValidationError as exc:
                    return self._send({"error": str(exc)}, 400)
                except AIUnavailableError as exc:
                    return self._send({"error": str(exc)}, 502)
            if url.path == "/api/session/start":
                try:
                    selected = select_questions(questions, body)
                except ValueError as exc:
                    return self._send({"error": str(exc)}, 400)
                locale = body.get("locale", "fr")
                session_id = secrets.token_urlsafe(22)
                with lock:
                    sessions[session_id] = {
                        "locale": locale, "selected": selected, "index": 0,
                        "answers": [],
                    }
                return self._send({"session_id": session_id,
                    "total": len(selected), "index": 1,
                    "question": public_question(selected[0], locale),
                    "preview_only": True}, 201)
            if url.path == "/api/session/answer":
                session_id = body.get("session_id")
                answer = body.get("answer")
                if not isinstance(session_id, str) or not isinstance(answer, str):
                    return self._send({"error": "invalid_session_or_answer"}, 400)
                if len(answer) > MAX_ANSWER:
                    return self._send({"error": "answer_too_long"}, 413)
                with lock:
                    session = sessions.get(session_id)
                    if not session:
                        return self._send({"error": "unknown_session"}, 404)
                    i = session["index"]
                    if i >= len(session["selected"]):
                        return self._send({"error": "session_completed"}, 409)
                    current = session["selected"][i]
                    session["answers"].append({
                        "code": current["code"],
                        "prompt": current[session["locale"]],
                        "answer": answer,
                    })
                    session["index"] += 1
                    done = session["index"] == len(session["selected"])
                    if done:
                        results = session["answers"]
                        del sessions[session_id]
                        return self._send({
                            "completed": True, "answers": results,
                            "evaluated": False, "persisted": False,
                            "preview_only": True,
                        })
                    next_q = session["selected"][session["index"]]
                    return self._send({
                        "completed": False, "session_id": session_id,
                        "total": len(session["selected"]),
                        "index": session["index"] + 1,
                        "question": public_question(next_q, session["locale"]),
                        "preview_only": True,
                    })
            self._send({"error": "not_found"}, 404)

        def log_message(self, fmt, *args):
            # No log of candidate answers or question content.
            pass
    return Handler


def main():
    parser = argparse.ArgumentParser(description="Private localhost preview of draft interview questions")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-open", action="store_true", help="Do not open your browser")
    args = parser.parse_args()
    questions = load_questions()
    sessions = {}
    lock = threading.RLock()
    address = f"http://127.0.0.1:{args.port}"
    provider, provider_name = configure_ai_provider(os.environ)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(questions, sessions, lock))
    key_status = "configurée" if provider.api_key else "absente"
    print(f"\nAI Interview Platform — LOCAL DRAFT PREVIEW\n{address}\n"
          f"{len(questions)} draft questions ready. No Supabase, AI scoring or production data.\n"
          f"IA active : {provider_name.upper()} | modèle : {provider.model} | clé : {key_status}\n"
          f"Diagnostic sans secret : {address}/api/ai/status\n"
          "Press Ctrl+C to stop.\n", flush=True)
    if not args.no_open:
        threading.Timer(0.5, webbrowser.open, args=(address,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
