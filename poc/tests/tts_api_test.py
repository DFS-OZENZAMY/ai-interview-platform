"""Teste la voix de Lina servie par Pocket TTS via /api/tts. Usage : BASE=http://127.0.0.1:8080 python3 tts_api_test.py"""
import os, time, requests, uuid, json
B = os.environ["BASE"]; ok = lambda c, m: print(("PASS " if c else "FAIL ") + m)
h = requests.get(B + "/api/health").json(); ok(h["tts"] == "pocket-tts" and "fr" in h["ttsLanguages"], f"santé : voix {h['tts']} {h['ttsLanguages']}")
s = requests.Session(); s.headers.update({"Content-Type": "application/json", "Origin": B})
r = s.post(B + "/api/auth/register", json={"role": "candidate", "name": "Tts Test", "email": f"t{uuid.uuid4().hex[:6]}@t.io", "password": "motdepasse1", "consent": True})
s.headers["Cookie"] = "sid=" + r.headers["set-cookie"].split("sid=")[1].split(";")[0]
Q = "Pour commencer, présentez-vous en deux minutes : votre parcours et ce qui vous amène vers ce poste."
ok(requests.get(B + "/api/tts", params={"lang": "fr", "text": Q}).status_code == 401, "anonyme refusé")
t0 = time.time(); r = s.get(B + "/api/tts", params={"lang": "fr", "text": Q}, stream=True)
it = r.iter_content(None); first = next(it); t_first = time.time() - t0; parts = [first]
while sum(map(len, parts)) < 200 * 1024 and t_first > 0:
    try: parts.append(next(it))
    except StopIteration: break
t_audio = time.time() - t0; body = b"".join(parts) + b"".join(it); t_all = time.time() - t0
ok(r.status_code == 200 and r.headers["content-type"] == "audio/wav" and body[:4] == b"RIFF", f"WAV reçu ({len(body)//1024} Ko)")
ok(t_first < t_all / 2, f"streaming : premiers octets à {t_first:.2f} s, fin de génération à {t_all:.2f} s")
ok(r.headers.get("x-tts-cache") == "miss", "1re demande : générée")
time.sleep(0.5); t0 = time.time(); r2 = s.get(B + "/api/tts", params={"lang": "fr", "text": Q})
ok(r2.headers.get("x-tts-cache") == "hit" and r2.content == body, f"2e demande : servie depuis le cache en {time.time()-t0:.2f} s, identique")
ok(s.get(B + "/api/tts", params={"lang": "fr", "text": "x" * 501}).status_code == 400, "texte trop long refusé")
ok(s.get(B + "/api/tts", params={"lang": "fr", "text": "Bonjour", "voice_url": "http://169.254.169.254/latest"}).status_code == 200, "paramètre voice_url du client ignoré")
st = json.load(open(os.environ.get("STATS_FILE", "/tmp/pocket_french.json")))
ok(all(v == "estelle" for v in st["voices"]), f"voix imposée par le serveur uniquement : {set(st['voices'])}")
ok(st["requests"] == 2, f"Pocket TTS sollicité {st['requests']} fois (le cache évite les doublons)")
codes = [s.get(B + "/api/tts", params={"lang": "fr", "text": f"Phrase numéro {i}"}).status_code for i in range(60)]
ok(429 in codes, f"limite de débit : {codes.count(200)} acceptées puis 429")
