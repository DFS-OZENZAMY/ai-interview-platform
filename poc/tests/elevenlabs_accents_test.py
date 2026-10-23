"""Teste les accents, la voix par langue et la création de recruteurs.
Usage : BASE=… STATS_FILE=… ADMIN_EMAIL=admin@t.io python3 elevenlabs_accents_test.py"""
import os, json, uuid, requests
B = os.environ["BASE"]; ok = lambda c, m: print(("PASS " if c else "FAIL ") + m)
def login(email):
    s = requests.Session(); s.headers.update({"Content-Type": "application/json", "Origin": B})
    r = s.post(B + "/api/auth/register", json={"role": "candidate", "name": "Test", "email": email, "password": "motdepasse1", "consent": True})
    s.headers["Cookie"] = "sid=" + r.headers["set-cookie"].split("sid=")[1].split(";")[0]; return s
adm = login(os.environ["ADMIN_EMAIL"]); cand = login(f"c{uuid.uuid4().hex[:5]}@t.io")
d = adm.get(B + "/api/admin/voices").json()
acc = [a["accent"] for a in d["accents"]]
ok(set(["parisian", "moroccan", "canadian", "belgian", "swiss", "african"]) <= set(acc), "accents français découverts chez ElevenLabs : " + ", ".join(acc))
m = adm.get(B + "/api/admin/voices", params={"accent": "moroccan"}).json()
ok([v["name"] for v in m["voices"]] == ["Mehdi", "Amina"] and all(v["accent"] == "moroccan" for v in m["voices"]), "filtre accent marocain : " + ", ".join(v["name"] for v in m["voices"]))
q = adm.get(B + "/api/admin/voices", params={"accent": "canadian", "gender": "male"}).json()
ok([v["name"] for v in q["voices"]] == ["Jean-François"], "filtre combiné accent québécois + voix masculine")
en = adm.get(B + "/api/admin/voices", params={"language": "en"}).json()
ok(set(a["accent"] for a in en["accents"]) == {"british", "american", "indian"} and en["language"] == "en", "voix anglaises et leurs accents (britannique, américain, indien)")
ok(set(d["presets"]) == {"lina", "karim", "sofia", "adam"}, "4 styles de relance proposés pour les nouveaux recruteurs")
r = adm.post(B + "/api/admin/agents", json={"name": "Amina", "title": "Responsable RH", "description": "Entretien RH bienveillant, accent marocain.", "preset": "lina", "color": "#C2410C"})
ok(r.status_code == 201 and r.json()["id"] == "amina", "recruteur « Amina » créé")
ok(cand.post(B + "/api/admin/agents", json={"name": "Pirate", "title": "Hack"}).status_code == 403, "un candidat ne peut pas créer de recruteur")
ama = next(v for v in m["voices"] if v["name"] == "Amina")
r = adm.post(B + "/api/admin/agents/amina/voice", json={"ownerId": ama["ownerId"], "voiceId": ama["voiceId"], "name": "Amina", "accent": "moroccan", "lang": "fr"}); ok(r.status_code == 200, "voix marocaine attribuée à Amina pour le français")
oli = next(v for v in en["voices"] if v["name"] == "Oliver")
r = adm.post(B + "/api/admin/agents/karim/voice", json={"ownerId": oli["ownerId"], "voiceId": oli["voiceId"], "name": "Oliver", "accent": "british", "lang": "en"}); ok(r.status_code == 200, "voix britannique attribuée à Karim pour l'anglais")
ag = {a["id"]: a for a in cand.get(B + "/api/agents").json()["agents"]}
ok("amina" in ag and ag["amina"]["custom"] and ag["amina"]["followupStyle"] == "lina", "les candidats voient Amina (style de relance bienveillant)")
ok(ag["amina"]["voices"]["fr"] == {"name": "Amina", "accent": "moroccan"} and ag["karim"]["voices"]["en"] == {"name": "Oliver", "accent": "british"}, "accents affichés aux candidats, par langue")
def last_voice(): return json.load(open(os.environ["STATS_FILE"]))["tts"][-1]
cand.get(B + "/api/tts", params={"lang": "fr", "text": "Bonjour, je suis Amina.", "agent": "amina"}); ok(last_voice()["voice"] == "acct" + ama["voiceId"][3:15], "Amina parle avec sa voix marocaine")
cand.get(B + "/api/tts", params={"lang": "en", "text": "Hello, I'm Karim.", "agent": "karim"}); ok(last_voice()["voice"] == "acct" + oli["voiceId"][3:15] and last_voice()["lang"] == "en", "Karim parle anglais avec l'accent britannique")
cand.get(B + "/api/tts", params={"lang": "fr", "text": "Bonjour, je suis Karim.", "agent": "karim"}); ok(last_voice()["voice"] == "JBFqnCBsd6RMkjVDRZzb", "Karim garde sa voix française par défaut")
cand.get(B + "/api/tts", params={"lang": "en", "text": "Hello, I'm Amina.", "agent": "amina"}); ok(last_voice()["voice"] == "acct" + ama["voiceId"][3:15], "sans voix anglaise dédiée, Amina reprend sa voix française")
ok(adm.post(B + "/api/admin/agents/karim/voice", json={"reset": True, "lang": "en"}).status_code == 200, "voix anglaise de Karim retirée")
ok(adm.delete(B + "/api/admin/agents/karim").status_code == 404, "les 4 recruteurs intégrés ne peuvent pas être supprimés")
ok(adm.delete(B + "/api/admin/agents/amina").status_code == 200 and "amina" not in [a["id"] for a in cand.get(B + "/api/agents").json()["agents"]], "Amina supprimée : elle disparaît pour les candidats")
