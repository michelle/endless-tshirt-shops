import assert from "node:assert/strict";
import { readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { isPublishedArchivePath } from "./pages-redaction.mjs";
import { viewport } from "./viewport.mjs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
// A missing object and a missing repository both exit 128, so repo-ness is
// probed separately rather than inferred from the status. Outside a repository
// (how the pre-push hook validates an extracted snapshot) or in a shallow clone
// (how CI checks out), nothing can be disproved, so the revision passes.
let verifiable;
function knownCommit(revision) {
  const git = (args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  if (verifiable === undefined) {
    try { git(["rev-parse", "--git-dir"]); verifiable = git(["rev-parse", "--is-shallow-repository"]).trim() !== "true"; }
    catch { verifiable = false; }
  }
  if (!verifiable) return true;
  try { git(["cat-file", "-e", `${revision}^{commit}`]); return true; } catch { return false; }
}


/** Follow the registry, not directory contents: missing files must fail too. */
export async function registeredAssets(suites, publicRoot) {
  const assets = new Set(["/favicon.svg"]);
  const suiteIds = new Set();
  async function add(url) {
    assert.equal(typeof url, "string", "Archive reference must be a string");
    assert.ok(url.startsWith("/") && !url.startsWith("//") && !url.split("/").includes(".."), `Unsafe archive reference: ${url}`);
    assert.ok(isPublishedArchivePath(url.slice(1)), `Reference excluded from publication: ${url}`);
    const file = path.join(publicRoot, url);
    const stat = await lstat(file).catch(() => { throw new Error(`Missing registered asset: ${url}`); });
    assert.ok(stat.isFile() && stat.size > 0, `Empty, symlink or non-file asset: ${url}`);
    assets.add(url);
  }
  await add("/favicon.svg");
  for (const suite of suites) {
    assert.ok(!suiteIds.has(suite.id), `Duplicate suite ID: ${suite.id}`);
    suiteIds.add(suite.id);
    assert.equal(suite.summary, `/suites/${suite.id}/summary.md`);
    await add(suite.summary);
    assert.equal(suite.prompt?.path, `/suites/${suite.id}/prompt.md`, `Missing suite prompt: ${suite.id}`);
    await add(suite.prompt.path);
    const prompt = await readFile(path.join(publicRoot, suite.prompt.path));
    assert.equal(createHash("sha256").update(prompt).digest("hex"), suite.prompt.sha256, `Prompt differs from archived revision: ${suite.id}`);
    assert.match(suite.prompt.revision, /^[a-f0-9]{40}$/);
    // Shape is not provenance. A 40-hex string that names no commit satisfies the
    // regex and publishes a revision nobody can check, which is the one claim this
    // archive exists to make. CI clones shallow, so the objects may be absent
    // there; where history is present the revision has to resolve.
    assert.ok(knownCommit(suite.prompt.revision), `Prompt revision is not a commit in this repository: ${suite.id} ${suite.prompt.revision}`);
    if (!suite.runs.length) continue;
    const manifest = `/suites/${suite.id}/storefronts.json`;
    await add(manifest);
    const captures = JSON.parse(await readFile(path.join(publicRoot, manifest), "utf8"));
    const runIds = new Set();
    for (const run of suite.runs) {
      assert.ok(!runIds.has(run.id), `Duplicate run ID: ${suite.id}/${run.id}`);
      runIds.add(run.id);
      const prefix = `/suites/${suite.id}/runs/`;
      assert.ok(run.finalOutput.startsWith(prefix) && run.finalOutput.endsWith("/final.md"));
      const directory = path.posix.dirname(run.finalOutput);
      assert.notEqual(directory, prefix.slice(0, -1));
      await add(run.finalOutput);
      if (run.design) {
        assert.equal(path.posix.dirname(run.design), directory, `Artwork belongs to another run: ${run.id}`);
        await add(run.design);
      } else {
        assert.equal(run.width, null, `Missing artwork must not declare width: ${run.id}`);
        assert.equal(run.height, null, `Missing artwork must not declare height: ${run.id}`);
      }
      const capture = captures[run.id];
      if (!run.deployment) {
        assert.equal(capture, undefined, `Run without deployment has a capture: ${suite.id}/${run.id}`);
        continue;
      }
      assert.ok(capture, `Missing capture record: ${suite.id}/${run.id}`);
      assert.equal(new URL(capture.url).href, new URL(run.deployment).href, `Capture belongs to another deployment: ${run.id}`);
      assert.equal(path.posix.dirname(capture.screenshot), directory);
      await add(capture.screenshot);
      // Read the PNG header rather than trusting the manifest: cross-suite
      // comparison only holds if every screenshot is the same viewport.
      const png = await readFile(path.join(publicRoot, capture.screenshot));
      assert.equal(png.subarray(1, 4).toString(), "PNG", `Screenshot is not a PNG: ${run.id}`);
      assert.deepEqual(
        [png.readUInt32BE(16), png.readUInt32BE(20), capture.width, capture.height],
        [viewport.width, viewport.height, viewport.width, viewport.height],
        `Screenshot is not a ${viewport.width} × ${viewport.height} capture: ${suite.id}/${run.id}`,
      );
      for (const key of ["favicon", "socialPreview"]) {
        // Legacy favicon manifests predate explicit status; null meant absent.
        const status = capture[`${key}Status`] ?? (key === "favicon" ? (capture[key] ? "found" : "missing") : undefined);
        assert.ok(["found", "missing", "unavailable"].includes(status), `Missing ${key} status: ${run.id}`);
        if (capture[key]) {
          assert.equal(status, "found");
          assert.equal(path.posix.dirname(capture[key].path), directory);
          await add(capture[key].path);
        } else assert.notEqual(status, "found", `Found ${key} without a file: ${run.id}`);
      }
    }
    assert.deepEqual(Object.keys(captures).sort(), suite.runs.filter(run => run.deployment).map(run => run.id).sort(), `Unexpected capture records: ${suite.id}`);
  }
  return [...assets];
}
