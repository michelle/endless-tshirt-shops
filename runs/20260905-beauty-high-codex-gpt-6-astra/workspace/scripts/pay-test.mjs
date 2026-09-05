import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const { url, frozen } = JSON.parse(
  await fs.readFile("artifacts/checkout-state.json", "utf8"),
);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
await page.goto(url, { waitUntil: "networkidle" });
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
await page.locator("#cardNumber").fill("4242424242424242");
await page.locator("#cardExpiry").fill("1230");
await page.locator("#cardCvc").fill("123");
if (await page.locator("#enableStripePass").isChecked())
  await page.locator("#enableStripePass").uncheck();
const agent = page.getByLabel(
  "I am an AI agent acting on behalf of someone else",
);
if (await agent.count()) await agent.evaluate((el) => el.click());
await page.getByRole("button", { name: "Pay", exact: true }).click();
try {
  await page.waitForURL(/\/success\?session_id=/, { timeout: 60000 });
  console.log("Returned to:", page.url());
  await page.waitForLoadState("networkidle");
  console.log("Receipt:", await page.locator("body").innerText());
  await fs.writeFile(
    "artifacts/paid-order.json",
    JSON.stringify(
      {
        url: page.url(),
        timestamp: frozen,
        sessionId: new URL(page.url()).searchParams.get("session_id"),
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: "artifacts/receipt.png", fullPage: true });
} catch (e) {
  console.log("Payment state:", await page.locator("body").innerText());
  console.log(
    "Frames:",
    page.frames().map((f) => f.url()),
  );
  throw e;
} finally {
  await browser.close();
}
