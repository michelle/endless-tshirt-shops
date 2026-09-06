import assert from "node:assert/strict";
import test from "node:test";
import { summaryHeadings } from "../app/summary-headings.ts";

test("summary fragments are stable and unique with nested text, punctuation, and collisions", () => {
  const heading = (text) => ({ type: "heading", children: [{ type: "text", value: text }] });
  const tree = { type: "root", children: [
    heading("Print quality!"), heading("Print quality!"), heading("Print quality-1"),
    { type: "heading", children: [{ type: "strong", children: [{ type: "text", value: "Nested " }] }, { type: "inlineCode", value: "code" }] },
    heading("☀"), heading("Résumé"),
  ] };
  summaryHeadings()(tree);
  const ids = tree.children.map((node) => node.data.hProperties.id);
  assert.deepEqual(ids, ["summary-print-quality", "summary-print-quality-1", "summary-print-quality-1-1", "summary-nested-code", "summary-section", "summary-résumé"]);
  summaryHeadings()(tree);
  assert.deepEqual(tree.children.map((node) => node.data.hProperties.id), ids);
});
