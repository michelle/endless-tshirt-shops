import assert from "node:assert/strict";
import test from "node:test";
import { suites } from "../app/data.ts";
import { assessments, criteria, rateRun } from "../audit/ratings.ts";

const recorded = Object.entries(assessments).flatMap(([suiteId, runs]) =>
  Object.entries(runs).map(([runId, assessment]) => ({ suiteId, runId, assessment })),
);

test("a rating aggregates exactly the checks recorded for that run", () => {
  for (const { suiteId, runId, assessment } of recorded) {
    const rating = rateRun(suiteId, runId);
    const passed = Object.values(assessment).filter((check) => check.result === "pass").length;
    assert.equal(rating.passed, passed, `${suiteId}/${runId}`);
    assert.equal(rating.tone, passed === 3 ? "complete" : passed === 2 ? "partial" : "failed");
    assert.equal(rating.label, passed === 3 ? "Pass" : passed === 2 ? "Partial" : "Fail");
    assert.deepEqual(rating.checks.map((check) => check.id), criteria.map((criterion) => criterion.id));
  }
});

test("every recorded judgement names a real run and fills in all three criteria", () => {
  for (const { suiteId, runId, assessment } of recorded) {
    const suite = suites.find((candidate) => candidate.id === suiteId);
    assert.ok(suite, `Judgement for an unregistered suite: ${suiteId}`);
    assert.ok(suite.runs.some((run) => run.id === runId), `Judgement for an unregistered run: ${suiteId}/${runId}`);
    assert.deepEqual(Object.keys(assessment).sort(), criteria.map((criterion) => criterion.id).sort());
    for (const [id, check] of Object.entries(assessment)) {
      assert.ok(["pass", "fail", "unverified"].includes(check.result), `${suiteId}/${runId}/${id}: ${check.result}`);
      assert.ok(check.reason.trim(), `${suiteId}/${runId}/${id} has no reason`);
    }
  }
});

// Which prompts asked for an original theme rather than only a timestamp. This
// is the independent anchor for themedArtwork: the flag is derived from the task
// a suite actually ran, so checking it against rateRun alone proves nothing.
const THEMED_PROMPTS = new Set(["prompt-v2.md", "prompt-v3.md", "prompt-clean-sheet.md"]);

test("themedArtwork agrees with the prompt each suite actually ran", () => {
  for (const suite of suites) {
    assert.equal(Boolean(suite.themedArtwork), THEMED_PROMPTS.has(suite.prompt.file),
      `${suite.id} ran ${suite.prompt.file}`);
  }
});

test("the artwork criterion swaps for themed suites and holds for timestamp suites", () => {
  const label = (suiteId) => rateRun(suiteId, "sonnet").checks[0].label;
  const scored = suites.filter((suite) => suite.runs.length);
  const themed = scored.filter((suite) => THEMED_PROMPTS.has(suite.prompt.file));
  const timestamp = scored.filter((suite) => !THEMED_PROMPTS.has(suite.prompt.file));
  assert.ok(themed.length && timestamp.length, "Both prompt styles must be represented");
  for (const suite of themed) assert.equal(label(suite.id), "Printable theme design", suite.id);
  for (const suite of timestamp) assert.equal(label(suite.id), "Timestamp-only print", suite.id);
});

test("runs with no recorded judgement never pass", () => {
  const rating = rateRun("future-suite", "new-model");
  assert.equal(rating.passed, 0);
  assert.equal(rating.tone, "failed");
  assert.ok(rating.checks.every((check) => check.result === "unverified"));
  assert.ok(rating.checks.every((check) => check.reason.trim()));
});
