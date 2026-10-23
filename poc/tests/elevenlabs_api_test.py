"""Teste l'intégration ElevenLabs (voix par agent + jetons Scribe) via l'API de la plateforme.
Usage : BASE=http://127.0.0.1:8080 STATS_FILE=/tmp/elevenlabs_stats.json python3 elevenlabs_api_test.py"""
import os, json, uuid, requests, asyncio
B = os.environ["BASE"]; ok = lambda c, m: print(("PASS " if c else "FAIL ") + m)
h = requests.get(B + "/api/health").json()
ok(h["tts"] == "elevenlabs" and h["stt"] == "elevenlabs" and h["sttMode"] == "token" and h["agentVoices"], f"santé : voix {h['tts']}, dictée {h['stt']} ({h['sttMode']})")
s = requests.Session(); s.headers.update({"Content-Type": "application/json", "Origin": B})
r = s.post(B + "/api/auth/register", json={"role": "candidate", "name": "El Test", "email": f"e{uuid.uuid4().hex[:6]}@t.io", "password": "motdepasse1", "consent": True})
s.headers["Cookie"] = "sid=" + r.headers["set-cookie"].split("sid=")[1].split(";")[0]
ag = s.get(B + "/api/agents").json()
ok([a["id"] for a in ag["agents"]] == ["lina", "karim", "sofia", "adam"] and ag["voices"], "4 agents proposés : " + ", ".join(a["name"] + " (" + a["title"] + ")" for a in ag["agents"]))
ok(all("voice" not in a for a in ag["agents"]), "les identifiants de voix ne sont pas exposés au navigateur")
ok(requests.get(B + "/api/agents").status_code == 401, "liste des agents réservée aux comptes connectés")
r = s.get(B + "/api/tts", params={"lang": "fr", "text": "Bonjour, je suis Karim. Allons droit au but.", "agent": "karim"})
ok(r.status_code == 200 and r.headers["content-type"] == "audio/mpeg" and (r.content[:3] == b"ID3" or r.content[0] == 0xFF), f"voix de Karim : MP3 reçu ({len(r.content)//1024} Ko)")
s.get(B + "/api/tts", params={"lang": "fr", "text": "Bonjour, je suis Karim. Allons droit au but.", "agent": "lina"})
r2 = s.get(B + "/api/tts", params={"lang": "fr", "text": "Bonjour, je suis Karim. Allons droit au but.", "agent": "karim"})
ok(r2.headers.get("x-tts-cache") == "hit", "cache distinct par agent (Karim resservi depuis le cache)")
s.get(B + "/api/tts", params={"lang": "en", "text": "Hello there", "agent": "inconnu"})
st = json.load(open(os.environ["STATS_FILE"]))
voices = [t["voice"] for t in st["tts"]]
ok(voices[:2] == ["JBFqnCBsd6RMkjVDRZzb", "EXAVITQu4vr4xnSDxMaL"], "chaque agent parle avec sa propre voix ElevenLabs")
ok(voices[2] == "EXAVITQu4vr4xnSDxMaL" and st["tts"][2]["lang"] == "en", "agent inconnu : repli sur l'agent par défaut ; langue anglaise transmise")
ok(all(t["model"] == "eleven_flash_v2_5" for t in st["tts"]), "modèle Flash v2.5 (faible latence)")
tk = s.post(B + "/api/stt/token", json={"lang": "fr"}).json()
ok("token=" in tk["url"] and "sk_" not in json.dumps(tk) and "language_code=fr" in tk["url"] and tk["sampleRate"] == 16000, "jeton de dictée à usage unique (sans clé API), français, 16 kHz")
ok(requests.post(B + "/api/stt/token", headers={"Content-Type": "application/json", "Origin": B}, json={}).status_code == 401, "jeton refusé sans connexion")
async def ws_check():
    import websockets
    async with websockets.connect(tk["url"]) as w:
        first = json.loads(await w.recv()); return first["message_type"]
ok(asyncio.run(ws_check()) == "session_started", "connexion directe à Scribe avec le jeton : session ouverte")
async def reuse():
    import websockets
    try:
        async with websockets.connect(tk["url"]) as w: return "accepté"
    except Exception: return "refusé"
ok(asyncio.run(reuse()) == "refusé", "le même jeton ne peut pas être réutilisé")
codes = [s.post(B + "/api/stt/token", json={"lang": "fr"}).status_code for _ in range(32)]
ok(429 in codes, f"limite : {codes.count(200)} jetons puis 429")
