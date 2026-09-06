import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const zero = /^0+$/;
const paths = ["run_viewer", ".githooks", "scripts/viewer-pre-push.mjs", "scripts/install-viewer-hook.mjs", "tests/viewer-pre-push.test.mjs", ".github/workflows/run-viewer-pages.yml"];
const git = (repo, args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();

export function commitsToCheck(repo, updates) {
  const commits = new Set();
  for (const line of updates.trim().split("\n").filter(Boolean)) {
    const [localRef, localSha, remoteRef, remoteSha] = line.trim().split(/\s+/);
    if (!localRef || !/^[a-f0-9]{40,64}$/.test(localSha) || !/^[a-f0-9]{40,64}$/.test(remoteSha) || !remoteRef) throw new Error("Invalid pre-push ref input");
    if (zero.test(localSha) || !remoteRef.startsWith("refs/heads/") || remoteRef === "refs/heads/benchmark-results") continue;
    // A new branch (or unavailable remote object) gets full validation.
    const knownRemote = !zero.test(remoteSha) && spawnSync("git", ["-C", repo, "cat-file", "-e", `${remoteSha}^{commit}`], { stdio: "ignore" }).status === 0;
    const changed = knownRemote
      ? git(repo, ["diff", "--name-only", remoteSha, localSha, "--", ...paths])
      : git(repo, ["ls-tree", "-r", "--name-only", localSha, "--", ...paths]);
    if (changed) commits.add(localSha);
  }
  return [...commits];
}

export function snapshotViewer(repo, commit, destination) {
  const archive = execFileSync("git", ["-C", repo, "archive", "--format=tar", commit, "run_viewer"], { maxBuffer: 100 * 1024 * 1024 });
  execFileSync("tar", ["-xf", "-", "-C", destination], { input: archive });
}

export function validatePush(repo, updates) {
  for (const commit of commitsToCheck(repo, updates)) {
    const directory = mkdtempSync(path.join(tmpdir(), "viewer-pre-push-"));
    try {
      console.log(`Viewer pre-push: checking committed snapshot ${commit.slice(0, 12)}`);
      snapshotViewer(repo, commit, directory);
      const cwd = path.join(directory, "run_viewer");
      const pkg = JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8"));
      if (!pkg.scripts?.predeploy) throw new Error("Pushed commit lacks the viewer predeploy gate");
      const env = { ...process.env };
      if (!env.CAPTURE_BROWSER && existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")) env.CAPTURE_BROWSER = "chrome";
      const command = "npm ci --no-audit --no-fund && npm run predeploy";
      // This repository's viewer needs Node 22; the user's login shell may use 20.
      const result = spawnSync("npx", ["--yes", "--package=node@22.13.0", "--call", command], { cwd, env, stdio: "inherit" });
      if (result.error || result.status !== 0) throw new Error(`Viewer pre-push failed for ${commit.slice(0, 12)}; push blocked. Fix and commit the files, then retry. ${result.error?.message ?? ""}`);
    } finally {
      // Only the exact isolated directory allocated above, never the worktree.
      rmSync(directory, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { validatePush(git(process.cwd(), ["rev-parse", "--show-toplevel"]), readFileSync(0, "utf8")); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
