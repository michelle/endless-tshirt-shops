const { chromium } = require("playwright-core");
const url = process.argv[2];
async function fillInFrames(page, selectors, value) {
  for (const f of page.frames()) {
    for (const sel of selectors) {
      const el = await f.$(sel).catch(() => null);
      if (el && (await el.isVisible().catch(() => false))) { await el.fill(value); return true; }
    }
  }
  return false;
}
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 1100 } });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#email", { timeout: 30000 });
  await page.fill("#email", "test-buyer@example.com");
  await page.fill("#shippingName", "Ada Lovelace");
  await page.selectOption("#shippingCountry", "US");
  await page.fill("#shippingAddressLine1", "1 Infinite Loop");
  await page.fill("#shippingLocality", "Cupertino");
  await page.fill("#shippingPostalCode", "95014");
  await page.selectOption("#shippingAdministrativeArea", "CA");
  await page.fill("#phoneNumber", "4155550123");
  // card fields live inside Payment Element iframes
  let ok = false;
  for (let i = 0; i < 20 && !ok; i++) {
    ok = await fillInFrames(page, ['input[name="number"]', "#cardNumber", "#Field-numberInput"], "4242424242424242");
    if (!ok) {
      const row = page.getByText("Card", { exact: true }).first();
      if (await row.count()) await row.click({ force: true }).catch(() => {});
      const radio = await page.$('input[type="radio"][value="card"], #payment-method-accordion-item-title-card');
      if (radio) await radio.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
    }
  }
  if (!ok) { await page.screenshot({ path: "tmp/pay-fail.png", fullPage: true }); throw new Error("card number field not found"); }
  await fillInFrames(page, ['input[name="expiry"]', "#cardExpiry", "#Field-expiryInput"], "1234");
  await fillInFrames(page, ['input[name="cvc"]', "#cardCvc", "#Field-cvcInput"], "123");
  await fillInFrames(page, ["#billingName", 'input[name="billingName"]'], "Ada Lovelace");
  await fillInFrames(page, ['input[name="postalCode"]', "#billingPostalCode", "#Field-postalCodeInput"], "95014");
  const save = await page.$("#enableStripePass"); if (save && (await save.isChecked())) await save.uncheck().catch(() => {});
  await page.screenshot({ path: "tmp/pay-before.png", fullPage: true });
  await page.click('[data-testid="hosted-payment-submit-button"]');
  try {
    await page.waitForURL(/\/thanks\?session_id=/, { timeout: 90000 });
  } catch {
    await page.screenshot({ path: "tmp/pay-fail.png", fullPage: true });
    const errs = await page.$$eval('[role="alert"], .FieldError, .Error', (els) => els.map((e) => e.textContent).filter(Boolean));
    console.log("did not redirect; url=", page.url(), "errors=", JSON.stringify(errs));
    await b.close(); process.exit(2);
  }
  console.log("redirected to", page.url());
  await page.waitForTimeout(8000);
  await page.screenshot({ path: "tmp/thanks.png", fullPage: true });
  await b.close();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
