import asyncio,sys,json
from playwright.async_api import async_playwright
BASE=sys.argv[1]; COOKIE=open("/tmp/cookie.txt").read().strip().split("=",1)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required","--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"])
    ctx=await b.new_context(viewport={"width":1440,"height":900}); await ctx.add_cookies([{"name":COOKIE[0],"value":COOKIE[1],"domain":"localhost","path":"/"}])
    pg=await ctx.new_page(); errs=[]; tts=[]
    pg.on("pageerror",lambda e:errs.append(str(e)[:120]))
    pg.on("response",lambda r: tts.append(r.status) if "/api/interview/tts" in r.url else None)
    await pg.goto(BASE+"/"); await pg.wait_for_timeout(1500)
    await pg.evaluate("""sessionStorage.setItem('interview-lab-config',JSON.stringify({family:'rh',locale:'fr',jobTitle:'Chargée RH',job_description:'',goals:['communication'],count:2}))""")
    await pg.goto(BASE+"/interview"); await pg.wait_for_timeout(2500); await pg.screenshot(path="web_intro.png")
    for _ in range(30):
      if await pg.locator("#spoken-answer").count(): break
      await pg.wait_for_timeout(500)
    await pg.wait_for_timeout(1200)
    async def bubble(): return " ".join((await pg.locator("main").inner_text()).split())[:3000]
    async def turn(text):
      await pg.fill("#spoken-answer",text); await pg.get_by_role("button",name="J’ai terminé").click(); await pg.wait_for_timeout(2600)
    txt=await bubble(); print("1re réplique affichée :", "Bonjour et bienvenue" in txt)
    await pg.screenshot(path="web_interview.png")
    await turn("Vous pouvez répéter s'il vous plaît ?"); print("répéter :", "je répète" in (await bubble()) or "je reprends" in (await bubble()))
    await turn("C'est quoi le salaire ?"); print("salaire :", "salaire" in (await bubble()).lower())
    await turn("J'aime aider les gens à trouver leur place dans une équipe."); print("1re question :", "Commençons" in await bubble())
    await turn("Lors de mon stage, j'ai animé un atelier pour présenter un projet à toute l'équipe, ce qui a facilité l'adhésion."); 
    await turn("Nous avons ensuite suivi le taux de participation, qui est passé de 40 à 75 %.")
    await turn("je sais pas"); print("je ne sais pas :", "Salma" in await bubble() or "pas grave" in (await bubble()) or "inquiétude" in (await bubble()))
    await turn("Je me suis appuyée sur des exemples concrets pour convaincre."); await turn("Le projet a été adopté par l'équipe.")
    await pg.wait_for_timeout(1500); t=await bubble(); print("bilan final :", "Bilan pédagogique" in t or "regard de Lina" in t)
    await pg.screenshot(path="web_done.png",full_page=True)
    print("voix de Lina servies :", tts.count(200), "| échecs :", len([s for s in tts if s!=200]))
    print("erreurs JS :", errs); await b.close()
asyncio.run(main())
