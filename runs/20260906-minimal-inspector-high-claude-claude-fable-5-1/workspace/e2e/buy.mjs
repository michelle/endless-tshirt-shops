// End-to-end purchase with a Stripe test card. Requires playwright (npm i -D playwright  npx playwright install chromium).
// Usage: node e2e/buy.mjs https://your-deployment.vercel.app /tmp/screenshots
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const shots = process.argv[3] ?? "/tmp/pw";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
page.on("console", (m) => { if (m.type() === "error") console.log("[console.error]", m.text()); });
page.on("response", (r) => { if (r.url().includes("/api/")) console.log("[api]", r.status(), r.url().replace(/client_secret=[^&]+/, "client_secret=…")); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

await page.goto(base, { waitUntil: "load" });
await page.locator("label[for=style-unisex]").click();
await page.locator("label[for=size-L]").click();

// Wait for wallet check; switch to manual form if there is a switch link.
await page.waitForFunction(() => !document.body.innerText.includes("Loading checkout..."), null, { timeout: 30000 });
const sw = page.getByRole("button", { name: /enter details manually/i });
if (await sw.count()) { console.log("express checkout available; switching to manual"); await sw.click(); } else { console.log("no wallets; manual form shown directly"); }

await page.screenshot({ path: `${shots}/1-form.png`, fullPage: true });

await page.locator('input#email').fill("jenny.rosen@example.com");

const addr = page.frameLocator('iframe[title*="address" i]').first();
await addr.locator('input[name="name"]').fill("Jenny Rosen");
await addr.locator('input[name="addressLine1"]').fill("185 Berry St");
// Autocomplete dropdown might appear; press Escape then fill the rest.
await page.keyboard.press("Escape");
await addr.locator('input[name="locality"]').fill("San Francisco");
await addr.locator('select[name="administrativeArea"]').selectOption("CA");
await addr.locator('input[name="postalCode"]').fill("94107");

const pay = page.frameLocator('iframe[title*="payment" i]').first();
const cardTab = pay.locator('[data-testid="card"], button:has-text("Card")').first();
if (await cardTab.count()) await cardTab.click().catch(() => {});
await pay.locator('input[name="number"]').fill("4242424242424242");
await pay.locator('input[name="expiry"]').fill("12/34");
await pay.locator('input[name="cvc"]').fill("123");
const zip = pay.locator('input[name="postalCode"]');
if (await zip.count()) await zip.fill("94107").catch(() => {});

await page.screenshot({ path: `${shots}/2-filled.png`, fullPage: true });
await page.waitForTimeout(1500);
console.log("card number input box:", await pay.locator('input[name="number"]').boundingBox());
console.log("cvc input box:", await pay.locator('input[name="cvc"]').boundingBox());
await page.locator('.Checkout').screenshot({ path: `${shots}/2b-checkout-column.png` });
console.log("payment iframe box:", await page.locator('iframe[title*="payment" i]').first().boundingBox());
console.log("express iframe box:", await page.locator('.Checkout-express iframe').first().boundingBox().catch(() => null));
console.log("checkout column width:", await page.locator('.Checkout').evaluate((el) => el.getBoundingClientRect().width));
const frozenBefore = await page.locator(".Shirt-frozen").count();
await page.getByRole("button", { name: /buy now/i }).click();
await page.waitForSelector(".Shirt-frozen", { timeout: 10000 });
console.log("timestamp frozen after click (was frozen before:", frozenBefore, ")");
const outcome = await Promise.race([
  page.waitForSelector(".Checkout-success", { timeout: 60000 }).then(() => "success"),
  page.waitForSelector(".alert", { timeout: 60000 }).then(() => "alert"),
]).catch(() => "timeout");
if (outcome !== "success") {
  await page.screenshot({ path: `${shots}/x-failure.png`, fullPage: true });
  console.log("OUTCOME:", outcome, "ALERT:", await page.locator(".alert").allInnerTexts());
  await browser.close();
  process.exit(1);
}
await page.screenshot({ path: `${shots}/3-processing.png`, fullPage: true });
await page.waitForFunction(() => /ord_\d+|reference/.test(document.body.innerText), null, { timeout: 90000 });
await page.screenshot({ path: `${shots}/4-success.png`, fullPage: true });
const text = await page.locator(".Checkout-success").innerText();
console.log("SUCCESS PANEL:\n" + text);
await browser.close();
