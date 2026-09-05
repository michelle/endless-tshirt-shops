#!/usr/bin/env node
/**
 * End-to-end verification of the customer flow against a running deployment.
 *
 *   BASE_URL=https://example.vercel.app node scripts/verify-flow.mjs
 *
 * Drives a headless Chromium through the real page: picks a cut and size, fills the
 * Stripe Address + Payment Elements with the 4242 test card, buys, then checks the
 * order API, the print file, and (if PRODIGI_API_KEY is set) the order on Prodigi.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = "verify-artifacts";
const PRODIGI_API_KEY = process.env.PRODIGI_API_KEY;
const PRODIGI_BASE = process.env.PRODIGI_ENV === "live" ? "https://api.prodigi.com/v4.0" : "https://api.sandbox.prodigi.com/v4.0";

const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);
const assert = (cond, msg) => {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  log("✓", msg);
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await context.newPage();
page.on("pageerror", (e) => log("PAGE ERROR:", e.message));
page.on("console", (m) => (m.type() === "error" ? log("console.error:", m.text()) : null));

try {
  log("→", BASE_URL);
  const health = await (await fetch(`${BASE_URL}/api/health`)).json();
  log("health", JSON.stringify(health));
  assert(health.ok && health.stripe.configured && health.prodigi.configured, "server reports Stripe + Prodigi configured");

  // Stripe.js keeps the network busy, so don't wait for networkidle.
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.locator(".Shirt-print-epoch").waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/01-shop.png`, fullPage: true });

  const epoch = page.locator(".Shirt-print-epoch");
  const t1 = await epoch.textContent();
  await page.waitForTimeout(120);
  const t2 = await epoch.textContent();
  assert(/^\d{13}$/.test(t1.trim()) && t1 !== t2, `shirt is ticking (${t1.trim()} → ${t2.trim()})`);

  await page.locator('label[for="style-unisex"]').click();
  await page.locator('label[for="size-L"]').click();
  assert(await page.locator("#style-unisex").isChecked(), "selected Unisex");
  assert(await page.locator("#size-L").isChecked(), "selected size L");

  // Express checkout (wallets/Link) may or may not be offered in headless Chromium; use the manual form either way.
  const manualSwitch = page.getByRole("button", { name: "Or enter details manually" });
  const form = page.locator("form.Checkout-form");
  await Promise.race([
    manualSwitch.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
    form.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
  ]);
  if (await manualSwitch.isVisible().catch(() => false)) {
    log("express checkout offered; switching to manual form");
    await manualSwitch.click();
  }
  await form.waitFor({ state: "visible", timeout: 15000 });

  await page.fill("#email", "verify+datetime@example.com");

  const address = page.frameLocator('iframe[src*="elements-inner-address"]');
  await address.locator('input[name="name"]').waitFor({ timeout: 30000 });
  await address.locator('input[name="name"]').fill("Jenny Rosen");
  await address.locator('input[name="addressLine1"]').fill("185 Berry St");
  // Dismiss any autocomplete suggestions and force manual entry.
  await page.keyboard.press("Escape").catch(() => {});
  const manualEntry = address.getByText(/enter address manually/i);
  if (await manualEntry.isVisible().catch(() => false)) await manualEntry.click();
  await address.locator('input[name="addressLine1"]').fill("185 Berry St");
  const line2 = address.locator('input[name="addressLine2"]');
  if (await line2.isVisible().catch(() => false)) await line2.fill("Suite 550");
  await address.locator('input[name="locality"]').fill("San Francisco");
  await address.locator('select[name="administrativeArea"]').selectOption("CA");
  await address.locator('input[name="postalCode"]').fill("94107");
  const phone = address.locator('input[name="phone"]');
  if (await phone.isVisible().catch(() => false)) await phone.fill("4155551234");

  const payment = page.frameLocator('iframe[src*="elements-inner-payment"]');
  const cardTab = payment.locator('[data-testid="card"], button:has-text("Card")').first();
  if (await cardTab.isVisible().catch(() => false)) await cardTab.click();
  await payment.locator('input[name="number"]').waitFor({ timeout: 30000 });
  await payment.locator('input[name="number"]').fill("4242424242424242");
  await payment.locator('input[name="expiry"]').fill("12/34");
  await payment.locator('input[name="cvc"]').fill("123");
  const billingCountry = payment.locator('select[name="country"]');
  if (await billingCountry.isVisible().catch(() => false)) await billingCountry.selectOption("US");
  const billingZip = payment.locator('input[name="postalCode"]');
  if (await billingZip.isVisible().catch(() => false)) await billingZip.fill("94107");

  await page.screenshot({ path: `${OUT}/02-filled.png`, fullPage: true });

  const frozenBefore = (await epoch.textContent()).trim();
  const buyAt = Date.now();
  await page.getByRole("button", { name: "Buy now" }).click();
  log("clicked Buy now at", buyAt, "(shirt showed", frozenBefore + ")");

  const success = page.locator('[data-testid="success"]');
  await success.waitFor({ state: "visible", timeout: 90000 });
  await page.screenshot({ path: `${OUT}/03-success.png`, fullPage: true });
  const shownTs = Number((await page.locator('[data-testid="success-timestamp"]').textContent()).trim());
  const shirtTs = Number((await epoch.textContent()).trim());
  assert(Number.isInteger(shownTs) && Math.abs(shownTs - buyAt) < 5000, `frozen timestamp ${shownTs} is the moment of purchase`);
  assert(shirtTs === shownTs, "shirt preview shows the purchased timestamp");

  const href = await page.locator('a[href^="/orders/"]').first().getAttribute("href");
  const orderId = href.split("/").pop();
  assert(/^pi_/.test(orderId), `order id ${orderId}`);

  const order = await (await fetch(`${BASE_URL}/api/orders/${orderId}?refresh=1`)).json();
  log("order", JSON.stringify(order));
  assert(order.paid === true && order.paymentStatus === "succeeded", "Stripe payment succeeded");
  assert(order.style === "unisex" && order.size === "L", "order records Unisex / L");
  assert(order.timestamp === shownTs, "order timestamp matches");
  assert(order.fulfillment.orderId, `Prodigi order created: ${order.fulfillment.orderId} (${order.fulfillment.status})`);

  const art = await fetch(order.artworkUrl);
  const buf = Buffer.from(await art.arrayBuffer());
  assert(art.status === 200 && buf.subarray(1, 4).toString() === "PNG", `print file is a PNG (${buf.length} bytes) at ${order.artworkUrl}`);
  await writeFile(`${OUT}/04-print-file.png`, buf);

  await page.goto(`${BASE_URL}${href}`, { waitUntil: "domcontentloaded" });
  await page.locator(".order-meta").waitFor({ timeout: 30000 });
  await page.screenshot({ path: `${OUT}/05-order-page.png`, fullPage: true });
  assert((await page.textContent("body")).includes(order.fulfillment.orderId), "order page shows the Prodigi order id");

  if (PRODIGI_API_KEY) {
    const res = await fetch(`${PRODIGI_BASE}/orders/${order.fulfillment.orderId}`, { headers: { "X-API-Key": PRODIGI_API_KEY } });
    const body = await res.json();
    const o = body.order;
    log("prodigi", JSON.stringify({ id: o.id, stage: o.status.stage, details: o.status.details, issues: o.status.issues, sku: o.items[0].sku, attributes: o.items[0].attributes, asset: o.items[0].assets[0].url, recipient: o.recipient.address }));
    assert(o.merchantReference === orderId, "Prodigi merchantReference is the PaymentIntent id");
    assert(o.items[0].sku === order.sku && o.items[0].attributes.size === "l" && o.items[0].attributes.color === "black", "Prodigi item is the right SKU/size/colour");
    assert(o.items[0].assets[0].url === order.artworkUrl, "Prodigi asset URL is the print file");
  }

  log("ALL CHECKS PASSED");
} catch (err) {
  await page.screenshot({ path: `${OUT}/failure.png`, fullPage: true }).catch(() => {});
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
