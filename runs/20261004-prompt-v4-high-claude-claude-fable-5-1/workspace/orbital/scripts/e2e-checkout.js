const { chromium } = require("playwright");
const URL = process.env.URL;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await ctx.newPage();
  // Never let the browser hit our order page; we want to prove the WEBHOOK created the Prodigi order.
  let successUrl = null;
  await page.route(`${URL}/order/**`, (route) => { successUrl = route.request().url(); route.abort(); });
  try {
    // 1. Storefront: design the shirt in the real UI
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.fill('input[type="date"]', "1987-07-16");
    await page.fill('input[type="text"][maxlength]', "the day the comet came");
    await page.click('button[aria-label="Navy"]');
    await page.click('button:has-text("Solar")');
    await page.click('button:has-text("XL")');
    await page.screenshot({ path: "/tmp/e2e-1-store.png", fullPage: true });
    await Promise.all([
      page.waitForURL(/checkout\.stripe\.com/, { timeout: 60000 }),
      page.click('button:has-text("Buy this tee")'),
    ]);
    console.log("checkout url:", page.url().slice(0, 70));
    const sessionId = page.url().match(/cs_test_[A-Za-z0-9]+/)[0];
    console.log("session:", sessionId);

    // 2. Stripe Checkout (test mode)
    await page.waitForSelector("#email", { timeout: 60000 });
    await page.fill("#email", `orbital-e2e-${Date.now()}@example.com`);
    // shipping block
    const fillIf = async (sel, val) => { const el = page.locator(sel); if (await el.count()) { await el.first().fill(val); return true; } return false; };
    const selectIf = async (sel, val) => { const el = page.locator(sel); if (await el.count()) { await el.first().selectOption(val); return true; } return false; };
    await fillIf("#shippingName", "Ada Lovelace");
    await selectIf("#shippingCountry", "US");
    const manual = page.locator('text=Enter address manually');
    if (await manual.count()) await manual.first().click();
    if (!(await fillIf("#shippingAddressLine1", "1600 Pennsylvania Ave NW"))) {
      // single-line autocomplete input
      await page.fill('input[name="shippingAddressLine1"], input[autocomplete="shipping address-line1"]', "1600 Pennsylvania Ave NW");
    }
    await fillIf("#shippingLocality", "Washington");
    await fillIf("#shippingPostalCode", "20500");
    await selectIf("#shippingAdministrativeArea", "DC");
    await fillIf("#phoneNumber", "2025550100");
    await page.screenshot({ path: "/tmp/e2e-2-checkout-address.png", fullPage: true });
    // shipping method: pick Express (second option) to test method mapping
    const express = page.locator('text=Express shipping');
    if (await express.count()) await express.first().click();
    // card
    console.log("frames:", page.frames().map((f) => f.url().slice(0, 60)));
    const radios = await page.locator('input[type="radio"]').evaluateAll((els) => els.map((e) => ({ id: e.id, name: e.name, value: e.value, testid: e.getAttribute("data-testid") })));
    console.log("radios:", JSON.stringify(radios));
    const btns = await page.locator('[data-testid*="card" i], [id*="card" i]').evaluateAll((els) => els.slice(0, 10).map((e) => ({ tag: e.tagName, id: e.id, testid: e.getAttribute("data-testid"), cls: (e.className || "").toString().slice(0, 40) })));
    console.log("card-ish:", JSON.stringify(btns));
    let clicked = false;
    for (const sel of ['input[type="radio"][value="card"]', '[data-testid="card"]', '#card', 'label:has-text("Card")', 'text=Card']) {
      const el = page.locator(sel);
      if (await el.count()) { try { await el.first().click({ timeout: 4000, force: true }); clicked = sel; break; } catch {} }
    }
    console.log("card clicked via:", clicked);
    await page.waitForSelector("#cardNumber", { timeout: 30000 });
    await page.fill("#cardNumber", "4242424242424242");
    await page.fill("#cardExpiry", "12/34");
    await page.fill("#cardCvc", "123");
    await fillIf("#billingName", "Ada Lovelace");
    await selectIf("#billingCountry", "US");
    await fillIf("#billingPostalCode", "20500");
    await page.screenshot({ path: "/tmp/e2e-3-checkout-filled.png", fullPage: true });
    // opt out of Link so no OTP modal appears
    const save = page.locator('#enableStripePass, input[type="checkbox"][name="enableStripePass"]');
    if (await save.count() && await save.first().isChecked()) await save.first().uncheck({ force: true });
    await page.screenshot({ path: "/tmp/e2e-3b-before-pay.png", fullPage: true });
    await page.click('button[type="submit"], .SubmitButton', { timeout: 30000 });
    // wait for redirect attempt to our order page (which we abort)
    for (let i = 0; i < 90 && !successUrl; i++) await page.waitForTimeout(1000);
    await page.screenshot({ path: "/tmp/e2e-4-after-pay.png", fullPage: true });
    console.log("redirected to:", successUrl);
    if (!successUrl) throw new Error("payment did not complete");

    // 3. Give the webhook a moment, then check Prodigi via our own API-free path: Stripe says paid?
    await page.waitForTimeout(8000);
    console.log("SESSION_ID=" + sessionId);
    console.log("SUCCESS_URL=" + successUrl);
  } catch (e) {
    await page.screenshot({ path: "/tmp/e2e-error.png", fullPage: true }).catch(() => {});
    console.error("E2E FAILED:", e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
