import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { preview } from "vite";
import { chromium } from "playwright";
import { suites } from "../app/data.ts";
import { registeredAssets } from "../scripts/archive-contract.mjs";
import { isPublishedArchivePath } from "../scripts/pages-redaction.mjs";

const contract = JSON.parse(await readFile(new URL("./fixtures/permalinks-v1.json", import.meta.url), "utf8"));

test("release serves every registered and archived asset, never a disguised SPA 200", async () => {
  const registered = await registeredAssets(suites, fileURLToPath(new URL("../public/", import.meta.url)));
  const archived = (await readdir(new URL("../public/", import.meta.url), { recursive: true })).filter(isPublishedArchivePath).map(p => `/${p}`);
  const server = await preview({ configFile: fileURLToPath(new URL("../vite.pages.config.ts", import.meta.url)), preview: { host: "127.0.0.1", port: 0, open: false } });
  try {
    const base = server.resolvedUrls.local[0];
    for (const asset of new Set([...registered, ...archived])) {
      const response = await fetch(new URL(asset.slice(1), base), { redirect: "error" });
      assert.equal(response.status, 200, `Inaccessible release asset: ${asset}`);
      assert.ok(!response.headers.get("content-type")?.includes("text/html"), `SPA fallback instead of asset: ${asset}`);
      const expected = await readFile(new URL(`../out${asset}`, import.meta.url));
      assert.ok(expected.length > 0);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected, `Wrong served bytes: ${asset}`);
    }
  } finally { await new Promise(resolve => server.httpServer.close(resolve)); }
});

test("every published v1 permalink cold-loads the correct suite, drawer, and summary anchors", async () => {
  const server = await preview({ configFile: fileURLToPath(new URL("../vite.pages.config.ts", import.meta.url)), preview: { host: "127.0.0.1", port: 0, open: false } });
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CAPTURE_BROWSER === "chrome" ? { channel: "chrome" } : {}) });
    const base = server.resolvedUrls.local[0];
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    // Literal historical URLs: deliberately do not generate expectations with viewerLink().
    for (const old of contract.suites) {
      await page.goto(`${base}?suite=${old.id}`, { waitUntil: "networkidle" });
      assert.equal(await page.getByRole("combobox").inputValue(), old.id);
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.ok(!/Could not load|^Loading…$/.test(await page.locator(".summary-section").innerText()));
      const links = await page.locator(".summary-heading a").evaluateAll(nodes => nodes.map(n => n.getAttribute("href")));
      for (const heading of old.headings) assert.ok(links.includes(`?suite=${old.id}#${heading}`), `Broken rendered heading link: ${old.id}#${heading}`);
      // Reload a historical heading URL, including after async Markdown fetching.
      const heading = old.headings[1] ?? old.headings[0];
      if (heading) {
        await page.goto(`${base}?suite=${old.id}#${heading}`, { waitUntil: "networkidle" });
        await page.waitForFunction(id => {
          const top = document.getElementById(id)?.getBoundingClientRect().top;
          return top !== undefined && top >= 0 && top < 40;
        }, heading);
      }
      for (const run of old.runs) {
        await page.goto(`${base}?suite=${old.id}&run=${run.id}`, { waitUntil: "networkidle" });
        const drawer = page.getByRole("dialog");
        await drawer.waitFor();
        assert.equal(await page.getByRole("combobox").inputValue(), old.id);
        assert.equal(await drawer.locator("#run-drawer-title").innerText(), run.model.split(" · ").at(-1));
        assert.ok(!/Could not load|^Loading…$/.test(await drawer.locator(".final-output").innerText()));
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.httpServer.close(resolve));
  }
});
