import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const base = "https://" + process.env.BENCHMARK_VERCEL_PROJECT + ".vercel.app";
for (const path of ["/", "/icon.png", "/policies", "/og.png"]) {
  const r = await fetch(base + path);
  console.log(path, r.status);
  if (r.status !== 200) throw new Error("Failed " + path);
}
const bogus = await fetch(
  base + "/api/artwork?v=1&t=1788600000000&c=black&sig=bad",
);
console.log("Unsigned artwork:", bogus.status);
const badInput = await fetch(base + "/api/checkout", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    timestamp: Date.now(),
    size: "M",
    color: "black",
    fit: "unisex",
    requestId: crypto.randomUUID(),
    price: 1,
  }),
});
console.log("Price tampering:", badInput.status);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base, { waitUntil: "networkidle" });
await page.screenshot({ path: "artifacts/final-desktop.png", fullPage: true });
await page.getByRole("button", { name: "Cloud", exact: true }).click();
await page
  .getByRole("button", { name: "Fitted A little more shape", exact: true })
  .click();
await page
  .getByRole("button", { name: "Make this moment mine", exact: true })
  .click();
console.log(
  "Named accessible bag:",
  await page.getByRole("dialog", { name: "You caught a moment." }).isVisible(),
);
await page
  .getByRole("button", { name: "Continue to checkout", exact: true })
  .click();
await page.waitForURL(/checkout.stripe.com/, { timeout: 60000 });
const sessionId = page.url().match(/cs_test_[A-Za-z0-9]+/)[0];
await page.waitForLoadState("networkidle");
console.log(
  "Branded checkout:",
  (await page.locator("body").innerText()).includes("datetime.store"),
);
await page.locator("#email").fill("datetime-test@example.com");
await page.locator("#shippingName").fill("Datetime Test");
const manual = page.getByText("Enter address manually", { exact: true });
if (await manual.isVisible()) await manual.click();
await page.locator("#shippingAddressLine1").fill("123 Test Street");
await page.locator("#shippingLocality").fill("San Francisco");
await page.locator("#shippingPostalCode").fill("94107");
await page
  .locator('select[name="shippingAdministrativeArea"]')
  .selectOption("CA");
await page.locator("#cardNumber").fill("4000000000000002");
await page.locator("#cardExpiry").fill("1230");
await page.locator("#cardCvc").fill("123");
if (await page.locator("#enableStripePass").isChecked())
  await page.locator("#enableStripePass").uncheck();
const agent = page.getByLabel(
  "I am an AI agent acting on behalf of someone else",
);
if (await agent.count()) await agent.evaluate((el) => el.click());
await page.getByRole("button", { name: "Pay", exact: true }).click();
await page
  .getByText(/declined/i)
  .first()
  .waitFor({ timeout: 15000 })
  .catch(async (e) => {
    console.log("Payment error state:", await page.locator("body").innerText());
    throw e;
  });
console.log("Declined card error: visible");
const order = await fetch(base + "/api/orders?session_id=" + sessionId);
console.log("Declined order:", await order.json());
await page.getByText("Back", { exact: true }).click();
await page.waitForURL(/checkout=canceled/, { timeout: 20000 });
console.log(
  "Cancellation bag retained:",
  await page.locator(".bag-count").textContent(),
);
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "artifacts/final-mobile.png", fullPage: true });
console.log(
  "Mobile overflow:",
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
console.log("Browser errors:", errors);
await browser.close();
