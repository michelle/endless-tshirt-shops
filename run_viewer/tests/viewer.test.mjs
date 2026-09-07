import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the benchmark viewer", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>endless tshirt shops<\/title>/);
  assert.match(html, /<h1 class="viewer-title">endless tshirt shops<\/h1>/);
  assert.match(html, /Minimal prompt/);
  assert.match(html, /Beauty prompt/);
  assert.match(html, /Unserious prompt/);
  assert.match(html, /Clean-sheet prompt/);
  assert.match(html, /Harness 6/);
  assert.match(html, /Codex · gpt-6-astra/);
  assert.match(html, /T-shirt background/);
  assert.match(html, /Show prompt/);
  assert.match(html, /Dark mode/);
  assert.match(html, /Full print canvas generated/);
  assert.match(html, /Suite summary/);
  assert.equal((html.match(/Full print canvas generated/g) ?? []).length, 7);
});

test("packages all 35 full-canvas designs, final outputs, and all summaries", async () => {
  const suiteNames = ["20260906-minimal-inspector-high", "20260906-clean-sheet-high", "20260905-minimal-high", "20260905-beauty-high", "20260905-unserious-high"];

  for (const suite of suiteNames) {
    const [designs, finals, summary] = await Promise.all([
      readdir(new URL(`../public/suites/${suite}/runs/`, import.meta.url)),
      Promise.all((await readdir(new URL(`../public/suites/${suite}/runs/`, import.meta.url))).map((run) =>
        readFile(new URL(`../public/suites/${suite}/runs/${run}/final.md`, import.meta.url), "utf8"),
      )),
      readFile(new URL(`../public/suites/${suite}/summary.md`, import.meta.url), "utf8"),
    ]);

    assert.equal(designs.length, 7);
    assert.equal(finals.length, 7);
    assert.match(summary, /# Seven-model/);
    assert.match(summary, /## Design correctness and print proof/);
  }

  const source = await readFile(new URL("../app/data.ts", import.meta.url), "utf8");
  const viewer = await readFile(new URL("../app/Viewer.tsx", import.meta.url), "utf8");
  assert.ok((source.match(/finalOutput: "\/suites/g) ?? []).length >= 21);
  assert.ok((source.match(/design: "\/suites/g) ?? []).length >= 21);
  assert.ok((source.match(/deployment: "https:\/\//g) ?? []).length >= 21);
  assert.match(viewer, /ReactMarkdown/);
  assert.match(viewer, /remarkGfm/);

  const allSuites = await readdir(new URL("../public/suites/", import.meta.url));
  for (const suite of [
    "20260823-serial-high",
    "20260825-fresh6-high",
    "20260825-harness6-high",
    "20260827-harness6-high",
    "20260905-beauty-high",
    "20260905-minimal-high",
    "20260905-unserious-high",
  ]) assert.ok(allSuites.includes(suite), `Missing archived suite ${suite}`);
});

for (const [suiteId, missingIcons] of [
  ["20260906-minimal-inspector-high", ["terra", "luna"]],
  ["20260906-clean-sheet-high", ["astra", "luna", "opus"]],
  ["20260905-unserious-high", ["terra", "luna"]],
  ["20260905-beauty-high", ["terra", "luna"]],
  ["20260905-minimal-high", ["astra", "sol", "terra", "luna", "fable"]],
]) {
test(`archives seven ${suiteId} viewport screenshots and their actual favicon sources`, async () => {
  const captures = JSON.parse(await readFile(new URL(`../public/suites/${suiteId}/storefronts.json`, import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(captures).sort(), ["astra", "fable", "luna", "opus", "sol", "sonnet", "terra"]);
  for (const [model, capture] of Object.entries(captures)) {
    assert.equal(capture.httpStatus, 200);
    assert.ok(Number.isFinite(Date.parse(capture.capturedAt)));
    const screenshot = await readFile(new URL(`../public${capture.screenshot}`, import.meta.url));
    assert.equal(screenshot.subarray(1, 4).toString(), "PNG");
    assert.equal(screenshot.readUInt32BE(16), 1440);
    assert.equal(screenshot.readUInt32BE(20), 900);
    assert.equal(capture.width, 1440);
    assert.equal(capture.height, 900);
    if (missingIcons.includes(model)) {
      assert.equal(capture.favicon, null);
    } else {
      assert.ok(capture.favicon.source);
      assert.ok((await readFile(new URL(`../public${capture.favicon.path}`, import.meta.url))).length > 0);
    }
  }
});
}
