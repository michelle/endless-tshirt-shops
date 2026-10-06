// Complete a Stripe Checkout session in test mode using a headless browser.
// Usage: node scripts/pay-checkout.mjs <checkout-url>
import puppeteer from 'puppeteer-core';

const url = process.argv[2];
if (!url) { console.error('usage: pay-checkout.mjs <url>'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 1500 });
page.on('console', (m) => { const t = m.text(); if (/error/i.test(t)) console.log('PAGE:', t.slice(0, 160)); });

await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(5000);

async function typeInto(selector, value) {
  const el = await page.$(selector);
  if (!el) return false;
  await el.click({ clickCount: 3 });
  await el.type(value, { delay: 20 });
  return true;
}

// shipping form
await typeInto('#email', 'test-buyer@example.com');
await typeInto('#shippingName', 'Ada Lovelace');
await sleep(1500);
// switch off Google address autocomplete so the fields don't get hijacked
await page.evaluate(() => {
  const link = Array.from(document.querySelectorAll('a,button,span')).find(
    (e) => (e.textContent || '').trim() === 'Enter address manually'
  );
  if (link) link.click();
});
await sleep(1200);
await typeInto('#shippingAddressLine1', '1100 Congress Ave');
await sleep(300);
await typeInto('#shippingLocality', 'Austin');
await sleep(300);
await typeInto('#shippingPostalCode', '78701');
await sleep(300);
await page.select('#shippingAdministrativeArea', 'TX').catch(() => {});
await sleep(300);
// phone uses an input mask; type slowly
const phone = await page.$('#phoneNumber');
if (phone) {
  await phone.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await phone.type('5125550142', { delay: 60 });
}
await sleep(500);
console.log('filled shipping');

// expand the card payment accordion
await page.evaluate(() => {
  const b = document.querySelector('[data-testid="card-accordion-item-button"]');
  if (b) b.click();
});
await sleep(3000);
await page.screenshot({ path: '/tmp/pay1.png', fullPage: true });

// locate card fields (Stripe Elements iframes)
let cardFrame = null;
for (const f of page.frames()) {
  try {
    const has = await f.$('input[autocomplete="cc-number"], input[name="number"]');
    if (has) { cardFrame = f; break; }
  } catch { /* ignore */ }
}

async function frameType(frame, selectors, value) {
  for (const sel of selectors) {
    try {
      const el = await frame.$(sel);
      if (el) {
        await el.click({ clickCount: 3 });
        await el.type(value, { delay: 25 });
        return true;
      }
    } catch { /* ignore */ }
  }
  return false;
}

if (cardFrame) {
  console.log('card frame:', cardFrame.url().slice(0, 60));
  await frameType(cardFrame, ['input[autocomplete="cc-number"]', 'input[name="number"]', 'input[name="cardnumber"]'], '4242424242424242');
  await frameType(cardFrame, ['input[autocomplete="cc-exp"]', 'input[name="expiry"]', 'input[name="exp-date"]'], '1230');
  await frameType(cardFrame, ['input[autocomplete="cc-csc"]', 'input[name="cvc"]', 'input[name="cvc"]'], '123');
  console.log('filled card');
} else {
  console.log('NO CARD FRAME FOUND');
}
await sleep(1500);
await page.screenshot({ path: '/tmp/pay2.png', fullPage: true });

// submit
await page.evaluate(() => {
  const b = document.querySelector('[data-testid="hosted-payment-submit-button"]');
  if (b) b.click();
});
console.log('clicked pay');
await sleep(18000);
console.log('FINAL URL:', page.url());
const text = await page.evaluate(() => document.body.innerText.slice(0, 400));
console.log('FINAL TEXT:', text.replace(/\n+/g, ' | '));
await page.screenshot({ path: '/tmp/pay3.png', fullPage: true });
await browser.close();
