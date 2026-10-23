import asyncio,sys,random
from playwright.async_api import async_playwright
BASE=sys.argv[1]; R=random.randint(1000,9999)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream","--use-file-for-fake-audio-capture=/tmp/voice.wav","--autoplay-policy=no-user-gesture-required"])
    async def run(w,h,scheme,tag):
      ctx=await b.new_context(viewport={"width":w,"height":h},permissions=["microphone","camera"],color_scheme=scheme); pg=await ctx.new_page(); errs=[]
      pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:asyncio.ensure_future(d.accept()))
      nxt=lambda: pg.click("#obForm [type=submit]")
      await pg.goto(BASE); await pg.wait_for_timeout(800); await pg.click("text=Créer mon compte gratuit")
      await pg.fill("[name=name]","Salma Idrissi"); await pg.fill("[name=email]",f"s{tag}{R}@st.io"); await pg.fill("[name=password]","password12"); await pg.check("[name=consent]"); await pg.click("#authForm [type=submit]"); await pg.wait_for_timeout(700)
      await pg.click("label.choice:has-text('Jeune diplômé·e')"); await pg.fill("[data-p='situation.targetJob']","Data analyst"); await nxt()
      await pg.click("label.choice:has-text('Master')"); await pg.fill("[data-p='background.education.field']","Statistiques"); await pg.fill("[data-p='background.yearsExperience']","1"); await nxt()
      await pg.click("label.choice:has-text('premier emploi')"); await pg.click(".chip:has-text('Progresser à l’oral')"); await pg.click(".chip:has-text('Confiance en soi')"); await nxt()
      await pg.select_option("#lang-0","Français"); await pg.click("label.cefr-opt:has-text('C2')"); await pg.click("label.choice:has-text('Français') >> nth=0"); await nxt(); await pg.wait_for_timeout(200)
      await pg.click(".skill-col >> nth=1 >> .chip.ghost:has-text('Python')"); await nxt(); await pg.wait_for_timeout(200); await pg.click("#obFinish"); await pg.wait_for_timeout(600); await pg.click("#toDash"); await pg.wait_for_timeout(300)
      await pg.click("#st"); await pg.check("#c2"); await pg.check("#c3"); await pg.click("#next"); await pg.wait_for_timeout(400)
      await pg.click("label.agent-card:has-text('Sofia')"); await pg.click("#simForm [type=submit]"); await pg.wait_for_timeout(300); await pg.click("#go")
      await pg.wait_for_timeout(1700)
      info=await pg.evaluate("({state:document.querySelector('#stageState').textContent, lit:document.querySelectorAll('#captions span.on').length, total:document.querySelectorAll('#captions span').length, viz:!!(window.ttsAudio||null)})")
      viz=await pg.evaluate("(()=>{try{return ttsAudio&&ttsAudio._viz?'audio réel analysé':'simulé'}catch(e){return 'n/a'}})()")
      print(tag,"| pendant que Sofia parle :", info["state"], f"| sous-titres {info['lit']}/{info['total']} mots | avatar :", viz)
      await pg.screenshot(path=f"studio_{tag}_speaking.png")
      await pg.wait_for_timeout(2500)
      await pg.click("#dictBtn"); await pg.wait_for_timeout(2600)
      print(tag,"| dictée :", (await pg.text_content("#stageState")).strip(), "| bulle en direct :", (await pg.text_content("#draftText"))[:50])
      await pg.screenshot(path=f"studio_{tag}_dictation.png")
      await pg.click("#dictBtn"); await pg.wait_for_timeout(1500)
      for i in range(3):
        await pg.fill("#answer","Lors de mon stage, mon objectif était d'automatiser un reporting. J'ai développé un script Python, ce qui a permis de gagner 6 heures par semaine."); await pg.dispatch_event("#answer","input"); await pg.click("#send"); await pg.wait_for_timeout(900)
      await pg.wait_for_timeout(1500); await pg.screenshot(path=f"studio_{tag}_thread.png")
      print(tag,"| bulles :", await pg.locator(".bubble").count(), "| erreurs :", errs); await ctx.close()
    await run(1280,860,"light","desk"); await run(1280,860,"dark","dark"); await run(390,844,"light","mob")
    await b.close()
asyncio.run(main())
