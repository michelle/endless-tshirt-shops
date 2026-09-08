import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { preview } from "vite";
import { chromium } from "playwright";
import { suites } from "../app/data.ts";

test("prompts, readable Markdown, and persistent dark mode work without changing run links or artwork", async () => {
  const server = await preview({ configFile: fileURLToPath(new URL("../vite.pages.config.ts", import.meta.url)), preview: { host: "127.0.0.1", port: 0, open: false } });
  const browser = await chromium.launch({ headless: true, ...(process.env.CAPTURE_BROWSER === "chrome" ? { channel: "chrome" } : {}) });
  try {
    const base = server.resolvedUrls.local[0];
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(`${base}?suite=20260905-beauty-high&keep=1`, { waitUntil: "networkidle" });
    const showPrompt = page.getByRole("button", { name: "Show prompt", exact: true });
    const prompt = page.locator("#prompt-drawer");
    for (const suite of suites.filter((candidate) => candidate.runs.length > 0)) {
      await page.getByRole("combobox").selectOption(suite.id);
      await page.waitForLoadState("networkidle");
      const before = page.url();
      await showPrompt.click();
      await prompt.waitFor({ state: "visible" });
      assert.equal(await prompt.locator("h2").innerText(), suite.prompt.file);
      const promptText = await prompt.getByRole("region", { name: "Suite prompt", exact: true }).innerText();
      assert.ok(promptText.length > 100 && !promptText.includes("Could not load"));
      assert.equal(page.url(), before, "Opening prompts must not rewrite existing suite/run permalink formats");
      await page.keyboard.press("l");
      assert.equal(new URL(page.url()).searchParams.get("run"), null, "Prompt keys must not navigate models");
      await page.keyboard.press("Escape");
      await prompt.waitFor({ state: "hidden" });
      assert.ok(await showPrompt.evaluate(el => el === document.activeElement));
    }
    await showPrompt.click();
    const box = await prompt.boundingBox();
    await page.mouse.click(box.x / 2, 250);
    await prompt.waitFor({ state: "hidden" });
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), "hidden");

    await page.getByRole("combobox").selectOption("20260905-beauty-high");
    await page.waitForLoadState("networkidle");
    const markdown = page.locator(".summary-section .markdown");
    assert.ok((await markdown.boundingBox()).width < 1000, "Readable measure on wide screens");
    const art = page.locator(".art-canvas").first();
    const image = await art.locator("img").getAttribute("src");
    await page.getByLabel("T-shirt background color", { exact: true }).fill("#cc3366");
    const dark = page.getByRole("button", { name: "Dark mode", exact: true });
    await dark.click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
    assert.equal(await dark.getAttribute("aria-pressed"), "true");
    assert.equal(await art.evaluate(el => getComputedStyle(el).backgroundColor), "rgb(204, 51, 102)");
    assert.equal(await art.locator("img").getAttribute("src"), image);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(23, 23, 23)");
    await page.getByRole("button", { name: /View details and final output/ }).first().click();
    const run = page.locator("#run-drawer");
    assert.equal(await run.evaluate(el => getComputedStyle(el).backgroundColor), "rgb(23, 23, 23)");
    await run.getByRole("button", { name: "Next run", exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("run"), "sol");
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await dark.getAttribute("aria-pressed"), "true", "Theme persists through reload and deep links");
    await page.keyboard.press("Escape");
    await showPrompt.click();
    assert.equal(await prompt.evaluate(el => getComputedStyle(el).backgroundColor), "rgb(23, 23, 23)");
    await prompt.getByRole("button", { name: "Close prompt", exact: true }).click();

    for (const width of [1920, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const pageWidths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      assert.equal(pageWidths.scroll, pageWidths.client, "Wide tables must not expand the page");
      const words = await markdown.evaluate(el => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const result = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.parentElement.closest("th,td")) continue;
          for (const match of node.textContent.matchAll(/\b(model|astra)\b/gi)) {
            const range = document.createRange(); range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
            result.push({ word: match[0], lines: new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size });
          }
        }
        return result;
      });
      assert.ok(words.length > 0);
      assert.ok(words.every(word => word.lines === 1), `Words split at ${width}px: ${JSON.stringify(words.filter(w => w.lines !== 1))}`);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await showPrompt.click();
      assert.ok(await prompt.evaluate(el => el.scrollWidth <= el.clientWidth));
      const content = prompt.locator(".drawer-content");
      if (await content.evaluate(el => el.scrollHeight > el.clientHeight + 80)) {
        const pageScroll = await page.evaluate(() => window.scrollY);
        await page.keyboard.press("j");
        assert.equal(await content.evaluate(el => el.scrollTop), 80);
        assert.equal(await page.evaluate(() => window.scrollY), pageScroll);
      }
      await page.keyboard.press("Escape");
    }
    await dark.click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === "light");
    assert.equal(new URL(page.url()).searchParams.get("keep"), "1");
    assert.deepEqual(errors, []);

    const blocked = await browser.newPage();
    await blocked.addInitScript(() => {
      Object.defineProperty(Storage.prototype, "setItem", { value: () => { throw new Error("Storage disabled"); } });
    });
    await blocked.goto(base, { waitUntil: "networkidle" });
    await blocked.getByRole("button", { name: "Dark mode", exact: true }).click();
    await blocked.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  } finally { await browser.close(); await new Promise(resolve => server.httpServer.close(resolve)); }
});
