// Manual end-to-end smoke test: drives the real storefront UI through a full
// Stripe test-card purchase and confirms the success page renders.
// Not run in CI/build — install its one dependency first:
//   npm i -D playwright && npx playwright install chromium
// Then: BASE_URL=http://localhost:3000 node scripts/e2e.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });

await page.goto(BASE, { waitUntil: "networkidle" });
await page.screenshot({ path: "/tmp/home.png", fullPage: true });
console.log("home screenshot saved");

await page.getByRole("button", { name: "Unisex" }).click();
await page.getByRole("button", { name: "L", exact: true }).click();

await Promise.all([
  page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 }),
  page.getByRole("button", { name: /Buy now/ }).click(),
]);
console.log("reached stripe checkout:", page.url());
await page.waitForLoadState("networkidle");

// Email
await page.getByPlaceholder("email@example.com").fill("e2e-test@example.com");

// Full name
await page.getByPlaceholder("Full name").fill("Ada Lovelace");

// Switch to manual address entry for reliable, non-autocomplete fields
await page.getByText("Enter address manually").click();
await page.getByLabel("Country or region").selectOption("GB").catch(() => {});
await page.getByPlaceholder("Address line 1").fill("10 Downing Street");
await page.getByPlaceholder("Town or city").fill("London").catch(async () => {
  await page.getByPlaceholder("City").fill("London");
});
await page
  .getByPlaceholder("Postal code")
  .fill("SW1A 2AA")
  .catch(async () => {
    await page.getByPlaceholder("ZIP").fill("SW1A 2AA");
  });

await page.screenshot({ path: "/tmp/checkout-address.png", fullPage: true });

await page.getByText("Card", { exact: true }).click({ force: true });

const cardNumberField = page.getByPlaceholder("1234 1234 1234 1234");
await cardNumberField.waitFor({ state: "visible", timeout: 10000 });
await cardNumberField.fill("4242424242424242");
await page.getByPlaceholder("MM / YY").fill("12/34");
await page.getByPlaceholder("CVC").fill("123");

await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/checkout-filled.png", fullPage: true });

const payButton = page.locator('[data-testid="hosted-payment-submit-button"]');
await payButton.click();

await page.waitForURL(/\/success/, { timeout: 30000 });
console.log("reached success page:", page.url());
await page.waitForLoadState("networkidle");
await page.screenshot({ path: "/tmp/success.png", fullPage: true });

await browser.close();
console.log("DONE");
