import { chromium } from 'playwright-core';
const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const SITE = process.argv[2];

const res = await fetch(`${SITE}/api/checkout`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ items: [
    { slug: 'ice-cutter', color: 'forest green', size: 'l', qty: 1 },
    { slug: 'human-computer', color: 'sand', size: '2xl', qty: 2 },
  ] }),
});
const { url, id } = await res.json();
console.log('session', id);

const b = await chromium.launch({ executablePath: EXEC });
const p = await b.newPage({ viewport: { width: 1280, height: 1100 } });
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(4000);

const put = async (loc, val, label) => {
  try { await loc.first().fill(val, { timeout: 6000 }); console.log('  ok  ', label); }
  catch (e) { console.log('  MISS', label, e.message.split('\n')[0].slice(0, 80)); }
};

await put(p.locator('#email'), 'buyer@lastshift.test', 'email');
await put(p.locator('#shippingName'), 'Ada Lovelace', 'name');
await put(p.locator('#shippingAddressLine1'), '350 Fifth Avenue', 'line1');
await put(p.getByPlaceholder('City', { exact: true }), 'New York', 'city');
await put(p.getByPlaceholder('ZIP', { exact: true }), '10118', 'zip');
try { await p.selectOption('#shippingAdministrativeArea', 'NY'); console.log('  ok   state'); } catch { console.log('  MISS state'); }
await put(p.locator('input[type="tel"]').first(), '2125551234', 'phone');

// Opt out of Link so the flow stays on the card form.
const save = p.locator('input[type="checkbox"]').filter({ hasNot: p.locator('x') }).first();
try { if (await save.isChecked({ timeout: 2000 })) { await save.uncheck({ timeout: 4000 }); console.log('  ok   unchecked Link'); } } catch {}

// Choose Card, then fill card details.
try {
  await p.locator('input[type="radio"]').first().check({ timeout: 8000, force: true });
  console.log('  ok   selected Card');
} catch (e) { console.log('  MISS card radio', e.message.split('\n')[0].slice(0,80)); }
await p.waitForTimeout(3000);
console.log('  card fields present:', await p.locator('#cardNumber').count());
await put(p.locator('#cardNumber'), '4242424242424242', 'cardNumber');
await put(p.locator('#cardExpiry'), '12 / 34', 'cardExpiry');
await put(p.locator('#cardCvc'), '123', 'cardCvc');
await put(p.locator('#billingName'), 'Ada Lovelace', 'billingName');

await p.screenshot({ path: '/tmp/checkout-filled.png', fullPage: true });
await p.locator('button[type="submit"], .SubmitButton').first().click({ timeout: 10000 });
console.log('submitted…');
try {
  await p.waitForURL(/\/order\?session_id=/, { timeout: 120000 });
  console.log('REDIRECTED ->', p.url());
  await p.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(22000); // let the async fulfilment land and the page self-refresh
  await p.screenshot({ path: '/tmp/order.png', fullPage: true });
} catch (e) {
  console.log('NO REDIRECT', e.message.split('\n')[0]);
  await p.screenshot({ path: '/tmp/checkout-fail.png', fullPage: true });
}
await b.close();
console.log('SESSION_ID=' + id);
