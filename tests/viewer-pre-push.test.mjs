import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { commitsToCheck, snapshotViewer } from "../scripts/viewer-pre-push.mjs";

test("pre-push tests pushed commits, ignores artifact/deletion refs, and cannot see untracked repairs", () => {
  const root = mkdtempSync(path.join(tmpdir(), "viewer-hook-test-"));
  const repo = path.join(root, "repo");
  mkdirSync(repo);
  const git = (...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  try {
    git("init"); git("config", "user.name", "Hook test"); git("config", "user.email", "test@example.invalid");
    mkdirSync(path.join(repo, "run_viewer"));
    writeFileSync(path.join(repo, "run_viewer/package.json"), '{}\n');
    git("add", "."); git("commit", "-m", "first");
    const first = git("rev-parse", "HEAD");
    writeFileSync(path.join(repo, "run_viewer/data.ts"), 'export const summary = "missing.md";\n');
    git("add", "."); git("commit", "-m", "register missing summary");
    const second = git("rev-parse", "HEAD");
    writeFileSync(path.join(repo, "run_viewer/missing.md"), 'Untracked local repair\n');
    const zeros = "0".repeat(40);
    const update = (sha, remote, old) => `refs/heads/main ${sha} ${remote} ${old}\n`;
    assert.deepEqual(commitsToCheck(repo, update(second, "refs/heads/main", first)), [second]);
    assert.deepEqual(commitsToCheck(repo, update(second, "refs/heads/main", zeros)), [second]);
    assert.deepEqual(commitsToCheck(repo, update(second, "refs/heads/benchmark-results", first)), []);
    assert.deepEqual(commitsToCheck(repo, update(zeros, "refs/heads/main", second)), []);
    assert.deepEqual(commitsToCheck(repo, update(first, "refs/heads/main", first)), []);
    const snapshot = path.join(root, "snapshot"); mkdirSync(snapshot);
    snapshotViewer(repo, second, snapshot);
    assert.ok(existsSync(path.join(snapshot, "run_viewer/data.ts")));
    assert.ok(!existsSync(path.join(snapshot, "run_viewer/missing.md")), "Local untracked summary must not hide a broken pushed snapshot");
    assert.ok(existsSync(path.join(repo, "run_viewer/missing.md")), "User changes must be preserved");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("snapshotViewer streams rather than buffering, and reports failures clearly", () => {
  const repo = mkdtempSync(path.join(tmpdir(), "viewer-pre-push-stream-"));
  const git = (...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();
  git("init", "-q");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "t");
  mkdirSync(path.join(repo, "run_viewer/public"), { recursive: true });
  // Comfortably past the 100 MB maxBuffer that previously made pushes fail
  // with ENOBUFS once the archived viewer crossed it.
  writeFileSync(path.join(repo, "run_viewer/public/big.bin"), Buffer.alloc(120 * 1024 * 1024, 7));
  writeFileSync(path.join(repo, "run_viewer/package.json"), '{"scripts":{"predeploy":"true"}}');
  git("add", "-A");
  git("commit", "-qm", "big");
  const head = git("rev-parse", "HEAD");
  const destination = mkdtempSync(path.join(tmpdir(), "viewer-pre-push-out-"));
  snapshotViewer(repo, head, destination);
  assert.equal(statSync(path.join(destination, "run_viewer/public/big.bin")).size, 120 * 1024 * 1024);

  assert.throws(() => snapshotViewer(repo, "definitely-not-a-commit", destination), /Viewer snapshot failed/);
  rmSync(repo, { recursive: true, force: true });
  rmSync(destination, { recursive: true, force: true });
});
