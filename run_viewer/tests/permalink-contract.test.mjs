import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { suites } from "../app/data.ts";
import { viewerLink } from "../app/permalinks.ts";
import { summaryHeadings } from "../app/summary-headings.ts";

const contract = JSON.parse(await readFile(new URL("./fixtures/permalinks-v1.json", import.meta.url), "utf8"));

test("permalink v1 query names, order, short run IDs, encoding and fragments are stable", () => {
  assert.equal(viewerLink("20260905-beauty-high"), "?suite=20260905-beauty-high");
  assert.equal(viewerLink("20260905-beauty-high", "opus"), "?suite=20260905-beauty-high&run=opus");
  assert.equal(viewerLink("20260905-beauty-high", undefined, "summary-design-correctness-and-print-proof"), "?suite=20260905-beauty-high#summary-design-correctness-and-print-proof");
  assert.equal(viewerLink("a & b", "x/y"), "?suite=a+%26+b&run=x%2Fy");
  for (const base of ["http://localhost:4173/", "https://example.com/endless-tshirt-shops/"]) {
    assert.equal(new URL(viewerLink("suite", "sol"), base).href, `${base}?suite=suite&run=sol`);
  }
});

test("all previously published suite, run and summary-heading destinations still exist", async () => {
  for (const previous of contract.suites) {
    const current = suites.find(s => s.id === previous.id);
    assert.ok(current, `Removed published suite: ${previous.id}`);
    for (const run of previous.runs) {
      assert.equal(current.runs.find(r => r.id === run.id)?.model, run.model, `Broken or retargeted run link: ${previous.id}/${run.id}`);
    }
    const summary = await readFile(new URL(`../public${current.summary}`, import.meta.url), "utf8");
    const html = renderToStaticMarkup(createElement(ReactMarkdown, { remarkPlugins: [summaryHeadings] }, summary));
    const ids = new Set([...html.matchAll(/<h[1-6] id="([^"]+)"/g)].map(m => m[1]));
    for (const heading of previous.headings) assert.ok(ids.has(heading), `Broken published heading: ${previous.id}#${heading}; preserve an alias rather than rewriting the compatibility fixture`);
  }
});
