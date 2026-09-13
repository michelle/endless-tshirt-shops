import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { suites } from "../app/data.ts";
import { registeredAssets } from "../scripts/archive-contract.mjs";

const root = fileURLToPath(new URL("../public/", import.meta.url));
test("every registered suite/run and declared capture references a publishable nonempty file", async () => {
  await registeredAssets(suites, root);
});

test("a registered but missing summary fails (the unserious import regression)", async () => {
  await assert.rejects(registeredAssets([{ id: "missing-suite", summary: "/suites/missing-suite/summary.md", runs: [] }], root), /Missing registered asset.*summary\.md/);
});

test("every suite includes its original prompt and rejects missing or changed copies", async () => {
  for (const original of suites) {
    assert.equal(original.prompt.path, `/suites/${original.id}/prompt.md`);
    const changed = structuredClone(original);
    changed.prompt.sha256 = "0".repeat(64);
    await assert.rejects(registeredAssets([changed], root), /Prompt differs from archived revision/);
  }
  const absent = structuredClone(suites[0]);
  delete absent.prompt;
  await assert.rejects(registeredAssets([absent], root), /Missing suite prompt/);
});

test("a missing final or image fails even when every existing file is valid", async () => {
  const missingFinal = structuredClone(suites.find(suite => suite.runs.length));
  const directory = `/suites/${missingFinal.id}/runs/missing-run`;
  missingFinal.runs[0].finalOutput = `${directory}/final.md`;
  if (missingFinal.runs[0].design) missingFinal.runs[0].design = `${directory}/design.png`;
  await assert.rejects(registeredAssets([missingFinal], root), /Missing registered asset/);

  // Select for artwork rather than assuming the first suite with runs has some:
  // a suite can legitimately register runs with no recovered design at all.
  const withArtwork = suites.find(suite => suite.runs.some(run => run.design));
  assert.ok(withArtwork, "No suite registers artwork to exercise this check");
  const missingArtwork = structuredClone(withArtwork);
  const run = missingArtwork.runs.find(candidate => candidate.design);
  run.design = run.design.replace(/[^/]+$/, "paid-design.png");
  await assert.rejects(registeredAssets([missingArtwork], root), /Missing registered asset/);
});

test("a capture must belong to the deployment it is registered against", async () => {
  const invalid = structuredClone(suites.find(s => s.runs.length));
  invalid.runs[0].deployment = "https://wrong-store.example.com";
  await assert.rejects(registeredAssets([invalid], root), /Capture belongs to another deployment/);
});

test("failed provider runs may archive a final without inventing artwork or a deployment", async () => {
  const suite = structuredClone(suites.find(s => s.runs.some(run => !run.deployment && !run.design)));
  assert.ok(suite, "No suite exercises a run without a deployment or artwork");
  await registeredAssets([suite], root);

  const invalid = structuredClone(suite);
  invalid.runs.find(run => !run.design).width = 1;
  await assert.rejects(registeredAssets([invalid], root), /Missing artwork must not declare width/);
});
