// Debug v2: dump frames + inputs after the card form is visible.
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
  await page.waitForTimeout(8000);
  for (const f of page.frames()) {
    const inputs = await f.$$eval('input', (els) => els.map((e) => `#${e.id}[name=${e.name}][ph=${e.placeholder}]`)).catch(() => []);
    console.log('FRAME url=', f.url().slice(0, 90));
    inputs.forEach((i) => console.log('   ', i));
  }
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
