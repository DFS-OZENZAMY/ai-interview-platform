import requests,json,sys
B=__import__("os").environ["BASE"]
def S(): s=requests.Session(); s.headers["Content-Type"]="application/json"; s.headers["Origin"]=B; return s
ok=lambda c,msg: print(("PASS " if c else "FAIL ")+msg)
cand=S(); r=cand.post(B+"/api/auth/register",json={"role":"candidate","name":"Sara Test","email":"sara@t.io","password":"motdepasse1","consent":True}); ok(r.status_code==201,"candidate register")
# cookie: requests drops Secure cookies over http -> copy manually
def keep(sess,resp):
    sc=resp.headers.get("set-cookie",""); tok=sc.split("sid=")[1].split(";")[0]; sess.headers["Cookie"]="sid="+tok
keep(cand,r)
ok(S().post(B+"/api/auth/register",json={"role":"candidate","name":"X","email":"x@t.io","password":"motdepasse1"}).status_code==400,"consent required")
ok(S().post(B+"/api/auth/register",json={"role":"coach","name":"Coach","email":"c@t.io","password":"motdepasse1","inviteCode":"wrong"}).status_code==403,"coach bad invite")
coach=S(); r=coach.post(B+"/api/auth/register",json={"role":"coach","name":"Nadia Coach","email":"nadia@t.io","password":"motdepasse1","inviteCode":"test-invite-123"}); ok(r.status_code==201,"coach register"); keep(coach,r)
coach2=S(); r=coach2.post(B+"/api/auth/register",json={"role":"coach","name":"Autre Coach","email":"autre@t.io","password":"motdepasse1","inviteCode":"test-invite-123"}); keep(coach2,r)
ok(S().post(B+"/api/auth/register",json={"role":"candidate","name":"Dup","email":"sara@t.io","password":"motdepasse1","consent":True}).status_code==409,"duplicate email")
ok(S().post(B+"/api/auth/login",json={"email":"sara@t.io","password":"bad"}).status_code==401,"bad login")
ok(cand.get(B+"/api/auth/me").json()["user"]["role"]=="candidate","me candidate")
sess={"id":"s_test1234","status":"evaluated","role":"dev","level":"mid","type":"mix","startedAt":"2026-10-22T10:00:00Z","turns":[{"seq":1,"answer":"secret answer"}],"evaluation":{"overall":64,"status":"evaluated"}}
ok(cand.put(B+"/api/sessions/s_test1234",data=json.dumps(sess)).status_code==200,"save session")
ok(coach.put(B+"/api/sessions/s_test1234",data=json.dumps(sess)).status_code==403,"coach cannot save session")
cand2=S(); r=cand2.post(B+"/api/auth/register",json={"role":"candidate","name":"Other","email":"o@t.io","password":"motdepasse1","consent":True}); keep(cand2,r)
ok(cand2.put(B+"/api/sessions/s_test1234",data=json.dumps(sess)).status_code==404,"other candidate cannot overwrite")
ok(cand2.get(B+"/api/sessions").json()["sessions"]==[],"other candidate sees nothing")
ok(coach.put(B+"/api/coach/profile",json={"bio":"hi","specialties":["Data"],"slots":["2030-01-01T10:00:00Z"]}).status_code==200,"coach profile")
cs=cand.get(B+"/api/coaches").json()["coaches"]; nid=[c for c in cs if c["name"]=="Nadia Coach"][0]["id"]; ok(len(cs)==2,"coaches listed")
ok(cand.post(B+"/api/requests",json={"coachId":nid,"sessionId":"s_test1234","share":False}).status_code==400,"share required")
ok(cand2.post(B+"/api/requests",json={"coachId":nid,"sessionId":"s_test1234","share":True}).status_code==404,"cannot request with others' session")
r=cand.post(B+"/api/requests",json={"coachId":nid,"sessionId":"s_test1234","share":True,"slot":"2030-01-01T10:00:00.000Z","message":"aide"}); ok(r.status_code==201,"request created"); rid=r.json()["id"]
ok(cand.post(B+"/api/requests",json={"coachId":nid,"sessionId":"s_test1234","share":True}).status_code==409,"duplicate request")
ok(coach2.get(B+f"/api/requests/{rid}/session").status_code==404,"other coach cannot read session")
ok(cand.get(B+f"/api/requests/{rid}/session").status_code==403,"candidate cannot use coach endpoint")
ok(coach.get(B+f"/api/requests/{rid}/session").json()["session"]["turns"][0]["answer"]=="secret answer","assigned coach reads shared session")
ok(coach.post(B+f"/api/requests/{rid}/notes",json={"content":"trop tôt pour noter"}).status_code==409,"note requires accepted")
ok(cand.post(B+f"/api/requests/{rid}/status",json={"status":"accepted"}).status_code==409,"candidate cannot accept")
ok(coach2.post(B+f"/api/requests/{rid}/status",json={"status":"accepted"}).status_code==404,"other coach cannot accept")
ok(coach.post(B+f"/api/requests/{rid}/status",json={"status":"accepted"}).status_code==200,"coach accepts")
ok(coach.post(B+f"/api/requests/{rid}/notes",json={"content":"Travail sur STAR et chiffres."}).status_code==201,"coach note")
rq=cand.get(B+"/api/requests").json()["requests"][0]; ok(rq["status"]=="accepted" and rq["notes"][0]["content"].startswith("Travail"),"candidate sees note")
ok(cand.post(B+f"/api/requests/{rid}/status",json={"status":"cancelled"}).status_code==200,"candidate cancels")
ok(coach.get(B+f"/api/requests/{rid}/session").status_code==404,"access revoked after cancel")
x=S(); x.headers["Origin"]="https://evil.example"; x.headers["Cookie"]=cand.headers["Cookie"]
ok(x.post(B+"/api/auth/logout",json={}).status_code==403,"cross-origin write blocked")
ok(requests.get(B+"/api/sessions").status_code==401,"anon blocked")
for i in range(8): S().post(B+"/api/auth/login",json={"email":"o@t.io","password":"nope"})
ok(S().post(B+"/api/auth/login",json={"email":"o@t.io","password":"motdepasse1"}).status_code==429,"rate limit")
ok(cand.delete(B+"/api/me").status_code==200,"delete account")
ok(coach.get(B+"/api/requests").json()["requests"]==[],"cascade: coach no longer sees request")
ok(S().post(B+"/api/auth/login",json={"email":"sara@t.io","password":"motdepasse1"}).status_code==401,"deleted user cannot login")
