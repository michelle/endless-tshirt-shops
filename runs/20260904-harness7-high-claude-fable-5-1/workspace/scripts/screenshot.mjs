// Usage: node scripts/screenshot.mjs <url> <out.png> [width]
import { chromium } from "@playwright/test";
const [url, out, width = "1200"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log("saved", out);
