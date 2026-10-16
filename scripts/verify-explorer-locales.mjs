// Run locally with playwright-cli run-code; exercises the real apartment viewer.
async function verifyExplorerLocales(page) {
  if(!/^http:\/\/localhost:\d+\//.test(page.url())) throw new Error('Local QA only');
  const base=page.url().split('/').slice(0,3).join('/');
  let checks=0;
  for(const locale of ['en','de','pl','sl','ru']) {
    await page.evaluate(locale=>localStorage.setItem('aixess-language',locale),locale);
    await page.goto(base+'/'); await page.reload();
    await page.waitForFunction(locale=>document.documentElement.lang===locale,locale);
    for(const [width,height] of [[1440,900],[390,844]]) {
      await page.setViewportSize({width,height});
      await page.locator('#residence-explorer').evaluate(el=>window.scrollTo(0,innerWidth<700?el.offsetTop:el.offsetTop+el.offsetHeight-innerHeight));
      await page.waitForFunction(()=>document.querySelector('.building-map')?.dataset.loadState==='ready');
      for(const block of ['A','B']) {
        await page.locator('.model-block-switcher').getByRole('button',{name:block,exact:true}).click();
        await page.locator('.model-floor-rail button').filter({hasText:/^07/}).click();
        await page.locator('.unit-row').filter({hasText:'#708'}).click();
        const text=await page.locator('.floor-modal').innerText();
        if(locale!=='en' && /\b(A Block|B Block|FLOOR|BEDROOMS|AVAILABLE|RESERVED|SOLD|Choose a residence|room_\w+)\b/.test(text)) throw new Error(`${locale}/${block}: untranslated residence UI`);
        await page.locator('.unit-preview-button').click();
        await page.locator('.floor-plan-lightbox-image img').evaluate(img=>img.decode());
        const caption=await page.locator('.floor-plan-lightbox-caption').innerText();
        if(locale!=='en' && /RESIDENCE|CLICK OUTSIDE|FULL VIEW/.test(caption)) throw new Error(`${locale}: untranslated lightbox`);
        await page.keyboard.press('Escape');
        if(['pl','ru'].includes(locale)) await page.screenshot({path:`output/playwright/explorer-${locale}-${block}-${width}.png`});
        await page.locator('.floor-modal-close').click();
        checks++;
      }
    }
  }
  return {checks};
}
