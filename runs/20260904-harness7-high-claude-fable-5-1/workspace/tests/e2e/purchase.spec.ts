import { expect, test, type FrameLocator, type Page } from "@playwright/test";

/**
 * Full customer journey with Stripe's test card:
 * pick a shirt -> Buy (timestamp freezes) -> fill Stripe Elements -> pay ->
 * order placed with Prodigi (sandbox) -> success screen shows the order id.
 */

async function fillInFrame(page: Page, frameTitleFragment: string, fill: (frame: FrameLocator) => Promise<void>) {
  const frame = page.frameLocator(`iframe[title*="${frameTitleFragment}"]`).first();
  await fill(frame);
}

test("buys a shirt with the current datetime", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "datetime.store" })).toBeVisible();

  // The shirt ticks while browsing.
  const shirtTime = page.locator(".shirt-time");
  const t1 = await shirtTime.textContent();
  await page.waitForTimeout(120);
  const t2 = await shirtTime.textContent();
  expect(t1).not.toEqual(t2);

  await page.getByLabel(/Unisex/).check();
  await page.getByLabel("L", { exact: true }).check();

  const before = Date.now();
  await page.getByRole("button", { name: /Buy now/ }).click();

  // Checkout appears with the frozen timestamp; the shirt shows the same number.
  const summaryTs = page.locator(".checkout-summary .ts");
  await expect(summaryTs).toBeVisible({ timeout: 30_000 });
  const frozen = Number(await summaryTs.textContent());
  expect(frozen).toBeGreaterThanOrEqual(before - 1000);
  expect(frozen).toBeLessThanOrEqual(Date.now() + 5 * 60_000);
  await page.waitForTimeout(150);
  expect(await shirtTime.textContent()).toEqual(String(frozen));

  // Email (Link Authentication Element).
  await fillInFrame(page, "Secure email input", async (f) => {
    await f.getByLabel("Email").fill("jenny.rosen@example.com");
  });

  // Shipping (Address Element). Use manual entry so autocomplete never gets in the way.
  await fillInFrame(page, "Secure address input", async (f) => {
    await f.getByLabel("Full name").fill("Jenny Rosen");
    const manual = f.getByText("Enter address manually");
    if (await manual.isVisible().catch(() => false)) await manual.click();
    await f.getByLabel("Address line 1").fill("185 Berry St");
    await f.getByLabel("City").fill("San Francisco");
    await f.getByLabel("ZIP").fill("94107");
    await f.getByLabel("State").selectOption("CA");
  });

  // Card (Payment Element).
  await fillInFrame(page, "Secure payment input", async (f) => {
    const cardTab = f.getByTestId("card-tab-button");
    if (await cardTab.isVisible().catch(() => false)) await cardTab.click();
    await f.getByLabel("Card number").fill("4242424242424242");
    await f.getByLabel("Expiration date").fill("12 / 34");
    await f.getByLabel("Security code").fill("123");
    const zip = f.getByLabel("ZIP");
    if (await zip.isVisible().catch(() => false)) await zip.fill("94107");
  });

  await page.getByRole("button", { name: /^Pay \$22\.50/ }).click();

  await expect(page.getByText("Congrats on your pretty cool shirt!")).toBeVisible({ timeout: 90_000 });
  await expect(page.locator(".success .ts")).toHaveText(String(frozen));
  const ref = await page.locator(".success-details dd").nth(1).textContent();
  expect(ref).toMatch(/^ord_|^pi_/);
  console.log(`order placed: timestamp=${frozen} reference=${ref}`);

  // The print file for this exact moment is served.
  const art = await page.request.get(`/api/artwork/${frozen}.png?style=unisex`);
  expect(art.status()).toBe(200);
  expect(art.headers()["content-type"]).toBe("image/png");
});
