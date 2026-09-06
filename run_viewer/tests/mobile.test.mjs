import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { preview } from "vite";
import { chromium } from "playwright";

async function drag(cdp, from, to, { cancel = false, fingers = 1 } = {}) {
  const points = (x, y) => Array.from({ length: fingers }, (_, id) => ({ x: x + id * 30, y, id }));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points(...from) });
  for (let step = 1; step <= 8; step++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: points(from[0] + (to[0] - from[0]) * step / 8, from[1] + (to[1] - from[1]) * step / 8) });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: cancel ? "touchCancel" : "touchEnd", touchPoints: [] });
}

test("mobile drawer swipes preserve native scrolling, links, zoom gestures, and boundaries", async () => {
  const server = await preview({ configFile: fileURLToPath(new URL("../vite.pages.config.ts", import.meta.url)), preview: { host: "127.0.0.1", port: 0, open: false } });
  const browser = await chromium.launch({ headless: true, ...(process.env.CAPTURE_BROWSER === "chrome" ? { channel: "chrome" } : {}) });
  try {
    const base = server.resolvedUrls.local[0];
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}?suite=20260905-minimal-high&run=sol`, { waitUntil: "networkidle" });
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const content = dialog.locator(".drawer-content");
    const runId = () => new URL(page.url()).searchParams.get("run");
    const swipe = async (direction, options) => {
      await content.evaluate((el) => { el.scrollTop = 0; });
      const box = await dialog.locator(".storefront-preview img").first().boundingBox();
      const y = box.y + box.height / 2;
      await drag(cdp, direction === "left" ? [300, y] : [90, y], direction === "left" ? [90, y] : [300, y], options);
    };
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      assert.ok(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth));
      for (const button of await dialog.locator(".drawer-actions button").all()) {
        const box = await button.boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44, `Touch target too small: ${await button.getAttribute("aria-label")}`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await swipe("left");
    assert.equal(runId(), "terra");
    assert.equal(context.pages().length, 1, "Swiping a screenshot must not click its link");
    await swipe("right");
    assert.equal(runId(), "sol");
    await page.goBack();
    assert.equal(runId(), "terra", "Swipe updates the permalink and browser history");
    await page.goForward();
    assert.equal(runId(), "sol");

    await swipe("left", { cancel: true });
    assert.equal(runId(), "sol");
    await swipe("left", { fingers: 2 });
    assert.equal(runId(), "sol", "Multi-touch must not navigate");
    await drag(cdp, [180, 400], [150, 401]);
    assert.equal(runId(), "sol", "Short drags must not navigate");
    await drag(cdp, [5, 400], [180, 400]);
    assert.equal(runId(), "sol", "Screen-edge gestures belong to the browser");
    await drag(cdp, [385, 400], [200, 400]);
    assert.equal(runId(), "sol");

    await drag(cdp, [190, 600], [200, 340]);
    assert.equal(runId(), "sol");
    assert.ok(await content.evaluate((el) => el.scrollTop > 0), "Vertical touch scrolling remains native");

    // A wide table fixture inside the real drawer exercises horizontal scrolling.
    await content.evaluate((el) => {
      const table = document.createElement("table");
      table.id = "swipe-table-fixture";
      table.style.cssText = "display:block;width:100%;overflow-x:auto;height:100px";
      table.innerHTML = '<tbody><tr><td style="min-width:1000px;height:80px">Wide table</td></tr></tbody>';
      el.prepend(table);
      el.scrollTop = 0;
    });
    const table = dialog.locator("#swipe-table-fixture");
    await table.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".drawer-content").scrollTop === 0);
    const box = await table.boundingBox();
    await drag(cdp, [290, box.y + 40], [90, box.y + 40]);
    assert.equal(runId(), "sol");
    await page.waitForFunction(() => document.querySelector("#swipe-table-fixture").scrollLeft > 0, null, { timeout: 3000 });
    await table.evaluate((el) => el.remove());

    await swipe("right");
    assert.equal(runId(), "astra");
    await swipe("right");
    assert.equal(runId(), "astra");
    await swipe("left");
    assert.equal(runId(), "sol", "Can reverse direction after reaching the first model");
    for (let i = 0; i < 5; i++) await swipe("left");
    assert.equal(runId(), "sonnet");
    await swipe("left");
    assert.equal(runId(), "sonnet");
    await swipe("right");
    assert.equal(runId(), "opus", "Can reverse direction after reaching the last model");

    await context.route("https://benchmark-*.vercel.app/**", (route) => route.fulfill({ body: "Storefront navigation fixture" }));
    const imageLink = dialog.getByRole("link", { name: "Open storefront from screenshot", exact: true });
    const popupPromise = page.waitForEvent("popup");
    await imageLink.tap();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.equal(new URL(popup.url()).origin, new URL(await imageLink.getAttribute("href")).origin);
    await popup.close();

    await dialog.getByRole("button", { name: "Close run details", exact: true }).tap();
    await dialog.waitFor({ state: "hidden" });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await drag(cdp, [190, 650], [190, 350]);
    assert.ok(await page.evaluate(() => scrollY > 0), "Main page remains vertically scrollable");
    assert.equal(runId(), null);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
  }
});
