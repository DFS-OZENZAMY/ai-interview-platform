"""Faux ElevenLabs (même port pour HTTP et WebSocket, comme api.elevenlabs.io) :
 - POST /v1/text-to-speech/{voice_id}/stream : clé xi-api-key, JSON {text, model_id, language_code} → audio/mpeg (vrai MP3, ffmpeg)
 - POST /v1/single-use-token/realtime_scribe  : clé xi-api-key → {token} (usage unique)
 - WSS  /v1/speech-to-text/realtime?token=…   : session_started, partial_transcript, committed_transcript (VAD)
Statistiques dans STATS_FILE. Usage : python3 mock_elevenlabs.py 9100"""
import asyncio, base64, json, os, secrets, struct, subprocess, sys, math
from aiohttp import web, WSMsgType
KEY = os.environ.get("EL_KEY", "sk_test_elevenlabs"); STATS = os.environ.get("STATS_FILE", "/tmp/elevenlabs_stats.json")
stats = {"tts": [], "tokens_issued": 0, "ws_sessions": 0, "ws_rejected": 0, "chunks": 0, "bad_chunks": 0, "commits": 0, "key_rejected": 0}
TOKENS = set(); MP3 = {}; ADDED = {}
MODELS = set((os.environ.get("MOCK_MODELS") or "eleven_v4_turbo,eleven_multilingual_v2,eleven_flash_v2_5").split(","))
LIB = [  # voix françaises natives fictives de la bibliothèque
  {"voice_id": f"frVoice{i:03d}abcd", "public_owner_id": f"owner{i:03d}xyz123", "name": n, "gender": g, "age": a, "accent": "parisian", "language": "fr", "use_case": "conversational", "description": d}
  for i, (n, g, a, d) in enumerate([("Camille", "female", "middle_aged", "Voix posée et professionnelle, idéale pour un entretien."), ("Julien", "male", "middle_aged", "Manager calme et direct."),
                                    ("Inès", "female", "young", "Voix dynamique et souriante."), ("Mehdi", "male", "young", "Voix chaleureuse, accent neutre."), ("Claire", "female", "old", "DRH expérimentée, ton ferme.")])]
SENTENCE = "Lors de mon dernier stage chez un assureur j'ai automatisé le reporting ce qui a fait gagner six heures par semaine à l'équipe".split()
def save(): open(STATS, "w").write(json.dumps(stats, ensure_ascii=False))
def mp3(seconds):
    s = round(seconds, 1)
    if s not in MP3:
        MP3[s] = subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", f"sine=frequency=220:duration={s}", "-ac", "1", "-ar", "44100", "-b:a", "128k", "-f", "mp3", "-"], capture_output=True, check=True).stdout
    return MP3[s]
async def tts(req):
    if req.headers.get("xi-api-key") != KEY: stats["key_rejected"] += 1; save(); return web.json_response({"detail": {"status": "invalid_api_key"}}, status=401)
    b = await req.json(); text = b.get("text", "")
    if b.get("model_id") not in MODELS: stats.setdefault("model_rejected", []).append(b.get("model_id")); save(); return web.json_response({"detail": {"status": "model_not_supported"}}, status=400)
    if b.get("model_id") == "eleven_multilingual_v2" and "language_code" in b: return web.json_response({"detail": "language_code not supported"}, status=400)
    if not text or req.query.get("output_format") != "mp3_44100_128": return web.json_response({"detail": "bad request"}, status=422)
    stats["tts"].append({"voice": req.match_info["voice"], "model": b.get("model_id"), "lang": b.get("language_code"), "text": text[:60]}); save()
    resp = web.StreamResponse(headers={"content-type": "audio/mpeg"}); await resp.prepare(req)
    data = mp3(max(0.8, 0.3 * len(text.split())))
    for i in range(0, len(data), 8192): await resp.write(data[i:i + 8192]); await asyncio.sleep(0.03)
    await resp.write_eof(); return resp
async def token(req):
    if req.headers.get("xi-api-key") != KEY: stats["key_rejected"] += 1; save(); return web.json_response({"detail": "invalid_api_key"}, status=401)
    t = "sutkn_" + secrets.token_hex(12); TOKENS.add(t); stats["tokens_issued"] += 1; save(); return web.json_response({"token": t})
async def realtime(req):
    q = req.query; t = q.get("token")
    if t not in TOKENS or q.get("model_id") != "scribe_v2_realtime" or q.get("audio_format") != "pcm_16000":
        stats["ws_rejected"] += 1; save(); return web.json_response({"detail": "unauthorized"}, status=401)
    TOKENS.discard(t)                                              # usage unique
    ws = web.WebSocketResponse(); await ws.prepare(req); stats["ws_sessions"] += 1; save()
    await ws.send_json({"message_type": "session_started", "session_id": "sess_" + secrets.token_hex(4), "config": {"audio_format": "pcm_16000", "model_id": "scribe_v2_realtime", "language_code": q.get("language_code"), "sample_rate": 16000}})
    seg, wi, voiced, silent = [], 0, 0, 0
    async def commit():
        nonlocal seg
        if seg: await ws.send_json({"message_type": "committed_transcript", "text": " ".join(seg)}); stats["commits"] += 1; seg = []; save()
    async for msg in ws:
        if msg.type != WSMsgType.TEXT: continue
        m = json.loads(msg.data)
        if m.get("message_type") != "input_audio_chunk": continue
        raw = base64.b64decode(m.get("audio_base_64") or "")
        if raw:
            ok = m.get("sample_rate") == 16000 and len(raw) % 2 == 0 and len(raw) <= 32000
            stats["chunks"] += 1; stats["bad_chunks"] += 0 if ok else 1
            pcm = struct.unpack(f"<{len(raw)//2}h", raw) if ok else ()
            rms = math.sqrt(sum(x * x for x in pcm) / max(1, len(pcm))) / 32768
            if rms > 0.01:
                voiced += 1; silent = 0
                if voiced % 3 == 0 and wi < len(SENTENCE):
                    seg.append(SENTENCE[wi]); wi += 1
                    await ws.send_json({"message_type": "partial_transcript", "text": " ".join(seg)})
            else:
                silent += 1
                if silent == 6: await commit()                    # ~0,6 s de silence : VAD
        if m.get("commit"): await commit()
        if stats["chunks"] % 20 == 0: save()
    save(); return ws
async def shared(req):
    if req.headers.get("xi-api-key") != KEY: return web.json_response({"detail": "invalid_api_key"}, status=401)
    q = req.query; v = [x for x in LIB if x["language"] == q.get("language", "fr") and (not q.get("gender") or x["gender"] == q.get("gender")) and (not q.get("search") or q["search"].lower() in (x["name"] + x["description"]).lower())]
    stats["library_queries"] = stats.get("library_queries", 0) + 1; save()
    return web.json_response({"has_more": False, "voices": [{**x, "preview_url": f"http://{req.host}/preview/{x['voice_id']}.mp3"} for x in v]})
async def add_voice(req):
    if req.headers.get("xi-api-key") != KEY: return web.json_response({"detail": "invalid_api_key"}, status=401)
    o, vid = req.match_info["owner"], req.match_info["voice"]
    if not any(x["voice_id"] == vid and x["public_owner_id"] == o for x in LIB): return web.json_response({"detail": "voice_not_found"}, status=404)
    new_id = "acct" + vid[:12]; ADDED[new_id] = (await req.json()).get("new_name"); stats["added"] = ADDED; save()
    return web.json_response({"voice_id": new_id})
async def preview(req):
    return web.Response(body=mp3(1.5), content_type="audio/mpeg")
app = web.Application()
app.router.add_get("/v1/shared-voices", shared)
app.router.add_post("/v1/voices/add/{owner}/{voice}", add_voice)
app.router.add_get("/preview/{name}", preview)
app.router.add_post("/v1/text-to-speech/{voice}/stream", tts)
app.router.add_post("/v1/single-use-token/realtime_scribe", token)
app.router.add_get("/v1/speech-to-text/realtime", realtime)
web.run_app(app, host="127.0.0.1", port=int(sys.argv[1]), print=None)
