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
  assert.match(html, /<title>Benchmark run viewer<\/title>/i);
  assert.match(html, /Minimal prompt/);
  assert.match(html, /Beauty prompt/);
  assert.match(html, /Harness 6/);
  assert.match(html, /Codex · gpt-6-astra/);
  assert.match(html, /Design background/);
  assert.match(html, /Full print canvas generated/);
  assert.match(html, /Suite summary/);
  assert.equal((html.match(/Full print canvas generated/g) ?? []).length, 7);
});

test("packages all 14 full-canvas designs, final outputs, and all summaries", async () => {
  const suiteNames = ["20260905-minimal-high", "20260905-beauty-high"];

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
  assert.equal((source.match(/finalOutput: "\/suites/g) ?? []).length, 14);
  assert.equal((source.match(/design: "\/suites/g) ?? []).length, 14);
  assert.equal((source.match(/deployment: "https:\/\//g) ?? []).length, 14);
  assert.match(viewer, /ReactMarkdown/);
  assert.match(viewer, /remarkGfm/);

  const allSuites = await readdir(new URL("../public/suites/", import.meta.url));
  assert.deepEqual(allSuites.sort(), [
    "20260823-serial-high",
    "20260825-fresh6-high",
    "20260825-harness6-high",
    "20260827-harness6-high",
    "20260905-beauty-high",
    "20260905-minimal-high",
  ]);
});
