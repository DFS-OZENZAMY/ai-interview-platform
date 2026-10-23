import asyncio,sys,random
from playwright.async_api import async_playwright
BASE=sys.argv[1]; TAG=sys.argv[2]; R=random.randint(1000,9999)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await (await b.new_context(viewport={"width":1280,"height":900})).new_page(); errs=[]; toasts=[]
    pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:asyncio.ensure_future(d.accept()))
    nxt=lambda: pg.click("#obForm [type=submit]")
    await pg.goto(BASE); await pg.wait_for_timeout(900); await pg.click("text=Créer mon compte gratuit")
    await pg.fill("[name=name]","Yasmine Tazi"); await pg.fill("[name=email]",f"y{R}@cat.io"); await pg.fill("[name=password]","password12"); await pg.check("[name=consent]"); await pg.click("#authForm [type=submit]"); await pg.wait_for_timeout(800)
    await pg.click("label.choice:has-text('Salarié·e')"); await pg.fill("[data-p='situation.currentJob']","Technicien support"); await pg.fill("[data-p='situation.targetJob']","Développeur·se web"); await nxt()
    await pg.fill("[data-p='background.yearsExperience']","3"); await pg.click(".chip:has-text('Télécoms')"); await nxt()
    await pg.click("label.choice:has-text('Changer de poste')"); await pg.click(".chip:has-text('Préparer un entretien précis')"); await pg.click(".chip:has-text('Structurer mes réponses')"); await nxt()
    await pg.select_option("#lang-0","Français"); await pg.click("label.cefr-opt:has-text('C2')"); await pg.click("label.choice:has-text('Français') >> nth=0"); await nxt(); await pg.wait_for_timeout(200)
    await pg.click(".skill-col >> nth=1 >> .chip.ghost:has-text('Docker')"); await nxt(); await pg.wait_for_timeout(200); await pg.click("#obFinish"); await pg.wait_for_timeout(700); await pg.click("#toDash"); await pg.wait_for_timeout(400)
    await pg.click("#st"); await pg.click("#next"); await pg.wait_for_timeout(200); await pg.click("#simForm [type=submit]"); await pg.wait_for_timeout(300)
    await pg.screenshot(path=f"{TAG}_prep.png",full_page=True)
    print("prep mentions S2-03:", await pg.locator("text=référentiel officiel S2-03").count()>0)
    await pg.uncheck("#voice"); await pg.click("#go"); await pg.wait_for_timeout(900)
    t=await pg.locator(".toast").text_content(); print("toast:", (t or "").strip()[:120])
    await pg.screenshot(path=f"{TAG}_q1.png",full_page=True)
    seen=[]
    for i in range(16):
      await pg.wait_for_timeout(350)
      if not await pg.query_selector("#answer"): break
      meta=(await pg.text_content(".meta span")).strip(); q=(await pg.text_content("#qtext")).strip()
      if not seen or seen[-1][1]!=q: seen.append((meta,q))
      await pg.fill("#answer","Lors d'un projet chez mon employeur, mon objectif était de réduire les incidents. J'ai analysé les logs, mis en place des tests automatisés et une revue de code, ce qui a permis de réduire les incidents de 35 % en trois mois."); await pg.dispatch_event("#answer","input"); await pg.click("#send")
    for m,q in seen: print(" ",m[:70],"|",q[:70])
    await pg.wait_for_timeout(2800); await pg.screenshot(path=f"{TAG}_report.png",full_page=True)
    print("report score:", (await pg.text_content(".dial b")).strip()[:6], "| S2-03 notice:", await pg.locator("text=Questions issues du référentiel officiel").count())
    print("errors",errs); await b.close()
asyncio.run(main())
