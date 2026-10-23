"""Teste le modèle réaliste (v4 Turbo + repli) et l'écran d'administration des voix.
Usage : BASE=… STATS_FILE=… ADMIN_EMAIL=admin@t.io python3 elevenlabs_voices_test.py [attendu_modele]"""
import os, sys, json, uuid, requests
B = os.environ["BASE"]; ok = lambda c, m: print(("PASS " if c else "FAIL ") + m); expect = sys.argv[1] if len(sys.argv) > 1 else "eleven_v4_turbo"
def login(email, role="candidate"):
    s = requests.Session(); s.headers.update({"Content-Type": "application/json", "Origin": B})
    r = s.post(B + "/api/auth/register", json={"role": role, "name": "Test", "email": email, "password": "motdepasse1", "consent": True})
    s.headers["Cookie"] = "sid=" + r.headers["set-cookie"].split("sid=")[1].split(";")[0]; return s, r.json()["user"]
adm, u = login(os.environ["ADMIN_EMAIL"]); cand, u2 = login(f"c{uuid.uuid4().hex[:5]}@t.io")
ok(u["isAdmin"] and not u2["isAdmin"], "rôle administrateur attribué uniquement aux adresses ADMIN_EMAILS")
r = cand.get(B + "/api/tts", params={"lang": "fr", "text": "Bonjour, je suis Lina.", "agent": "lina"}); ok(r.status_code == 200, "voix générée")
st = json.load(open(os.environ["STATS_FILE"])); used = st["tts"][-1]["model"]
ok(used == expect, f"modèle utilisé : {used}" + (f" (repli après refus de : {', '.join(st.get('model_rejected', []))})" if st.get("model_rejected") else ""))
ok(requests.get(B + "/api/health").json()["ttsModel"] == expect, "modèle affiché dans /api/health")
ok(cand.get(B + "/api/admin/voices").status_code == 403, "un candidat n'accède pas à l'administration des voix")
lib = adm.get(B + "/api/admin/voices", params={"gender": "female"}).json()
ok(len(lib["voices"]) >= 3 and all(v["gender"] == "female" for v in lib["voices"]) and lib["voices"][0]["previewUrl"], f"bibliothèque : voix françaises féminines avec extrait audio ({', '.join(v['name'] for v in lib['voices'])})")
ok([a["voices"]["fr"] for a in lib["agents"]] == [None] * 4, "état initial : voix par défaut pour les 4 recruteurs")
cam = next(v for v in lib["voices"] if v["name"] == "Camille")
ok(requests.get(cam["previewUrl"]).headers["content-type"] == "audio/mpeg", "extrait audio de la voix écoutable")
r = adm.post(B + "/api/admin/agents/lina/voice", json={"ownerId": cam["ownerId"], "voiceId": cam["voiceId"], "name": "Camille"}); ok(r.status_code == 200, "Camille attribuée à Lina")
ok(cand.post(B + "/api/admin/agents/lina/voice", json={"ownerId": cam["ownerId"], "voiceId": cam["voiceId"], "name": "x"}).status_code == 403, "un candidat ne peut pas changer de voix")
st = json.load(open(os.environ["STATS_FILE"])); ok(list(st["added"].values()) == ["Répétition · Lina · FR · Camille"], "voix ajoutée au compte ElevenLabs sous un nom explicite")
cand.get(B + "/api/tts", params={"lang": "fr", "text": "Bonjour, je suis Lina.", "agent": "lina"})
st = json.load(open(os.environ["STATS_FILE"])); ok(st["tts"][-1]["voice"] == "acct" + cam["voiceId"][3:15], "Lina parle désormais avec Camille (le cache de l'ancienne voix n'est pas réutilisé)")
ok(adm.get(B + "/api/admin/voices").json()["agents"][0]["voices"]["fr"]["name"] == "Camille", "écran d'administration à jour")
ok(adm.post(B + "/api/admin/agents/lina/voice", json={"reset": True}).json()["ok"] and adm.get(B + "/api/admin/voices").json()["agents"][0]["voices"]["fr"] is None, "retour à la voix par défaut possible")
ok(adm.post(B + "/api/admin/agents/lina/voice", json={"ownerId": "ownerXXXXXXXX", "voiceId": "nopeVoice123", "name": "x"}).status_code == 503, "voix inexistante : refus propre")
