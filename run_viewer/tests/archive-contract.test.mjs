import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { suites } from "../app/data.ts";
import { registeredAssets } from "../scripts/archive-contract.mjs";

const root = fileURLToPath(new URL("../public/", import.meta.url));
test("every registered suite/run and declared capture references a publishable nonempty file", async () => {
  const assets = await registeredAssets(suites, root);
  assert.ok(assets.length > suites.length);
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
  for (const field of ["finalOutput", "design"]) {
    const suite = structuredClone(suites.find(s => s.runs.length));
    if (field === "finalOutput") {
      const dir = `/suites/${suite.id}/runs/missing-run`;
      suite.runs[0].finalOutput = `${dir}/final.md`;
      suite.runs[0].design = `${dir}/design.png`;
    } else suite.runs[0].design = suite.runs[0].design.replace(/[^/]+$/, "paid-design.png");
    await assert.rejects(registeredAssets([suite], root), /Missing registered asset/);
  }
});

test("capture records include files and explicit absence, not optimistic found flags", async () => {
  const suite = suites.find(s => s.runs.length);
  const captures = JSON.parse(await readFile(`${root}/suites/${suite.id}/storefronts.json`, "utf8"));
  assert.ok(Object.values(captures).some(c => c.socialPreviewStatus === "missing"));
  const invalid = structuredClone(suite);
  invalid.runs[0].deployment = "https://wrong-store.example.com";
  await assert.rejects(registeredAssets([invalid], root), /Capture belongs to another deployment/);
});
