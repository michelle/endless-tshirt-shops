import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";
import path from "node:path";

const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const hooks = path.join(repo, ".githooks");
const current = spawnSync("git", ["config", "--get", "core.hooksPath"], { encoding: "utf8" }).stdout.trim();
const defaultHook = execFileSync("git", ["rev-parse", "--git-path", "hooks/pre-push"], { encoding: "utf8" }).trim();
if ((current && current !== hooks) || (!current && existsSync(defaultHook))) {
  throw new Error("Existing Git hooks configuration detected. Integrate .githooks/pre-push manually; nothing was replaced.");
}
chmodSync(path.join(hooks, "pre-push"), 0o755);
execFileSync("git", ["config", "--local", "core.hooksPath", hooks]);
console.log(`Installed viewer pre-push gate for this clone: ${hooks}`);
