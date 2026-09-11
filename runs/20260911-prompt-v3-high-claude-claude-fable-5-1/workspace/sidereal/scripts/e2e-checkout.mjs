// End-to-end: studio → Stripe Checkout (test card) → order page → Prodigi sandbox order.
// Usage: node scripts/e2e-checkout.mjs [baseUrl]
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3456";
const shots = "/tmp/e2e";
import fs from "node:fs";
fs.mkdirSync(shots, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
page.setDefaultTimeout(60000);
try {
  await page.goto(`${base}/design`);
  await page.waitForSelector(".sky-svg svg");
  // Tweak the design a little through the UI
  await page.fill('input[placeholder="The night we met"]', "E2E test night");
  await page.getByRole("button", { name: "Navy" }).click();
  await page.getByRole("button", { name: /^l$/i }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/1-studio.png`, fullPage: true });

  await page.getByRole("button", { name: "Checkout" }).click();
  await page.waitForURL(/checkout\.stripe\.com/);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${shots}/2-stripe.png`, fullPage: true });

  await page.fill("#email", "e2e-buyer@example.com");
  // Shipping
  await page.fill("#shippingName", "Ada Lovelace");
  await page.selectOption("#shippingCountry", "US");
  await page.fill("#shippingAddressLine1", "1 Infinite Loop");
  await page.keyboard.press("Escape"); // dismiss address autocomplete
  await page.fill("#shippingLocality", "Cupertino");
  await page.fill("#shippingPostalCode", "95014");
  const state = page.locator("#shippingAdministrativeArea");
  if (await state.count()) await state.selectOption("CA");
  const phone = page.locator("#phoneNumber");
  if (await phone.count()) await phone.fill("4085551234");

  // Card
  if (!(await page.locator("#cardNumber").count())) {
    const cardRadio = page.locator('input[type="radio"][value="card"]');
    if (await cardRadio.count()) await cardRadio.first().check({ force: true });
    else await page.getByText("Card", { exact: true }).first().click();
  }
  await page.waitForSelector("#cardNumber");
  await page.fill("#cardNumber", "4242 4242 4242 4242");
  await page.fill("#cardExpiry", "12 / 34");
  await page.fill("#cardCvc", "123");
  const billingName = page.locator("#billingName");
  if (await billingName.count()) await billingName.fill("Ada Lovelace");
  // Don't enrol in Link (avoids an OTP step after paying)
  const save = page.locator("#enableStripePass");
  if ((await save.count()) && (await save.isChecked())) await save.uncheck({ force: true });
  await page.screenshot({ path: `${shots}/3-filled.png`, fullPage: true });

  await page.locator(".SubmitButton").click();
  await page.waitForURL((u) => u.toString().startsWith(`${base}/order/`), { timeout: 90000 });
  const orderUrl = page.url();
  console.log("redirected to", orderUrl);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${shots}/4-order.png`, fullPage: true });

  const id = orderUrl.split("/order/")[1].split("?")[0];
  const res = await fetch(`${base}/api/orders/${id}`);
  console.log("order api", res.status, JSON.stringify(await res.json(), null, 1).slice(0, 1500));
} catch (err) {
  await page.screenshot({ path: `${shots}/error.png`, fullPage: true }).catch(() => {});
  console.error("E2E failed:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
