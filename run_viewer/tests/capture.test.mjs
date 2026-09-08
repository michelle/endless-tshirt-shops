import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { artifactDirectory, captureSuite, faviconImage } from "../scripts/capture-storefronts.mjs";

test("rejects invalid artifact paths and HTML masquerading as an icon", () => {
  assert.throws(() => artifactDirectory("/tmp/viewer", { id: "future" }, { id: "x", finalOutput: "/suites/future/runs/../../escape/final.md" }));
  assert.throws(() => artifactDirectory("/tmp/viewer", { id: "future" }, { id: "x", finalOutput: "/suites/different/runs/x/final.md" }));
  assert.equal(faviconImage(Buffer.from("<html>not an icon</html>"), "image/png"), null);
  assert.equal(faviconImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).extension, "svg");
});

test("captures arbitrary future suites, resumes, and preserves successful captures on failure", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run-viewer-capture-test-"));
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="blue"/></svg>';
  const icon = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  let socialBroken = false;
  const server = createServer((request, response) => {
    if (request.url === "/social.svg") { response.writeHead(socialBroken ? 503 : 200, { "Content-Type": "image/svg+xml" }); response.end(svg); return; }
    if (request.url === "/favicon.ico") { response.writeHead(404); response.end(); return; }
    const inline = request.url === "/inline";
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(`<!doctype html><html><head><title>Future fixture</title>${inline ? `<link rel="icon" href="${icon}"><meta property="og:image" content="/social.svg">` : ""}</head><body><h1>Future run</h1></body></html>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CAPTURE_BROWSER === "chrome" ? { channel: "chrome" } : {}) });
    const base = `http://127.0.0.1:${server.address().port}`;
    const suite = {
      id: "20990101-future-suite",
      runs: [
        { id: "not-deployed", deployment: null },
        { id: "failed", deployment: "ftp://invalid/" },
        { id: "brand-new-model", deployment: `${base}/inline` },
        { id: "another-model", deployment: `${base}/no-icon` },
      ].map((run) => ({ ...run, finalOutput: `/suites/20990101-future-suite/runs/${run.id}/final.md` })),
    };
    const options = { root, browser, suite, log: () => {} };
    const first = await captureSuite(options);
    assert.equal(first.failureCount, 1);
    assert.equal(first.captures["not-deployed"], undefined);
    assert.equal(first.captures["brand-new-model"].faviconStatus, "found");
    assert.equal(first.captures["another-model"].faviconStatus, "missing");
    assert.equal(first.captures["brand-new-model"].favicon.source, icon);
    const original = first.captures["brand-new-model"];
    assert.equal(original.socialPreviewStatus, "found");
    assert.equal(original.socialPreview.width, 16);
    assert.equal(first.captures["another-model"].socialPreviewStatus, "missing");
    assert.equal(await readFile(path.join(root, "public", original.socialPreview.path), "utf8"), svg);
    const png = await readFile(path.join(root, "public", original.screenshot));
    assert.equal(png.readUInt32BE(16), 1440);
    assert.equal(png.readUInt32BE(20), 900);
    assert.equal(await readFile(path.join(root, "public", original.favicon.path), "utf8"), svg);

    suite.runs[1].deployment = `${base}/recovered`;
    const resumed = await captureSuite(options);
    assert.equal(resumed.failureCount, 0);
    assert.equal(Object.keys(resumed.captures).length, 3);
    assert.equal(resumed.captures["brand-new-model"].capturedAt, original.capturedAt);
    assert.deepEqual(JSON.parse(await readFile(path.join(root, "public/suites", suite.id, "capture-errors.json"), "utf8")), {});

    // Backfill legacy manifests without changing historical screenshot bytes/times.
    const legacy = structuredClone(resumed.captures);
    delete legacy["brand-new-model"].socialPreview;
    delete legacy["brand-new-model"].socialPreviewStatus;
    await writeFile(path.join(root, "public/suites", suite.id, "storefronts.json"), JSON.stringify(legacy));
    const backfill = await captureSuite({ ...options, runId: "brand-new-model", socialOnly: true });
    assert.equal(backfill.captures["brand-new-model"].socialPreviewStatus, "found");
    assert.equal(backfill.captures["brand-new-model"].capturedAt, original.capturedAt);
    assert.deepEqual(await readFile(path.join(root, "public", original.screenshot)), png);
    const archived = backfill.captures["brand-new-model"];
    socialBroken = true;
    const failedSocial = await captureSuite({ ...options, runId: "brand-new-model", socialOnly: true, overwrite: true });
    assert.equal(failedSocial.failureCount, 1);
    assert.deepEqual(failedSocial.captures["brand-new-model"], archived);

    suite.runs[2].deployment = "ftp://invalid/";
    const failedRefresh = await captureSuite({ ...options, runId: "brand-new-model", overwrite: true });
    assert.equal(failedRefresh.failureCount, 1);
    assert.deepEqual(failedRefresh.captures["brand-new-model"], archived);
    assert.deepEqual(await readFile(path.join(root, "public", original.screenshot)), png);
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
