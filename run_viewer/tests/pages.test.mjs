import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { preview } from "vite";
import { chromium } from "playwright";
import { isPublishedArchivePath, redactForPages } from "../scripts/pages-redaction.mjs";

test("publication removes private links, credentials, and email, including dotted run IDs", () => {
  const secret = ["pi_example", "secret", "example"].join("_");
  for (const input of [
    `https://example.com/order?payment_intent_client_secret=${secret}`,
    "https://dashboard.stripe.com/onboard_sandbox/example",
    "https://example.com/art?sig=example", secret,
    ["sk", "test", "example"].join("_"), "test@example.com",
  ]) assert.notEqual(redactForPages(input), input);
  assert.equal(redactForPages("https://example.com/store"), "https://example.com/store");
  assert.ok(isPublishedArchivePath("suites/future/runs/future-gpt-5.6-sol/design.png"));
  assert.ok(!isPublishedArchivePath("suites/future/runs/future/.env"));
  assert.ok(!isPublishedArchivePath("suites/future/capture-errors.json"));
});

test("static artifact contains every approved archive file, exact raster bytes, and sanitized text", async () => {
  const entries = await readdir(new URL("../public/", import.meta.url), { recursive: true });
  let designs = 0;
  let screenshots = 0;
  for (const path of entries.filter(isPublishedArchivePath)) {
    const original = await readFile(new URL(`../public/${path}`, import.meta.url));
    const built = await readFile(new URL(`../out/${path}`, import.meta.url));
    if (/\.(md|json|svg)$/.test(path)) {
      const text = built.toString();
      assert.equal(redactForPages(text), text, `Unredacted text: ${path}`);
      if (path.endsWith(".json")) JSON.parse(text);
    } else assert.ok(original.equals(built), `Changed image: ${path}`);
    if (/\/design\./.test(path)) designs++;
    if (/\/storefront\.png$/.test(path)) screenshots++;
  }
  assert.ok(designs >= 21);
  assert.ok(screenshots >= 21);
});

test("static Pages viewer supports suite links, history, scoring, and all archive assets", async () => {
  const server = await preview({
    configFile: fileURLToPath(new URL("../vite.pages.config.ts", import.meta.url)),
    preview: { host: "127.0.0.1", port: 0, open: false },
  });
  const browser = await chromium.launch({ headless: true, ...(process.env.CAPTURE_BROWSER === "chrome" ? { channel: "chrome" } : {}) });
  try {
    const base = server.resolvedUrls.local[0];
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
    await page.goto(`${base}?suite=20260905-beauty-high&keep=1`, { waitUntil: "networkidle" });
    assert.equal(await page.title(), "endless tshirt shops");
    assert.equal(await page.locator(".viewer-title").innerText(), "endless tshirt shops");
    const select = page.getByRole("combobox");
    assert.equal(await select.inputValue(), "20260905-beauty-high");

    for (const id of ["20260823-serial-high", "20260825-fresh6-high", "20260825-harness6-high", "20260827-harness6-high"]) {
      assert.equal(await select.locator(`option[value="${id}"]`).count(), 0);
    }
    for (const id of ["20260907-prompt-v2-rerun2-high", "20260907-prompt-v2-rerun-high", "20260906-minimal-inspector-high", "20260906-clean-sheet-high", "20260905-beauty-high", "20260905-minimal-high", "20260905-unserious-high"]) {
      assert.doesNotMatch(await select.locator(`option[value="${id}"]`).innerText(), /\(legacy\)/);
    }

    await select.selectOption("20260907-prompt-v2-rerun2-high");
    await page.waitForFunction(() => document.querySelectorAll(".storefront-thumbnail img").length === 7 &&
      document.querySelectorAll(".art-canvas img").length === 7 &&
      [...document.querySelectorAll(".design-card img")].every((image) => image.complete && image.naturalWidth > 0));
    assert.equal(await page.locator('.design-card .run-status[data-tone="complete"]').count(), 1);
    assert.equal(await page.locator('.design-card .run-status[data-tone="partial"]').count(), 1);
    assert.equal(await page.locator('.design-card .run-status[data-tone="failed"]').count(), 5);
    assert.ok(await page.locator(".summary-section .markdown table").count() > 0);

    for (const [suite, expected] of [["20260906-minimal-inspector-high", [2, 1, 4]], ["20260906-clean-sheet-high", [2, 1, 4]], ["20260905-unserious-high", [1, 3, 3]], ["20260905-beauty-high", [2, 1, 4]], ["20260905-minimal-high", [3, 3, 1]]]) {
      await select.selectOption(suite);
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(() => document.querySelectorAll(".storefront-thumbnail img").length === 7 &&
        [...document.querySelectorAll(".design-card img")].every((image) => image.complete && image.naturalWidth > 0));
      for (const [i, tone] of ["complete", "partial", "failed"].entries()) {
        assert.equal(await page.locator(`.design-card .run-status[data-tone="${tone}"]`).count(), expected[i]);
      }
      assert.ok(await page.locator(".summary-section .markdown table").count() > 0);
      const captures = await page.locator(".storefront-thumbnail img").evaluateAll((images) => images.map((image) => image.getBoundingClientRect().top));
      assert.ok(Math.max(...captures) - Math.min(...captures) < 1, "Screenshots stay vertically aligned");
      const customerArt = page.locator(".design-card").filter({ has: page.locator(".model-title").filter({ hasText: suite.includes("minimal") ? "gpt-5.6-sol" : "claude-sonnet-5" }) }).locator(".art-canvas img");
      const unserious = suite.includes("unserious");
      assert.ok((await customerArt.getAttribute("src")).endsWith(unserious || suite.includes("clean-sheet") || suite.includes("inspector") ? "/design.png" : suite.includes("minimal") ? "/paid-design.png" : "/design.jpg"), "Artwork must remain the reviewed exact source for this suite, not a local repair or substituted image");
      assert.deepEqual(await customerArt.evaluate((image) => [image.naturalWidth, image.naturalHeight]), unserious ? [1200, 1500] : [4665, 5844]);
      for (const card of await page.locator(".design-card").all()) {
        const thumbnail = card.locator("button.storefront-thumbnail");
        assert.equal(await thumbnail.getAttribute("aria-haspopup"), "dialog");
        await thumbnail.click();
        const dialog = page.getByRole("dialog");
        const storefrontLink = dialog.locator(".drawer-heading").getByRole("link", { name: "Storefront ↗", exact: true });
        const deployment = await storefrontLink.getAttribute("href");
        const screenshotLink = dialog.getByRole("link", { name: "Open storefront from screenshot", exact: true });
        assert.equal(await screenshotLink.getAttribute("href"), deployment);
        assert.equal(await screenshotLink.getAttribute("target"), "_blank");
        assert.equal(await dialog.locator(".rating-checks dt").count(), 3);
        assert.ok(new URL(page.url()).searchParams.get("run"));
        const social = dialog.locator(".social-preview img");
        if (await social.count()) {
          await social.evaluate((image) => image.decode());
          assert.ok(await social.evaluate((image) => image.naturalWidth > 0));
        } else assert.match(await dialog.locator(".social-preview").innerText(), /No social preview image published/);
        assert.ok((await dialog.locator(".final-output").innerText()).length > 100);
        for (const link of await dialog.locator("a[download]").all()) {
          const response = await page.request.get(new URL(await link.getAttribute("href"), page.url()).href);
          assert.equal(response.status(), 200);
          assert.ok(!response.headers()["content-type"]?.includes("text/html"));
        }
        await page.keyboard.press("Escape");
      }
    }
    assert.equal(new URL(page.url()).searchParams.get("suite"), "20260905-minimal-high");
    assert.equal(new URL(page.url()).searchParams.get("keep"), "1");
    await select.selectOption("20260905-beauty-high");
    await select.selectOption("20260905-minimal-high");
    await page.goBack();
    assert.equal(await select.inputValue(), "20260905-beauty-high");
    await page.goForward();
    assert.equal(await select.inputValue(), "20260905-minimal-high");
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await select.inputValue(), "20260905-minimal-high");
    await page.goto(`${base}?suite=20260827-harness6-high`, { waitUntil: "networkidle" });
    assert.equal(await select.locator('option[value="20260827-harness6-high"]').getAttribute("hidden"), "");
    await page.waitForFunction(() => {
      const text = document.querySelector(".summary-section")?.textContent ?? "";
      return text.length > 100 && !text.includes("Loading…");
    });
    assert.equal(await page.locator(".design-card").count(), 0);
    assert.ok((await page.locator(".summary-section").innerText()).length > 100);
    await page.goto(`${base}?suite=unknown`, { waitUntil: "networkidle" });
    assert.equal(await select.inputValue(), "20260907-prompt-v3-high");

    await page.goto(`${base}?suite=20260905-beauty-high&run=opus`, { waitUntil: "networkidle" });
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.equal(await dialog.locator("#run-drawer-title").innerText(), "claude-opus-5");
    assert.ok(await dialog.locator(".social-preview img").count());
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    const copy = dialog.getByRole("button", { name: "Copy permalink", exact: true });
    await copy.click();
    await page.waitForFunction(() => document.querySelector(".drawer-permalink")?.textContent === "Copied!");
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), new URL("?suite=20260905-beauty-high&run=opus", base).href);
    await dialog.getByRole("button", { name: "Next run", exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("run"), "sonnet");
    assert.equal(await copy.innerText(), "Copy permalink");
    await page.evaluate(() => { Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: () => Promise.reject(new Error("Clipboard denied")) }); });
    await copy.click();
    await page.waitForFunction(() => document.querySelector(".drawer-permalink")?.textContent === "Copy failed");
    assert.match(await copy.getAttribute("title"), /Copy the address/);
    await page.evaluate(() => { delete navigator.clipboard.writeText; });
    await page.goBack();
    assert.equal(await dialog.locator("#run-drawer-title").innerText(), "claude-opus-5");
    await page.reload({ waitUntil: "networkidle" });
    await dialog.waitFor();
    assert.equal(await dialog.locator("#run-drawer-title").innerText(), "claude-opus-5");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(new URL(page.url()).searchParams.get("run"), null);
    await page.goBack();
    await dialog.waitFor();
    await dialog.getByRole("button", { name: "Close run details", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });

    // Backdrop dismissal uses the same URL/history path as the close button.
    const opener = page.locator(".design-card").filter({ has: page.locator(".model-title").filter({ hasText: "claude-opus-5" }) }).locator("button.storefront-thumbnail");
    const pageBoundsBeforeDrawer = await page.locator("main").boundingBox();
    await opener.click();
    await dialog.waitFor();
    const pageBoundsWithDrawer = await page.locator("main").boundingBox();
    assert.equal(pageBoundsWithDrawer?.x, pageBoundsBeforeDrawer?.x, "Opening a drawer must not shift the underlying page");
    assert.equal(pageBoundsWithDrawer?.width, pageBoundsBeforeDrawer?.width, "Opening a drawer must not resize the underlying page");
    await dialog.locator("#run-drawer-title").click();
    assert.equal(await dialog.isVisible(), true, "Inside clicks must not dismiss the drawer");
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.x > 0, "Desktop has a clickable backdrop");
    const outside = { x: bounds.x / 2, y: 400 };
    // Dragging/selecting from inside to outside is not a backdrop click.
    await page.mouse.move(bounds.x + 20, 400);
    await page.mouse.down();
    await page.mouse.move(outside.x, outside.y);
    await page.mouse.up();
    assert.equal(await dialog.isVisible(), true);
    await page.mouse.click(outside.x, outside.y);
    await dialog.waitFor({ state: "hidden" });
    assert.equal(new URL(page.url()).searchParams.get("run"), null);
    assert.equal(new URL(page.url()).searchParams.get("suite"), "20260905-beauty-high");
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), "hidden", "Restore page scrolling");
    assert.ok(await opener.evaluate(el => el === document.activeElement), "Return focus to the drawer opener");
    await page.goBack();
    await dialog.waitFor();
    assert.equal(await dialog.locator("#run-drawer-title").innerText(), "claude-opus-5");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });

    const headings = page.locator(".summary-heading");
    const ids = await headings.evaluateAll((nodes) => nodes.map((node) => node.id));
    assert.ok(ids.length > 3);
    assert.equal(new Set(ids).size, ids.length);
    const target = headings.nth(3);
    const href = await target.locator("a").getAttribute("href");
    assert.ok(href.startsWith("?suite=20260905-beauty-high#summary-"));
    // A cold deep link must scroll after the Markdown finishes loading.
    await page.goto(new URL(href, base).href, { waitUntil: "networkidle" });
    await page.waitForFunction((id) => {
      const top = document.getElementById(id)?.getBoundingClientRect().top;
      return top !== undefined && top >= 0 && top < 40;
    }, ids[3]);
    await page.goto(`${base}?suite=20260905-beauty-high&run=unknown`, { waitUntil: "networkidle" });
    assert.equal(await dialog.count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
  }
});
