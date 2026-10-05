const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const BASE = 'https://mechanical-relay-ireland-quilt.trycloudflare.com';
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: '/tmp/shot_home_top.png' });
  await page.screenshot({ path: '/tmp/shot_home_full.png', fullPage: true });
  // customize: white shirt + word
  await page.fill('#wordInput', 'MOONLIGHT');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/shot_studio.png' });
  // checkout section
  await page.click('#designBtn');
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/shot_checkout.png', fullPage: true });
  // order status page
  await page.goto(BASE + '/order/3147798042e9c7ccd004?r=paid', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/shot_order.png', fullPage: true });
  await browser.close();
  console.log('done');
})().catch((e) => { console.error(e.message); process.exit(1); });
