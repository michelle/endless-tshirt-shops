import { chromium } from "playwright";

const BASE = "https://benchmark-20260827-harness6-high-cl-iota.vercel.app";

const res = await fetch(`${BASE}/api/checkout`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ style: "fitted", size: "S", ts: Date.now() }),
});
const { url, ts } = await res.json();
if (!url) throw new Error("no checkout url");
console.log("ts:", ts);
console.log("checkout url:", url.slice(0, 60));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(30000);

await page.goto(url, { waitUntil: "networkidle" });
await page.screenshot({ path: "/tmp/co-1.png", fullPage: true });

async function fillIfVisible(selector, value) {
  const el = page.locator(selector).first();
  if (await el.isVisible().catch(() => false)) {
    await el.fill(value);
    return true;
  }
  return false;
}

await page.fill('input[name="email"]', "test-customer@example.com");

// Shipping name + address
await fillIfVisible('input[name="shippingName"]', "Jenny Rosen");
// Try manual address entry if the toggle exists
const manual = page.getByText("Enter address manually").first();
if (await manual.isVisible().catch(() => false)) {
  await manual.click();
}
await fillIfVisible('input[name="shippingAddressLine1"]', "185 Berry St");
await fillIfVisible('input[name="shippingAddressLine2"]', "Suite 550");
await fillIfVisible('input[name="shippingLocality"]', "San Francisco");
await fillIfVisible('input[name="shippingPostalCode"]', "94107");
const stateSel = page.locator('select[name="shippingAdministrativeArea"]').first();
if (await stateSel.isVisible().catch(() => false)) {
  await stateSel.selectOption("CA");
}

// Select the Card payment method and wait for its fields to appear
const cardItem = page
  .locator(
    '[data-testid="card-accordion-item"], [data-testid="card-accordion-item-button"], input[type="radio"][value="card"]'
  )
  .first();
await cardItem.click({ force: true });
await page.waitForTimeout(2500);
await page.screenshot({ path: "/tmp/co-1b.png", fullPage: true });
await page.waitForSelector('input[name="cardNumber"]', { timeout: 15000 });

// Billing same as shipping; don't save info with Link (it demands a phone)
const billingSame = page.getByRole("checkbox", { name: /billing info/i });
if (await billingSame.isVisible().catch(() => false)) {
  await billingSame.check({ force: true }).catch(() => {});
}
const saveBox = page.getByRole("checkbox", { name: /save my information/i });
if (
  (await saveBox.isVisible().catch(() => false)) &&
  (await saveBox.isChecked().catch(() => false))
) {
  await saveBox.uncheck({ force: true }).catch(() => {});
}

// Card details
await fillIfVisible('input[name="cardNumber"]', "4242424242424242");
await fillIfVisible('input[name="cardExpiry"]', "12/34");
await fillIfVisible('input[name="cardCvc"]', "123");
await fillIfVisible('input[name="billingName"]', "Jenny Rosen");
const zip = page.locator('input[name="billingPostalCode"]').first();
if (await zip.isVisible().catch(() => false)) {
  await zip.fill("94107");
}

await page.screenshot({ path: "/tmp/co-2.png", fullPage: true });

await page.locator('button[data-testid="hosted-payment-submit-button"]').click();

await page.waitForURL(/\/success\?session_id=/, { timeout: 60000 });
console.log("redirected:", page.url());
// Give the webhook + refresh loop time to surface the Prodigi order id
await page.waitForTimeout(9000);
await page.screenshot({ path: "/tmp/co-3.png", fullPage: true });
const body = await page.textContent("body");
console.log("SUCCESS PAGE TEXT:", body.replace(/\s+/g, " ").slice(0, 600));
await browser.close();
