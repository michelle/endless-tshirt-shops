// Full E2E: order -> PayGate hosted checkout -> 3DS -> order status.
'use strict';
const { chromium } = require('playwright');

const ORDER = JSON.parse(process.argv[2]);
const BASE = process.argv[3];
const CARD = process.env.CARD || '4000000000000002';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  const inputs = Object.entries(ORDER.params)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, '&quot;')}">`)
    .join('');
  await page.setContent(`<form id="f" method="post" action="${ORDER.action}">${inputs}</form><script>document.getElementById('f').submit()</script>`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(4000);

  const ok = page.locator('#testAlert button:has-text("OK"), #testAlert .modal-footer button').first();
  if (await ok.count()) await ok.click();
  await page.locator('#pmCreditcardBtn').click();
  await page.waitForTimeout(2500);
  await page.fill('#ccNumber', CARD);
  await page.fill('#ccName', 'Test Pilot');
  await page.fill('#ccCvv', '123');
  await page.selectOption('#ccOpMonth', '12');
  await page.selectOption('#ccOpYear', '2030');
  await page.check('#termsChk');
  await page.locator('#nextBtn').click();
  await page.waitForTimeout(3500);

  // Optional confirm modal
  const yesBtn = page.locator('.modal:visible button:has-text("Yes")').first();
  if (await yesBtn.count()) await yesBtn.click().catch(() => {});
  await page.waitForTimeout(3500);

  // 3DS simulator
  if (page.url().includes('3d.dpopayments.io') || (await page.locator('input[type="password"]').count())) {
    const pw = page.locator('input[type="password"]').first();
    if (await pw.count()) {
      const v = await pw.inputValue().catch(() => '');
      if (!v) await pw.fill('1234');
    }
    await page.locator('button[type="submit"], button:has-text("Submit")').first().click();
    await page.waitForTimeout(6000);
  }

  console.log('FINAL URL:', page.url());
  await page.screenshot({ path: '/tmp/pg_final.png', fullPage: true });

  // verify server-side state
  const r = await fetch(`${BASE}/api/orders/${ORDER.orderId}`);
  const o = await r.json();
  console.log('ORDER STATE:', JSON.stringify({ payment: o.payment, fulfillment: o.fulfillment }, null, 1));
  await browser.close();
  if (o.payment.status !== 'paid') process.exit(2);
  if (o.fulfillment.status !== 'submitted') process.exit(3);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
