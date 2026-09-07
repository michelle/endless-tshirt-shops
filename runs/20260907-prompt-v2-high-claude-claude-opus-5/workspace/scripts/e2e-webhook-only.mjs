import { chromium } from 'playwright-core';
const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const SK = process.env.SK;

// Build the session directly with an off-site success_url, so the /order page can never run.
// Only the webhook can fulfil this one.
const form = new URLSearchParams({
  mode: 'payment',
  success_url: 'https://example.com/done?s={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://example.com/cancel',
  'line_items[0][price_data][currency]': 'usd',
  'line_items[0][price_data][unit_amount]': '3600',
  'line_items[0][price_data][product_data][name]': 'Knocker-Upper — Last Shift tee',
  'line_items[0][quantity]': '1',
  'shipping_address_collection[allowed_countries][0]': 'US',
  'metadata[store]': 'last-shift',
  'metadata[cart0]': 'knocker-upper|black|l|1',
});
const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${SK}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: form,
});
const session = await r.json();
if (!session.url) { console.log('SESSION ERROR', JSON.stringify(session).slice(0, 400)); process.exit(1); }
console.log('SESSION_ID=' + session.id);

const b = await chromium.launch({ executablePath: EXEC });
const p = await b.newPage({ viewport: { width: 1280, height: 1100 } });
await p.goto(session.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(4000);
const put = async (loc, val, label) => {
  try { await loc.first().fill(val, { timeout: 6000 }); } catch { console.log('  MISS', label); }
};
await put(p.locator('#email'), 'webhook-only@lastshift.test', 'email');
await put(p.locator('#shippingName'), 'Grace Hopper', 'name');
await put(p.locator('#shippingAddressLine1'), '1 Federal Street', 'line1');
await put(p.getByPlaceholder('City', { exact: true }), 'Boston', 'city');
await put(p.getByPlaceholder('ZIP', { exact: true }), '02110', 'zip');
try { await p.selectOption('#shippingAdministrativeArea', 'MA'); } catch {}
try { const c = p.locator('input[type="checkbox"]').first(); if (await c.isChecked({timeout:2000})) await c.uncheck(); } catch {}
try { await p.locator('input[type="radio"]').first().check({ timeout: 8000, force: true }); } catch { console.log('  MISS card radio'); }
await p.waitForTimeout(3000);
await put(p.locator('#cardNumber'), '4242424242424242', 'cardNumber');
await put(p.locator('#cardExpiry'), '12 / 34', 'cardExpiry');
await put(p.locator('#cardCvc'), '123', 'cardCvc');
await p.locator('button[type="submit"], .SubmitButton').first().click({ timeout: 10000 });
try { await p.waitForURL(/example\.com\/done/, { timeout: 120000 }); console.log('PAID, landed off-site:', p.url().slice(0, 60)); }
catch { console.log('did not reach success_url:', p.url().slice(0, 80)); await p.screenshot({path:'/tmp/wh-fail.png'}); }
await b.close();
