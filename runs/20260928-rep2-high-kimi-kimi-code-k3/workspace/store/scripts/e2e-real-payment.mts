// True end-to-end test: create a checkout session on the deployed store,
// pay it with Stripe's test card via a real browser, and verify the whole
// pipeline (real Stripe webhook -> Prodigi order -> order-status).
// Usage: npx tsx scripts/e2e-real-payment.mts <prodUrl> <stripeSecretKey>
import { chromium, type Frame, type Page } from 'playwright';

const [, , prodUrl, stripeKey] = process.argv;
if (!prodUrl || !stripeKey) throw new Error('usage: e2e-real-payment.mts <prodUrl> <stripeKey>');

const customization = { text: 'MANTRA', style: 'heritage', ink: 'jet', shirt: 'natural', size: 'l' };

const checkoutRes = await fetch(`${prodUrl}/api/checkout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(customization),
});
const { url } = (await checkoutRes.json()) as { url: string };
const sessionId = new URL(url).pathname.split('/').pop()!;
console.log('SESSION_ID=' + sessionId);

const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(60000);

await page.goto(url, { waitUntil: 'networkidle' });

async function fillIfPresent(sel: string, val: string) {
  const el = page.locator(sel);
  if (await el.count()) await el.first().fill(val);
}
// Fill while focused, then Escape to close Stripe's address autocomplete.
async function fillAddress(sel: string, val: string) {
  const el = page.locator(sel);
  if (await el.count()) {
    await el.first().fill(val);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
}
async function selectIfPresent(sel: string, val: string) {
  const el = page.locator(sel);
  if (await el.count()) await el.first().selectOption(val);
}

await fillIfPresent('#email', 'e2e-real@example.com');
await fillIfPresent('#shippingName', 'E2E Real Recipient');
await selectIfPresent('#shippingCountry', 'US');
await fillAddress('#shippingAddressLine1', '123 Market Street');
await fillAddress('#shippingAddressLine2', 'Apt 4');
await fillAddress('#shippingLocality', 'San Francisco');
await selectIfPresent('#shippingAdministrativeArea', 'CA');
await fillAddress('#shippingPostalCode', '94103');

// Expand the card payment method only if it isn't already (clicks toggle).
{
  const btn = page.locator('[data-testid="card-accordion-item-button"]').first();
  for (let i = 0; i < 10; i++) {
    if (await page.locator('input[name="cardNumber"]').count()) break;
    const expanded = (await btn.getAttribute('aria-expanded').catch(() => null)) ?? 'false';
    if (expanded !== 'true') await btn.evaluate((e) => (e as HTMLElement).click()).catch(() => {});
    await page.waitForTimeout(800);
  }
}

// Card inputs live in Stripe's private iframes
async function frameWithInput(name: string): Promise<Frame> {
  for (let i = 0; i < 60; i++) {
    for (const f of page.frames()) {
      try {
        if (await f.locator(`input[name="${name}"]`).count()) return f;
      } catch {
        // frame detached, keep scanning
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error(
    `no frame with input[name=${name}]; frames: ` +
      (await Promise.all(
        page.frames().map(async (f) => {
          try {
            const names = await f.$$eval('input', (els) => els.map((e) => e.name || e.id).join(','));
            return `${f.url().slice(0, 60)}[${names}]`;
          } catch {
            return `${f.url().slice(0, 60)}[detached]`;
          }
        })
      )).join(' | ')
  );
}

// Card inputs: some checkout variants render them in the main frame,
// others inside Stripe's private iframes. Handle both.
if (await page.locator('input[name="cardNumber"]').count()) {
  await page.locator('input[name="cardNumber"]').fill('4242424242424242');
  await page.locator('input[name="cardExpiry"]').fill('12/34');
  await page.locator('input[name="cardCvc"]').fill('123');
} else {
  const numFrame = await frameWithInput('number');
  await numFrame.locator('input[name="number"]').fill('4242424242424242');
  await numFrame.locator('input[name="expiry"]').fill('12/34');
  await numFrame.locator('input[name="cvc"]').fill('123');
}

await fillIfPresent('#billingName', 'E2E Real Recipient');
await selectIfPresent('#billingCountry', 'US');
await fillAddress('#billingPostalCode', '94103');

// Decline Link signup so no phone number is required
const linkOptIn = page.locator('#enableStripePass');
if ((await linkOptIn.count()) && (await linkOptIn.isChecked())) await linkOptIn.click();

// Dismiss any address-autocomplete dropdowns before paying
await page.keyboard.press('Escape');
await page.locator('.AddressAutocomplete-result').first().waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
await page.screenshot({ path: '/tmp/e2e-checkout-2.png', fullPage: true });

const payBtn = page.locator('[data-testid="hosted-payment-submit-button"]').first();
await payBtn.evaluate((el) => (el as HTMLButtonElement).click());
await page.waitForURL(/\/success/, { timeout: 90000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/e2e-success.png', fullPage: true });
console.log('REDIRECTED=' + page.url());
await browser.close();

// Poll Stripe until the real webhook has processed the payment
for (let i = 0; i < 20; i++) {
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
  });
  const session = await res.json();
  const meta = session.metadata ?? {};
  console.log(
    `poll ${i}: payment_status=${session.payment_status} prodigiOrderId=${meta.prodigiOrderId ?? '-'} prodigiStatus=${meta.prodigiStatus ?? '-'}`
  );
  if (session.payment_status === 'paid' && meta.prodigiOrderId) {
    console.log('REAL_E2E_OK prodigiOrderId=' + meta.prodigiOrderId);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 5000));
}
console.error('REAL_E2E_TIMEOUT');
process.exit(1);
