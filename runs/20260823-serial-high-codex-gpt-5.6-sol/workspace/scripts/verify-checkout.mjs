import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL;
if (!baseUrl) throw new Error("Set E2E_BASE_URL to the deployed application URL");
if (process.env.E2E_CONFIRM_ORDER !== "true") throw new Error("Set E2E_CONFIRM_ORDER=true to acknowledge that this creates sandbox orders");

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.E2E_CHROME_PATH || undefined,
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.setDefaultTimeout(20_000);
  console.log("Opening storefront");
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator(".buy-button").click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

  console.log("Completing Stripe Checkout");
  await page.locator('[name="email"]').fill("datetime-test@example.com");
  await page.locator('[name="shippingName"]').fill("Datetime Store Test");
  await page.getByText("Enter address manually", { exact: true }).click();
  await page.locator('[name="shippingAddressLine1"]').fill("510 Townsend Street");
  await page.locator('[name="shippingLocality"]').fill("San Francisco");
  await page.locator('[name="shippingAdministrativeArea"]').selectOption("CA");
  await page.locator('[name="shippingPostalCode"]').fill("94103");
  await page.locator('input[value="card"]').check({ force: true });
  let cardFrame;
  for (let attempt = 0; attempt < 30 && !cardFrame; attempt += 1) {
    for (const frame of page.frames()) {
      if (await frame.locator('[autocomplete="cc-number"]').count()) {
        cardFrame = frame;
        break;
      }
    }
    if (!cardFrame) await page.waitForTimeout(250);
  }
  if (!cardFrame) throw new Error("Stripe card-entry frame did not load");
  if (process.env.E2E_DEBUG === "true") {
    console.log("CARD FRAME", await cardFrame.locator("input").evaluateAll((inputs) => inputs.map((input) => ({ name: input.name, placeholder: input.placeholder, autocomplete: input.autocomplete }))));
  }
  await cardFrame.locator('[autocomplete="cc-number"]').fill("4242424242424242");
  await cardFrame.locator('[autocomplete="cc-exp"]').fill("1234");
  await cardFrame.locator('[autocomplete="cc-csc"]').fill("123");

  const saveInfo = page.locator('[name="enableStripePass"]');
  if (await saveInfo.isChecked()) await saveInfo.uncheck();
  await page.getByRole("button", { name: /^Pay$/ }).click();
  await page.waitForURL(new RegExp(`${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/success`), { timeout: 60_000 });

  console.log("Waiting for Scalable Press fulfillment");
  await page.getByText("ORDER CONFIRMED", { exact: true }).waitFor({ timeout: 90_000 });
  const reference = await page.locator(".order-stamp small").textContent();
  console.log(`Checkout and fulfillment passed: ${reference}`);
} finally {
  await browser.close();
}
