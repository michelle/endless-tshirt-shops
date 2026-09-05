import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const base = "https://" + process.env.BENCHMARK_VERCEL_PROJECT + ".vercel.app";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(base, { waitUntil: "networkidle" });
console.log("Store status:", await page.title());
await page
  .getByRole("button", { name: "Make this moment mine", exact: true })
  .click();
const frozen = await page.locator(".bag-moment strong").textContent();
await page
  .getByRole("button", { name: "Continue to checkout", exact: true })
  .click();
await page.waitForURL(/checkout.stripe.com/, { timeout: 60000 });
await page.waitForLoadState("networkidle");
console.log("Checkout URL:", page.url());
console.log("Frozen timestamp:", frozen);
console.log("Checkout visible:", await page.locator("body").innerText());
console.log(
  "Inputs:",
  await page
    .locator("input")
    .evaluateAll((els) =>
      els.map((e) => ({
        id: e.id,
        name: e.name,
        placeholder: e.placeholder,
        type: e.type,
      })),
    ),
);
await fs.writeFile(
  "artifacts/checkout-state.json",
  JSON.stringify({ url: page.url(), frozen }),
);
await page.screenshot({
  path: "artifacts/stripe-checkout.png",
  fullPage: true,
});
await browser.close();
