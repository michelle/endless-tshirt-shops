import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
console.log("Title:", await page.title());
console.log("Browser errors:", errors);
console.log(
  "Desktop overflow:",
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
await page.getByRole("button", { name: "Cloud", exact: true }).click();
await page.getByRole("button", { name: "Size guide", exact: true }).click();
console.log("Size guide:", await page.getByRole("dialog").isVisible());
await page.keyboard.press("Escape");
await page
  .getByRole("button", { name: "Fitted A little more shape", exact: true })
  .click();
console.log(
  "Natural unavailable in fitted:",
  await page
    .getByRole("button", { name: "Oat milk", exact: true })
    .isDisabled(),
);
await page.getByRole("button", { name: "L", exact: true }).click();
await page
  .getByRole("button", { name: "Make this moment mine", exact: true })
  .click();
console.log("Capture bag:", await page.getByRole("dialog").innerText());
await page.keyboard.press("Escape");
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
console.log(
  "Mobile overflow:",
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
console.log("Final browser errors:", errors);
await browser.close();
