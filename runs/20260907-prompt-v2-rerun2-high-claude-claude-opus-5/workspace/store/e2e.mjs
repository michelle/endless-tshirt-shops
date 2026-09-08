import { chromium } from "playwright-core";
const EXE = process.env.HOME + "/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const SITE = process.argv[2];
const ok = (label, cond) => console.log(cond ? `  ✓ ${label}` : `  ✗ ${label}`);

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1320, height: 950 } });
page.on("pageerror", (e) => console.log("  ! page error:", e.message));

console.log("1. Home");
await page.goto(SITE, { waitUntil: "networkidle" });
ok("eight cards", (await page.locator(".card").count()) === 8);

console.log("2. Product → pick colour + size → add");
await page.locator(".card").nth(3).click();
await page.waitForLoadState("networkidle");
const title = await page.locator("h1.title").textContent();
ok(`title (${title})`, !!title);
await page.locator(".swatch").nth(2).click();          // maroon
await page.locator(".size", { hasText: "XL" }).first().click();
await page.locator(".btn", { hasText: "Add to cart" }).click();
await page.waitForSelector(".notice.good");
ok("added confirmation", true);
ok("cart badge shows 1", (await page.locator(".cart-pill").textContent())?.includes("(1)"));

console.log("3. Second item");
await page.goto(SITE + "/shirt/st-fenwick-of-the-untraceable-smell", { waitUntil: "networkidle" });
await page.locator(".size", { hasText: "M" }).first().click();
await page.locator(".btn", { hasText: "Add to cart" }).click();
await page.waitForSelector(".notice.good");

console.log("4. Cart");
await page.goto(SITE + "/cart", { waitUntil: "networkidle" });
ok("two lines", (await page.locator(".line").count()) === 2);
await page.locator(".qty button", { hasText: "+" }).first().click();
await page.waitForTimeout(300);
ok("subtotal $102.00 after bump", (await page.locator(".totals").first().textContent())?.includes("102.00"));
await page.screenshot({ path: "/tmp/e2e-cart.png", fullPage: true });

console.log("5. Checkout — live shipping quote");
await page.locator("a.btn", { hasText: "Proceed to checkout" }).click();
await page.waitForLoadState("networkidle");
const waitForQuote = async () => {
  await page.waitForFunction(
    () => /Shipping\s+\$\d/.test(document.querySelectorAll(".panel")[document.querySelectorAll(".panel").length - 1].innerText),
    null, { timeout: 30000 },
  );
  return (await page.locator(".panel").last().innerText()).match(/Shipping\s+(\$\S+)/)?.[1];
};
const usShip = await waitForQuote().catch(() => null);
ok("US shipping quoted: " + usShip, !!usShip);

console.log("6. Fill address, change country, re-quote");
await page.fill('input[autocomplete="name"]', "Ada Testwell");
await page.fill('input[autocomplete="email"]', "ada@example.com");
await page.fill('input[autocomplete="address-line1"]', "12 Cathedral Close");
await page.fill('input[autocomplete="address-level2"]', "Norwich");
await page.fill('input[autocomplete="postal-code"]', "NR1 4DH");
await page.selectOption('select.t', "GB");
await page.waitForTimeout(600);
const gbShip = await waitForQuote().catch(() => null);
ok("GB shipping re-quoted: " + gbShip, !!gbShip && gbShip !== usShip);
await page.screenshot({ path: "/tmp/e2e-checkout.png", fullPage: true });

console.log("7. Place order");
await page.locator("button.btn", { hasText: "Place order" }).click();
await page.waitForURL(/\/orders\//, { timeout: 45000 });
const url = page.url();
ok("redirected to " + url, /\/orders\/ord_/.test(url));
await page.waitForLoadState("networkidle");
const body = await page.locator("main").innerText();
ok("order page shows status", /InProgress|Complete/.test(body));
ok("cart emptied", (await page.locator(".cart-pill").textContent())?.trim() === "Cart");
await page.screenshot({ path: "/tmp/e2e-order.png", fullPage: true });

await browser.close();
console.log("\nDONE " + url);
