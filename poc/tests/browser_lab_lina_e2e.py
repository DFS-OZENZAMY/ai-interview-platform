import asyncio,sys
from playwright.async_api import async_playwright
BASE=sys.argv[1]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"]); pg=await (await b.new_context(viewport={"width":1280,"height":900})).new_page(); errs=[]; tts=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.on("response",lambda r: tts.append((r.status,r.url.split("/api/lab/tts?")[1][:80])) if "/api/lab/tts" in r.url else None)
    await pg.goto(BASE); await pg.wait_for_timeout(900); await pg.screenshot(path="lab_welcome.png")
    print("titre :", (await pg.text_content("h1")).replace("\n"," "))
    await pg.click("#chooseDemo"); await pg.fill("#email","salma@exemple.com"); await pg.fill("#password","password12"); await pg.click("#authSubmit"); await pg.wait_for_timeout(400)
    await pg.click("label.choice:has-text('Premier emploi')"); await pg.click("#preparationOptions label.choice:has-text('Gestion du stress')"); await pg.fill("#targetRole","Chargée RH"); await pg.click("#saveProfile"); await pg.wait_for_timeout(400)
    await pg.click("#goConfigure"); await pg.wait_for_timeout(300)
    print("mode IA :", (await pg.locator("#simMode option[value=ai]").text_content()).strip())
    await pg.fill("#simJobDescription","Chargée RH dans une PME industrielle, recrutement et intégration."); await pg.click("#aiPrivacyConsent")
    await pg.screenshot(path="lab_configure.png",full_page=True)
    await pg.click("#launchInterview"); await pg.wait_for_timeout(1500)
    print("statut :", (await pg.text_content("#interviewStatus")).strip(), "| Lina :", (await pg.text_content("#linaState")).strip() or "(a fini de parler)")
    await pg.screenshot(path="lab_interview.png",full_page=True)
    steps=0
    while steps<10:
      if not await pg.is_visible("#interview"): break
      await pg.fill("#interviewAnswer","Lors de mon stage, j'ai géré un désaccord entre deux collègues en organisant un échange, ce qui a apaisé la situation."); await pg.click("#submitAnswer"); await pg.wait_for_timeout(1200); steps+=1
      if await pg.is_visible("#interview") and steps==1: print("après réponse :", (await pg.text_content("#interviewProgress")).strip(), "|", (await pg.text_content("#interviewPrompt")).strip()[:70])
    print("récap :", (await pg.text_content("#recapCount")).strip(), "| bilan :", (await pg.text_content("#aiRecapFeedback")).strip()[:70])
    await pg.screenshot(path="lab_recap.png",full_page=True)
    print("voix de Lina (requêtes) :", len([t for t in tts if t[0]==200]), "lectures distinctes :", sorted(set(t[1].split("step=")[-1] for t in tts if "step=" in t[1])))
    # mode guidé + couper la voix
    await pg.click("#retrySimulation"); await pg.select_option("#simMode","guided"); await pg.select_option("#simFamily","technical"); await pg.select_option("#simDomain","data_ai"); await pg.click("#launchInterview"); await pg.wait_for_timeout(1200)
    print("guidé :", (await pg.text_content("#interviewStatus")).strip(), "| dernière voix :", tts[-1])
    n=len(tts); await pg.check("#linaMute"); await pg.fill("#interviewAnswer","Réponse"); await pg.click("#submitAnswer"); await pg.wait_for_timeout(800)
    print("voix coupée : nouvelles requêtes =", len(tts)-n)
    await pg.click("#linaReplay"); await pg.wait_for_timeout(800); print("réécouter malgré la coupure :", len(tts)-n)
    print("errors", errs); await b.close()
asyncio.run(main())
