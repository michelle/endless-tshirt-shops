const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(process.argv[2], { waitUntil: 'networkidle' });
  await page.fill('#date', '2022-06-14');
  await page.click('#buyBtn');
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
  await page.fill('#email', 'skywatcher@example.com');
  await page.fill('#shippingName', 'Sky Watcher');
  await page.fill('#shippingAddressLine1', '500 5th Ave');
  try { await page.waitForSelector('text=New York, NY, USA', { timeout: 8000 }); await page.click('text=New York, NY, USA'); } catch {}
  await page.keyboard.press('Escape');
  await page.fill('#phoneNumber', '2125554242');
  await page.evaluate(() => { const b = document.querySelector('[data-testid="card-accordion-item-button"]'); if (b) b.click(); });
  await page.waitForTimeout(8000);
  for (const f of page.frames()) {
    try {
      const inputs = await f.$$eval('input', els => els.map(e => '#'+e.id+'[name='+e.name+'][ph='+e.placeholder+']'));
      if (inputs.length) { console.log('FRAME', f.url().slice(0,80)); inputs.forEach(i => console.log('   ', i)); }
    } catch (e) { console.log('FRAME', f.url().slice(0,60), 'EVAL FAIL', e.message.slice(0,80)); }
  }
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
