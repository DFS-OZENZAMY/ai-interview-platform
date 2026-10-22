import asyncio,sys,random
from playwright.async_api import async_playwright
BASE=sys.argv[1]; R=random.randint(1000,9999)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
    ctx=await b.new_context(viewport={"width":1280,"height":900}); pg=await ctx.new_page(); errs=[]; tts=[]
    pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:asyncio.ensure_future(d.accept()))
    pg.on("response",lambda r: tts.append((r.status, r.headers.get("x-tts-cache"), r.url.split("text=")[1][:40])) if "/api/tts" in r.url else None)
    nxt=lambda: pg.click("#obForm [type=submit]")
    await pg.goto(BASE); await pg.wait_for_timeout(900); await pg.click("text=Créer mon compte gratuit")
    await pg.fill("[name=name]","Omar Lahlou"); await pg.fill("[name=email]",f"o{R}@tts.io"); await pg.fill("[name=password]","password12"); await pg.check("[name=consent]"); await pg.click("#authForm [type=submit]"); await pg.wait_for_timeout(800)
    await pg.click("label.choice:has-text('Étudiant·e')"); await pg.fill("[data-p='situation.targetJob']","Développeur·se web"); await nxt()
    await pg.click("label.choice:has-text('Licence')"); await pg.fill("[data-p='background.education.field']","Informatique"); await pg.fill("[data-p='background.yearsExperience']","0"); await nxt()
    await pg.click("label.choice:has-text('premier emploi')"); await pg.click(".chip:has-text('Progresser à l’oral')"); await pg.click(".chip:has-text('Confiance en soi')"); await nxt()
    await pg.select_option("#lang-0","Français"); await pg.click("label.cefr-opt:has-text('C2')"); await pg.click("label.choice:has-text('Français') >> nth=0"); await nxt(); await pg.wait_for_timeout(200)
    await pg.click(".skill-col >> nth=1 >> .chip.ghost:has-text('React')"); await nxt(); await pg.wait_for_timeout(200); await pg.click("#obFinish"); await pg.wait_for_timeout(700); await pg.click("#toDash"); await pg.wait_for_timeout(400)
    await pg.click("#st"); await pg.click("#next"); await pg.wait_for_timeout(200); await pg.click("#simForm [type=submit]"); await pg.wait_for_timeout(300)
    print("réglage voix:", (await pg.text_content("label:has(#voice) small")).strip())
    await pg.click("#go")
    states=[]
    for _ in range(14):
      await pg.wait_for_timeout(250); states.append(await pg.get_attribute("#orb","class"))
    print("Lina parle puis écoute:", "speaking" in " ".join(states), "->", states[-1].split()[-1])
    await pg.click("#replay"); await pg.wait_for_timeout(400)
    await pg.fill("#answer","Je suis étudiant en informatique, j'ai réalisé un projet React qui a permis de réduire de 30 % le temps de saisie."); await pg.dispatch_event("#answer","input"); await pg.click("#send"); await pg.wait_for_timeout(2500)
    for t in tts: print("  /api/tts", t)
    print("errors",errs); await b.close()
asyncio.run(main())
