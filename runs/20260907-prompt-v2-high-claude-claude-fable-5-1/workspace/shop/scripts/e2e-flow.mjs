import puppeteer from "puppeteer-core";
const U = process.argv[2];
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000 });
page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
await page.goto(`${U}/shirts/knocker-uppers`, { waitUntil: "networkidle0" });
await page.click('button[aria-label="Maroon"]');
const sizeBtns = await page.$$("button[aria-pressed]");
for (const b of sizeBtns) { const t = await b.evaluate((el) => el.textContent); if (t === "l") { await b.click(); break; } }
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.startsWith("Add to cart")).click());
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: "/tmp/flow-1-product.png" });
await page.goto(`${U}/cart`, { waitUntil: "networkidle0" });
const cartText = await page.evaluate(() => document.body.innerText);
console.log("cart shows maroon L:", /Maroon · size L/.test(cartText));
await page.screenshot({ path: "/tmp/flow-2-cart.png" });
await page.goto(`${U}/checkout`, { waitUntil: "networkidle0" });
const fill = async (label, value) => {
  const handle = await page.evaluateHandle((label) => [...document.querySelectorAll("label")].find((l) => l.textContent.trim().startsWith(label))?.nextElementSibling, label);
  await handle.click({ clickCount: 3 });
  await handle.type(value);
};
await page.select("select", "CA");
await fill("Full name", "Marie Tester");
await fill("Email", "marie@example.com");
await fill("Address line 1", "100 Queen St W");
await fill("City", "Toronto");
await fill("State", "ON");
await fill("Postal code", "M5H 2N2");
await page.waitForFunction(() => /Total\s*\$\d/.test(document.body.innerText) && ![...document.querySelectorAll("button")].find((b) => b.type === "submit").disabled, { timeout: 30000 });
await page.screenshot({ path: "/tmp/flow-3-checkout.png", fullPage: true });
const summary = await page.evaluate(() => document.querySelector("aside").innerText);
console.log("SUMMARY:", summary.replace(/\n+/g, " | "));
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }),
  page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.type === "submit").click()),
]);
console.log("landed on:", page.url());
const conf = await page.evaluate(() => document.body.innerText);
console.log("confirmation:", conf.split("\n").slice(0, 6).join(" | "));
await page.screenshot({ path: "/tmp/flow-4-order.png", fullPage: true });
const cartAfter = await page.evaluate(() => localStorage.getItem("obsolete-guild-cart-v1"));
console.log("cart cleared:", cartAfter);
await browser.close();
