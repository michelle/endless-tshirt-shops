import { chromium } from "playwright";

const SITE = process.argv[2] || "https://benchmark-20260928-rep2-high-openco-seven.vercel.app";
const OUT = "/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/opencode";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(SITE, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/site-home.png`, fullPage: true });

await page.goto(`${SITE}/create`, { waitUntil: "networkidle" });
await page.locator("#word").fill("marina");
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/site-create.png`, fullPage: true });

// palette switch check
await page.locator(".swatch", { hasText: "Ultraviolet" }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/site-create-uv.png` });

await browser.close();
console.log("shots saved");
