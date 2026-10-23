import asyncio,sys,json
from playwright.async_api import async_playwright
BASE=sys.argv[1]; STATS=sys.argv[2]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"]); pg=await (await b.new_context(viewport={"width":1280,"height":900})).new_page(); errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.goto(BASE); await pg.wait_for_timeout(900); await pg.click("text=Créer mon compte gratuit")
    await pg.fill("[name=name]","Othmane Admin"); await pg.fill("[name=email]","admin@t.io"); await pg.fill("[name=password]","password12"); await pg.check("[name=consent]"); await pg.click("#authForm [type=submit]"); await pg.wait_for_timeout(900)
    print("menu :", [x.strip() for x in await pg.locator("#nav button").all_text_contents()])
    await pg.click("#nav >> text=Voix"); await pg.wait_for_timeout(1200)
    print("modèle :", (await pg.text_content(".board-head .status")).strip())
    print("voix proposées :", [x.strip() for x in await pg.locator(".voice-card .req-top b").all_text_contents()])
    await pg.select_option("[name=gender]","female"); await pg.click("#vf [type=submit]"); await pg.wait_for_timeout(900)
    names=[x.strip() for x in await pg.locator(".voice-card .req-top b").all_text_contents()]; print("filtre féminin :", names)
    await pg.click(".voice-card:has-text('Camille') >> [data-prev]"); await pg.wait_for_timeout(500)
    print("extrait :", (await pg.text_content(".voice-card:has-text('Camille') >> [data-prev]")).strip())
    await pg.screenshot(path="voices_admin.png",full_page=True)
    await pg.select_option(".voice-card:has-text('Camille') >> select","lina"); await pg.click(".voice-card:has-text('Camille') >> [data-assign]"); await pg.wait_for_timeout(1300)
    print("carte de Lina :", (await pg.text_content(".agent-admin:has-text('Lina') p")).strip())
    await pg.click(".agent-admin:has-text('Lina') >> [data-hear]"); await pg.wait_for_timeout(1500)
    st=json.load(open(STATS)); print("dernière synthèse :", st["tts"][-1]["voice"], st["tts"][-1]["model"], "|", st["tts"][-1]["text"][:40])
    print("errors",errs); await b.close()
asyncio.run(main())
