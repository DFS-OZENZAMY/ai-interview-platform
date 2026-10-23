import asyncio,sys,random,json
from playwright.async_api import async_playwright
BASE=sys.argv[1]; R=random.randint(1000,9999)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"]); pg=await (await b.new_context(viewport={"width":1280,"height":900})).new_page(); errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:asyncio.ensure_future(d.accept()))
    nxt=lambda: pg.click("#obForm [type=submit]")
    await pg.goto(BASE); await pg.wait_for_timeout(800); await pg.click("text=Créer mon compte gratuit")
    await pg.fill("[name=name]","Yassine Amrani"); await pg.fill("[name=email]",f"y{R}@en.io"); await pg.fill("[name=password]","password12"); await pg.check("[name=consent]"); await pg.click("#authForm [type=submit]"); await pg.wait_for_timeout(700)
    await pg.click("label.choice:has-text('Salarié·e')"); await pg.fill("[data-p='situation.currentJob']","Analyste"); await pg.fill("[data-p='situation.targetJob']","Data analyst"); await nxt()
    await pg.fill("[data-p='background.yearsExperience']","3"); await pg.click(".chip:has-text('Banque')"); await nxt()
    await pg.click("label.choice:has-text('Changer de poste')"); await pg.click(".chip:has-text('Préparer un entretien précis')"); await pg.click(".chip:has-text('Structurer mes réponses')"); await nxt()
    await pg.select_option("#lang-0","Français"); await pg.click("label.cefr-opt:has-text('C2')"); await pg.click("label.choice:has-text('Français') >> nth=0"); await nxt(); await pg.wait_for_timeout(200)
    await pg.click(".skill-col >> nth=1 >> .chip.ghost:has-text('SQL')"); await nxt(); await pg.wait_for_timeout(200); await pg.click("#obFinish"); await pg.wait_for_timeout(600); await pg.click("#toDash"); await pg.wait_for_timeout(300)
    await pg.click("#st"); await pg.click("#next"); await pg.wait_for_timeout(500)
    print("spécialité proposée :", await pg.locator("input[name=domain]:checked").get_attribute("value"))
    await pg.click("label.choice:has-text('Technique métier')"); await pg.wait_for_timeout(200)
    print("objectifs techniques (Data & IA) :", [x.strip() for x in await pg.locator("#goalBox .chip").all_text_contents()][-3:])
    for g in ["SQL","Pipelines et qualité des données","Expliquer clairement"]: await pg.click(f"#goalBox .chip:has-text('{g}')")
    await pg.click(".jd summary"); await pg.fill("[name=jobDescription]","Data analyst dans une banque à Rabat : SQL, Power BI, qualité des données, reporting réglementaire.")
    await pg.click("label.choice:has-text('Format court')")
    await pg.screenshot(path="engine_config.png",full_page=True)
    await pg.click("#simForm [type=submit]"); await pg.wait_for_timeout(300)
    print("préparation :", (await pg.locator(".prep .panel .hint").first.text_content()).strip()[:120])
    await pg.uncheck("#voice"); await pg.click("#go"); await pg.wait_for_timeout(900)
    print("badge :", (await pg.text_content(".convo-head .src-badge")).strip())
    relances=0; codes=[]
    for i in range(14):
      await pg.wait_for_timeout(350)
      if not await pg.query_selector("#answer"): break
      cur=await pg.locator(".bubble.current").get_attribute("class")
      if "relance" in cur: relances+=1
      await pg.fill("#answer","Dans mon poste actuel, j'ai construit un pipeline SQL de contrôle qualité des données, ce qui a réduit les anomalies de 30 % sur le reporting mensuel."); await pg.dispatch_event("#answer","input"); await pg.click("#send")
    await pg.wait_for_timeout(2800)
    print("relances posées :", relances)
    print("rapport :", " | ".join(x.strip()[:95] for x in await pg.locator(".notice").all_text_contents()))
    print("mot de Lina (bilan IA) :", (await pg.locator("text=Le mot de Lina").count())>0)
    await pg.screenshot(path="engine_report.png",full_page=True)
    print("errors",errs); await b.close()
asyncio.run(main())
