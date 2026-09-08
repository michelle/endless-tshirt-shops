// End-to-end purchase test: browse -> add to cart -> Stripe Checkout (test card) -> success -> order page.
// Usage: node scripts/e2e-purchase.mjs https://your-site [--headed]
import { chromium } from "playwright";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const headed = process.argv.includes("--headed");
const shots = "/tmp/e2e";
import { mkdirSync } from "node:fs";
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: !headed });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(45000);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

try {
  log("open product page");
  await page.goto(`${base}/shirts/meal-pill-nutrition`);
  await page.getByRole("button", { name: "White", exact: true }).click();
  await page.getByRole("button", { name: "L", exact: true }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: /View cart/ }).click();
  await page.waitForURL(/\/cart/);
  await page.screenshot({ path: `${shots}/1-cart.png` });
  log("cart ok, starting checkout");
  await page.getByRole("button", { name: /Checkout with Stripe/ }).click();
  await page.waitForURL(/checkout\.stripe\.com/);
  log("on stripe checkout");

  // Fill Stripe's hosted checkout. Selectors are Stripe's stable ids.
  await page.fill("#email", "obsolete-futures-test@example.com");
  const phone = page.locator("#phoneNumber");
  if (await phone.count()) await phone.fill("4155551234").catch(() => {});
  await page.fill("#shippingName", "Ada Testperson");
  const country = page.locator("#shippingCountry");
  if (await country.count()) await country.selectOption("US");
  await page.fill("#shippingAddressLine1", "1 Market St");
  await page.keyboard.press("Escape"); // close Google address suggestions
  const manual = page.getByText(/Enter address manually/i);
  if (await manual.count()) await manual.first().click().catch(() => {});
  const line2 = page.locator("#shippingAddressLine2");
  if (await line2.count()) await line2.fill("Suite 400").catch(() => {});
  await page.fill("#shippingLocality", "San Francisco");
  await page.fill("#shippingPostalCode", "94105");
  const state = page.locator("#shippingAdministrativeArea");
  if (await state.count()) await state.selectOption("CA");

  // Express shipping if offered as a radio.
  const express = page.getByText(/Express/).first();
  if (await express.count()) await express.click().catch(() => {});

  // Select the Card payment method (radio list) and wait for the card fields.
  const cardNumber = page.locator("#cardNumber");
  if (!(await cardNumber.isVisible().catch(() => false))) {
    const label = page.locator("#payment-method-label-card");
    if (await label.count()) await label.click({ force: true }).catch(() => {});
    if (!(await cardNumber.isVisible().catch(() => false))) {
      await page.locator("#payment-method-accordion-item-title-card").check({ force: true }).catch(() => {});
    }
  }
  await cardNumber.waitFor();
  await page.fill("#cardNumber", "4242424242424242");
  await page.fill("#cardExpiry", "12 / 34");
  await page.fill("#cardCvc", "123");
  const billingName = page.locator("#billingName");
  if (await billingName.count()) await billingName.fill("Ada Testperson").catch(() => {});
  const sameAsShipping = page.locator("#billingAddressSameAsShipping");
  if ((await sameAsShipping.count()) && !(await sameAsShipping.isChecked())) await sameAsShipping.check();
  // Don't enrol in Link (avoids an OTP prompt).
  const link = page.locator("#enableStripePass");
  if ((await link.count()) && (await link.isChecked())) await link.uncheck().catch(() => {});
  await page.screenshot({ path: `${shots}/2-stripe.png`, fullPage: true });

  log("submitting payment");
  await page.locator(".SubmitButton, button[type=submit]").first().click();
  await page.waitForURL(/\/order\/success/, { timeout: 90000 });
  log("back on success page");
  await page.getByText(/Order number/).waitFor({ timeout: 60000 });
  const orderId = (await page.locator("dd.font-mono").first().innerText()).trim();
  await page.screenshot({ path: `${shots}/3-success.png` });
  log("prodigi order:", orderId);

  await page.getByRole("link", { name: "Track this order" }).click();
  await page.waitForURL(/\/order\/ord_/);
  await page.getByRole("heading", { level: 1 }).waitFor();
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  await page.screenshot({ path: `${shots}/4-order.png`, fullPage: true });
  log("order page heading:", heading);

  const api = await (await fetch(`${base}/api/orders/${orderId}`)).json();
  console.log(JSON.stringify(api, null, 2));
  console.log("E2E OK");
} catch (e) {
  await page.screenshot({ path: `${shots}/error.png`, fullPage: true }).catch(() => {});
  console.error("E2E FAILED at", page.url(), e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
