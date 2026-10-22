"""Teste un entretien piloté par le catalogue S2-03 (catalog-sql ou catalog-http) via l'API du POC.
Prérequis : serveur lancé avec QUESTION_SOURCE=catalog-*, base contenant des questions publiées (fixture locale).
Usage : BASE=http://127.0.0.1:8080 python3 catalog_api_test.py"""
import os, json, requests, uuid
B=os.environ["BASE"]; R=uuid.uuid4().hex[:6]
ok=lambda c,m: print(("PASS " if c else "FAIL ")+m)
def S(): s=requests.Session(); s.headers.update({"Content-Type":"application/json","Origin":B}); return s
def reg(name):
    s=S(); r=s.post(B+"/api/auth/register",json={"role":"candidate","name":name,"email":f"{name.lower()}{R}@t.io","password":"motdepasse1","consent":True})
    s.headers["Cookie"]="sid="+r.headers["set-cookie"].split("sid=")[1].split(";")[0]; return s
h=requests.get(B+"/api/health").json(); ok(h["questionSource"].startswith("catalog"),f"source branchée : {h['questionSource']}")
a=reg("Amine"); b=reg("Badia"); sid="s_cat"+R
r=a.post(B+"/api/interview/start",json={"sessionId":sid,"role":"dev","level":"mid","type":"mix","lang":"fr","length":"std"}); j=r.json()
ok(r.status_code==200 and not j["done"],"démarrage : première question reçue")
q=j["question"]; ok(set(q)=={"code","prompt","turn","total","kind","comp"},"seuls code/prompt/tour/total/type/thème sortent (pas de versions ni d'attendus)")
ok(q["turn"]==1 and q["total"]==7,"tour 1 sur 7")
codes=[q["code"]]; kinds=[q["kind"]]
ok(b.post(B+"/api/interview/next",json={"sessionId":sid}).status_code==404,"un autre candidat ne peut pas avancer la session")
ok(requests.post(B+"/api/interview/next",headers={"Content-Type":"application/json","Origin":B},json={"sessionId":sid}).status_code==401,"anonyme refusé")
while True:
    j=a.post(B+"/api/interview/next",json={"sessionId":sid}).json()
    if j.get("done"): break
    codes.append(j["question"]["code"]); kinds.append(j["question"]["kind"])
ok(len(codes)==7 and len(set(codes))==7,f"7 questions distinctes : {' '.join(codes)}")
ok("tech" in kinds and "rh" in kinds,"entretien mixte : RH et technique alternés")
ok(a.post(B+"/api/interview/next",json={"sessionId":sid}).json().get("done"),"après la fin : plus de question")
ok(a.post(B+"/api/interview/start",json={"sessionId":sid,"role":"dev","level":"mid","type":"mix","lang":"fr","length":"std"}).status_code==409,"une session ne redémarre pas")
r=a.post(B+"/api/interview/start",json={"sessionId":"s_en"+R,"role":"data","level":"junior","type":"tech","lang":"en","length":"short"}); j=r.json()
ok(r.status_code==200 and j["question"]["prompt"] and j["question"]["total"]==5,"entretien en anglais, format court : "+j["question"]["prompt"][:60])
ok(a.post(B+"/api/interview/finish",json={"sessionId":"s_en"+R}).json().get("done"),"fin anticipée possible")
ok(a.post(B+"/api/interview/start",json={"sessionId":"s_bad"+R,"role":"hacker","level":"mid","type":"mix"}).status_code==400,"paramètres invalides refusés")
print("CODES="+",".join(codes))
