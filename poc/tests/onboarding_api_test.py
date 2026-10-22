import requests,json
B=__import__("os").environ["BASE"]
def S(): s=requests.Session(); s.headers.update({"Content-Type":"application/json","Origin":B}); return s
def keep(s,r): s.headers["Cookie"]="sid="+r.headers["set-cookie"].split("sid=")[1].split(";")[0]
ok=lambda c,m: print(("PASS " if c else "FAIL ")+m)
a=S(); keep(a,a.post(B+"/api/auth/register",json={"role":"candidate","name":"Amal","email":"amal@t.io","password":"motdepasse1","consent":True}))
b=S(); keep(b,b.post(B+"/api/auth/register",json={"role":"candidate","name":"Badr","email":"badr@t.io","password":"motdepasse1","consent":True}))
c=S(); keep(c,c.post(B+"/api/auth/register",json={"role":"coach","name":"Coach","email":"co@t.io","password":"motdepasse1","inviteCode":"test-invite-123"}))
r=a.get(B+"/api/onboarding").json(); ok(r["completed"] is False and r["draft"] is None,"new candidate: onboarding needed, no draft")
ok(a.put(B+"/api/onboarding/draft",data=json.dumps({"step":3,"data":{"situation":{"status":"student","targetJob":"Data analyst"}}})).status_code==200,"draft saved")
r=a.get(B+"/api/onboarding").json(); ok(r["draft"]["step"]==3 and r["draft"]["data"]["situation"]["targetJob"]=="Data analyst","draft resumed with step")
ok(b.get(B+"/api/onboarding").json()["draft"] is None,"other candidate cannot see draft")
ok(c.get(B+"/api/onboarding").status_code==403,"coach has no onboarding")
ok(requests.get(B+"/api/onboarding").status_code==401,"anonymous blocked")
bad={"situation":{"status":"student","targetJob":"Data analyst"}}
r=a.post(B+"/api/onboarding/complete",json={"data":bad}); ok(r.status_code==400 and "background.yearsExperience" in r.json()["errors"],"incomplete profile rejected with field errors")
full={"situation":{"status":"student","targetJob":"Data analyst"},"background":{"yearsExperience":0.5,"education":{"degree":"bac5","field":"Statistiques"}},"motivation":{"goal":"first_job","reasons":["Progresser à l’oral"],"axes":["structure"]},"languages":{"spoken":[{"language":"Français","level":"C2"}],"preferredInterface":"fr"},"skills":{"acquired":[],"toDevelop":[{"label":"Python","source":"catalog"}]},"seniority":{"level":"senior"}}
r=a.post(B+"/api/onboarding/complete",json={"data":full}); ok(r.status_code==201 and r.json()["created"],"profile created once")
ok(r.json()["profile"]["seniority"]["level"]=="student","seniority derived server-side (client value ignored)")
r2=a.post(B+"/api/onboarding/complete",json={"data":{**full,"situation":{"status":"student","targetJob":"Autre métier"}}}); ok(r2.status_code==200 and not r2.json()["created"] and r2.json()["profile"]["situation"]["targetJob"]=="Data analyst","second completion does not overwrite (single initial save)")
r=a.get(B+"/api/onboarding").json(); ok(r["completed"] and r["draft"] is None,"draft deleted after completion")
ok(a.put(B+"/api/onboarding/draft",data=json.dumps({"step":1,"data":{}})).status_code==409,"no draft after completion")
upd={**full,"background":{"yearsExperience":3,"education":{"degree":"bac5","field":"Statistiques"}}}
r=a.put(B+"/api/profile",json={"data":upd}); ok(r.status_code==200 and r.json()["profile"]["seniority"]["level"]=="mid","profile correction re-derives seniority")
ok(b.put(B+"/api/profile",json={"data":upd}).status_code==404,"cannot update a profile you don't have")
ok(a.delete(B+"/api/me").status_code==200,"delete account")
x=S(); keep(x,x.post(B+"/api/auth/register",json={"role":"candidate","name":"Amal2","email":"amal@t.io","password":"motdepasse1","consent":True}))
ok(x.get(B+"/api/onboarding").json()["completed"] is False,"profile deleted with account")
