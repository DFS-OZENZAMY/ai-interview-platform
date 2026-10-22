import asyncio,sys,random,json
from playwright.async_api import async_playwright
BASE=sys.argv[1]; TAG=sys.argv[2]; R=random.randint(1000,9999)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream","--use-file-for-fake-audio-capture=/tmp/voice.wav","--autoplay-policy=no-user-gesture-required"])
    ctx=await b.new_context(viewport={"width":1280,"height":900},permissions=["microphone"]); pg=await ctx.new_page(); errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:asyncio.ensure_future(d.accept()))
    nxt=lambda: pg.click("#obForm [type=submit]")
    await pg.goto(BASE); await pg.wait_for_timeout(900); await pg.click("text=Créer mon compte gratuit")
    await pg.fill("[name=name]","Salma Idrissi"); await pg.fill("[name=email]",f"s{R}@stt.io"); await pg.fill("[name=password]","password12"); await pg.check("[name=consent]"); await pg.click("#authForm [type=submit]"); await pg.wait_for_timeout(800)
    await pg.click("label.choice:has-text('Étudiant·e')"); await pg.fill("[data-p='situation.targetJob']","Data analyst"); await nxt()
    await pg.click("label.choice:has-text('Master')"); await pg.fill("[data-p='background.education.field']","Statistiques"); await pg.fill("[data-p='background.yearsExperience']","0.5"); await nxt()
    await pg.click("label.choice:has-text('premier emploi')"); await pg.click(".chip:has-text('Progresser à l’oral')"); await pg.click(".chip:has-text('Communication')"); await nxt()
    await pg.select_option("#lang-0","Français"); await pg.click("label.cefr-opt:has-text('C2')"); await pg.click("label.choice:has-text('Français') >> nth=0"); await nxt(); await pg.wait_for_timeout(200)
    await pg.click(".skill-col >> nth=1 >> .chip.ghost:has-text('Python')"); await nxt(); await pg.wait_for_timeout(200); await pg.click("#obFinish"); await pg.wait_for_timeout(700); await pg.click("#toDash"); await pg.wait_for_timeout(400)
    await pg.click("#st"); await pg.wait_for_timeout(200)
    print("consentement micro mentionne Kyutai:", await pg.locator("text=Kyutai STT").count()>0)
    await pg.check("#c2"); await pg.click("#next"); await pg.wait_for_timeout(200); await pg.click("#simForm [type=submit]"); await pg.wait_for_timeout(300)
    await pg.uncheck("#voice"); await pg.click("#go"); await pg.wait_for_timeout(800)
    print("bouton dictée:", await pg.get_attribute("#dictBtn","title"))
    await pg.click("#dictBtn"); await pg.wait_for_timeout(4500)
    live=await pg.input_value("#answer"); print("texte pendant la dictée:", live[:90]); print("état bouton:", await pg.text_content("#dictBtn"), "| indicateur:", await pg.text_content("#liveInd"))
    await pg.screenshot(path=f"{TAG}_dictation.png")
    await pg.click("#dictBtn"); await pg.wait_for_timeout(2500)
    final=await pg.input_value("#answer"); print("texte final:", final[:120]); print("bouton après arrêt:", await pg.text_content("#dictBtn"))
    print("envoi possible:", not await pg.is_disabled("#send"))
    print("errors",errs); await b.close()
asyncio.run(main())
