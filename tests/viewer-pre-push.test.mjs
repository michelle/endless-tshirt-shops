import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
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
