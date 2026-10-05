#!/usr/bin/env node
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const target = process.argv[2];
if (!target || !/^https?:\/\//.test(target)) {
  console.error("usage: browser-health.mjs URL");
  process.exit(2);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const playwrightPath = path.join(root, "run_viewer", "node_modules", "playwright", "index.mjs");
try {
  await access(playwrightPath);
} catch {
  console.log(JSON.stringify({ status: "unavailable", reason: "playwright_not_installed" }));
  process.exit(2);
}

const { chromium } = await import(pathToFileURL(playwrightPath));
const browser = await chromium.launch({ headless: true });
let pageError = null;
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => { pageError ??= error.message; });
  const response = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(1_500);
  const body = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  const providerError = /Deployment Expired|\bNOT_FOUND\b|Application error:\s*a client-side exception/i.test(body);
  const healthy = Boolean(response && response.status() >= 200 && response.status() < 400 && !providerError && !pageError);
  console.log(JSON.stringify({ status: healthy ? "healthy" : "failed", httpStatus: response?.status() ?? null,
    providerError, pageError: pageError ? pageError.slice(0, 240) : null }));
  if (!healthy) process.exitCode = 1;
} catch (error) {
  console.log(JSON.stringify({ status: "failed", reason: String(error.message ?? error).slice(0, 240) }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
