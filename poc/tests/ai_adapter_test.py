import requests,os,json
B=os.environ["BASE"]; s=requests.Session(); s.headers.update({"Content-Type":"application/json","Origin":B})
r=s.post(B+"/api/auth/register",json={"role":"candidate","name":"Ai Test","email":os.environ["EMAIL"],"password":"motdepasse1","consent":True}); s.headers["Cookie"]="sid="+r.headers["set-cookie"].split("sid=")[1].split(";")[0]
print("health:",requests.get(B+"/api/health").json()["aiProvider"])
print("followup:",s.post(B+"/api/ai/followup",json={"question":"Parlez-moi d'un projet","answer":"J'ai fait un projet.","lang":"fr","role":"Dev"}).json())
print("feedback:",s.post(B+"/api/ai/feedback",json={"lang":"fr","role":"Dev","level":"Junior","turns":[{"q":"Q","a":"R"}],"scores":[{"label":"Structure","level":3}]}).json())
print("anon blocked:",requests.post(B+"/api/ai/followup",headers={"Content-Type":"application/json"},json={}).status_code)
