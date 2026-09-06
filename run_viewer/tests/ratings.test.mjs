import assert from "node:assert/strict";
import test from "node:test";
import { assessments, rateRun } from "../app/ratings.ts";

test("every reviewed run has three explicit checks, reasons, and the strict color", () => {
  const expected = {
    "20260905-beauty-high": [3, 0, 0, 0, 3, 2, 0],
    "20260905-minimal-high": [3, 2, 2, 0, 3, 3, 2],
  };
  for (const [suite, counts] of Object.entries(expected)) {
    const models = ["astra", "sol", "terra", "luna", "fable", "opus", "sonnet"];
    assert.equal(Object.keys(assessments[suite]).length, 7);
    models.forEach((model, index) => {
      const rating = rateRun(suite, model);
      assert.equal(rating.passed, counts[index], `${suite}/${model}`);
      assert.equal(rating.tone, counts[index] === 3 ? "complete" : counts[index] === 2 ? "partial" : "failed");
      assert.equal(rating.checks.length, 3);
      for (const check of rating.checks) assert.ok(check.reason.length > 20);
    });
  }
});

test("future unreviewed runs never silently pass", () => {
  const rating = rateRun("future-suite", "new-model");
  assert.equal(rating.passed, 0);
  assert.equal(rating.tone, "failed");
  assert.ok(rating.checks.every((check) => check.result === "unverified"));
});
