#!/usr/bin/env node
// Decide which generated paths must stay out of a published run.
//
//   node scripts/exclude-bulky-artifacts.mjs RUN_ID   # prints a JSON exclusion list
//
// The harness stages whatever the agent left in its workspace, relying on the
// agent's own .gitignore to keep dependencies and build output out. Most agents
// write one. minimax-m3 wrote none, so a run staged 9834 files and 288.9 MB
// including a 109.6 MB native binary, and GitHub refused the push outright
// (GH001) -- after the run, wasting the attempt and blocking the whole suite.
//
// The runner already strips these when it copies the agent workspace into the
// run directory (see the tar --exclude line in run-benchmark), and that copy
// demonstrably works in isolation -- yet minimax-m3's node_modules reached the
// index anyway, by a route not established. This is therefore a second line of
// defence at the layer that actually decides what gets committed, not a
// replacement for that copy. Two rules, both conservative, and every exclusion
// is recorded in metadata.excluded_paths:
//
//   1. A fixed list of dependency and build directories. None of these is
//      evidence -- they are reinstallable or regenerable from the source that
//      does get published -- and no run in the archive has ever published one,
//      because every other agent ignored them itself.
//   2. Any single file at or above the size GitHub rejects. This is the
//      backstop for a bulky artifact the list does not name; it is reported
//      individually so the audit can see exactly what was dropped.
//
// Nothing else is touched. A large directory of the agent's own source still
// publishes in full.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

// GitHub hard-rejects a blob over 100 MB. The floor sits below that so a file
// that would break the push is dropped before the push, not after it.
export const SIZE_LIMIT = 90 * 1024 * 1024;
export const GENERATED_DIRECTORIES = [
  'node_modules', '.next', '.nuxt', '.svelte-kit', '.turbo', '.parcel-cache',
  'dist', 'build', 'out', 'target', 'vendor', '.venv', 'venv', '__pycache__',
];

// A path the agent already ignored is not staged, so excluding it would record
// an exclusion that never happened. `git check-ignore` is the only authority on
// that, since nested .gitignore files apply.
function ignored(repo, relative) {
  try {
    execFileSync('git', ['-C', repo, 'check-ignore', '-q', '--', relative], { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

export function findExclusions(runId, { cwd = process.cwd(), limit = SIZE_LIMIT } = {}) {
  const workspace = path.join(cwd, 'runs', runId, 'workspace');
  if (!existsSync(workspace)) return [];
  const exclusions = [];
  const skip = new Set();
  const walk = directory => {
    let entries;
    try { entries = readdirSync(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      const relative = path.relative(cwd, full);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (GENERATED_DIRECTORIES.includes(entry.name)) {
          if (ignored(cwd, relative)) continue; // Already out of the index.
          exclusions.push({ path: relative, reason: `generated directory '${entry.name}'; not evidence and regenerable from the published source` });
          skip.add(full);
          continue;
        }
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      let size;
      try { size = statSync(full).size; } catch { continue; }
      if (size < limit || ignored(cwd, relative)) continue;
      exclusions.push({ path: relative, reason: `${(size / 1048576).toFixed(1)} MB file; at or above the ${(limit / 1048576).toFixed(0)} MB publication limit` });
    }
  };
  walk(workspace);
  return exclusions.sort((a, b) => a.path.localeCompare(b.path));
}

function main() {
  const runId = process.argv[2];
  if (!runId || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runId) || runId.includes('..')) {
    process.stderr.write('error: a valid run ID is required\n');
    process.exit(2);
  }
  const exclusions = findExclusions(runId);
  for (const { path: relative, reason } of exclusions) process.stderr.write(`note: excluding ${relative} (${reason})\n`);
  process.stdout.write(JSON.stringify(exclusions));
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) main();
