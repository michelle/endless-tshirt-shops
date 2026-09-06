import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

test("drawer shortcuts retain focus and reverse direction at either boundary", async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CAPTURE_BROWSER === "chrome" ? { channel: "chrome" } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.VIEWER_URL ?? "http://localhost:4173/", { waitUntil: "networkidle" });
    await page.getByRole("combobox").selectOption("20260905-minimal-high");
    const dialog = page.getByRole("dialog");
    const title = dialog.locator("#run-drawer-title");
    const previous = dialog.getByRole("button", { name: "Previous run", exact: true });
    const next = dialog.getByRole("button", { name: "Next run", exact: true });
    for (const [back, forward] of [["h", "l"], ["ArrowLeft", "ArrowRight"]]) {
      await page.getByRole("button", { name: "View details and final output for Codex · gpt-5.6-sol", exact: true }).click();
      // Native disabled previously dropped focus onto body at this transition.
      await previous.focus();
      await page.keyboard.press(back);
      assert.equal(await title.innerText(), "gpt-6-astra");
      assert.equal(await previous.getAttribute("aria-disabled"), "true");
      assert.ok(await previous.evaluate((button) => button === document.activeElement));
      await page.keyboard.press(back);
      await page.keyboard.press("Enter");
      assert.equal(await title.innerText(), "gpt-6-astra");
      await page.keyboard.press(forward);
      assert.equal(await title.innerText(), "gpt-5.6-sol");

      await next.focus();
      for (let i = 0; i < 5; i++) await page.keyboard.press(forward);
      assert.equal(await title.innerText(), "claude-sonnet-5");
      assert.equal(await next.getAttribute("aria-disabled"), "true");
      assert.ok(await next.evaluate((button) => button === document.activeElement));
      await page.keyboard.press(forward);
      await page.keyboard.press("Enter");
      assert.equal(await title.innerText(), "claude-sonnet-5");
      await page.keyboard.press(back);
      assert.equal(await title.innerText(), "claude-opus-5");
      await page.keyboard.press(forward);
      await next.dispatchEvent("click");
      assert.equal(await title.innerText(), "claude-sonnet-5");

      const content = dialog.locator(".drawer-content");
      await content.evaluate((element) => { element.scrollTop = 0; });
      const pageScroll = await page.evaluate(() => window.scrollY);
      await page.keyboard.press("j");
      assert.equal(await content.evaluate((element) => element.scrollTop), 80);
      assert.equal(await page.evaluate(() => window.scrollY), pageScroll);
      await page.keyboard.press("k");
      assert.equal(await content.evaluate((element) => element.scrollTop), 0);
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
