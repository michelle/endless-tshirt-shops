#!/usr/bin/env node
// Serial, unattended suite controller. Launch in a dedicated clean worktree.
import { spawn } from 'node:child_process';
import { mkdir, open, writeFile, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { git, identifier, hash } from './run-inspector/common.mjs';

export const models = [
  ['codex', 'gpt-6-astra'], ['codex', 'gpt-5.6-sol'],
  ['codex', 'gpt-5.6-terra'], ['codex', 'gpt-5.6-luna'],
  ['claude', 'claude-fable-5-1'], ['claude', 'claude-opus-5'], ['claude', 'claude-sonnet-5'],
];
export function parseArgs(args) {
  const options = { repo: process.cwd(), prompt: 'prompt-minimal.md', effort: 'high', timeout: '7200' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--resume') { options.resume = true; continue; }
    const key = { '--repo': 'repo', '--suite': 'suite', '--prompt': 'prompt', '--effort': 'effort', '--timeout': 'timeout' }[args[i]];
    if (!key || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Unknown option or missing value');
    options[key] = args[i + 1];
    i++;
  }
  identifier(options.suite);
  if (!['low', 'medium', 'high', 'xhigh', 'max'].includes(options.effort) || !/^[1-9]\d*$/.test(options.timeout)) throw new Error('Invalid effort or timeout');
  return options;
}
async function execute(command, args, options) {
  const child = spawn(command, args, options);
  return await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
}
export async function runSuite(options, dependencies = {}) {
  const repo = path.resolve(options.repo), suite = identifier(options.suite);
  const readGit = dependencies.git ?? (args => git(repo, args).trim());
  const run = dependencies.execute ?? execute;
  if (!/^test_[a-f\d-]{36}$/i.test(process.env.PRODIGI_API_KEY ?? '')) throw new Error('PRODIGI_API_KEY sandbox credential required');
  const baseCommit = readGit(['rev-parse', 'HEAD']), baseBranch = readGit(['branch', '--show-current']);
  function assertBase() {
    if (!baseBranch || readGit(['branch', '--show-current']) !== baseBranch || readGit(['rev-parse', 'HEAD']) !== baseCommit || readGit(['status', '--porcelain', '--untracked-files=all'])) throw new Error('Publication or cleanup requires inspection; worktree preserved');
  }
  assertBase();
  const promptPath = path.resolve(repo, options.prompt);
  if (!promptPath.startsWith(repo + path.sep)) throw new Error('Prompt must be inside the worktree');
  const promptSha256 = hash(await readFile(promptPath));
  // Tooling may be repaired without changing the benchmark's pinned input tree.
  const toolingRoot = path.resolve(import.meta.dirname, '..');
  const toolingCommit = dependencies.toolingCommit ?? git(toolingRoot, ['rev-parse', 'HEAD']).trim();
  const directory = path.join(repo, '.benchmark-secrets/suites', suite);
  await mkdir(path.dirname(directory), { recursive: true, mode: 0o700 });
  if (!options.resume) await mkdir(directory, { mode: 0o700 });
  const lock = path.join(directory, 'controller.lock');
  await mkdir(lock, { mode: 0o700 }); // Never steal an existing controller lock.
  let log, progress;
  const record = async () => {
    const temporary = path.join(directory, 'progress.pending.json');
    await writeFile(temporary, JSON.stringify(progress, null, 2) + '\n', { mode: 0o600 });
    await rename(temporary, path.join(directory, 'progress.json'));
  };
  function published(runId, adapter, model) {
    const metadata = JSON.parse(readGit(['show', `origin/benchmark-results:runs/${runId}/metadata.json`]));
    if (metadata.run_id !== runId || metadata.suite_id !== suite || metadata.model !== model || metadata.adapter !== adapter || metadata.base_commit !== baseCommit || metadata.prompt_sha256 !== promptSha256 || metadata.prompt_file !== options.prompt || metadata.reasoning_effort !== options.effort) throw new Error(`Published metadata mismatch for ${runId}`);
    for (const file of ['final.md', 'capture.json', 'events.jsonl']) readGit(['cat-file', '-e', `origin/benchmark-results:runs/${runId}/${file}`]);
    return { artifactCommit: readGit(['log', '-1', '--format=%H', 'origin/benchmark-results', '--', `runs/${runId}`]), modelStatus: metadata.status, verifiedAt: new Date().toISOString() };
  }
  try {
    await writeFile(path.join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { mode: 0o600 });
    if (options.resume) {
      const saved = JSON.parse(await readFile(path.join(directory, 'progress.json'), 'utf8'));
      if (saved.schemaVersion !== 1 || saved.suite !== suite || saved.baseCommit !== baseCommit || saved.baseBranch !== baseBranch || saved.prompt !== options.prompt || saved.reasoningEffort !== options.effort || (saved.promptSha256 && saved.promptSha256 !== promptSha256) || (saved.timeout && saved.timeout !== options.timeout)) throw new Error('Resume configuration differs from the saved suite');
      if (saved.state !== 'blocked' || saved.active) throw new Error('Resume requires a blocked suite with no active attempt; inspect interrupted state first');
      if (!Array.isArray(saved.completed) || saved.completed.length > models.length) throw new Error('Invalid saved attempts');
      readGit(['fetch', '-q', 'origin', 'benchmark-results']);
      // Validate every recorded attempt before modifying progress or launching anything.
      for (const [index, entry] of saved.completed.entries()) {
        const [adapter, model] = models[index], runId = `${suite}-${adapter}-${model}`;
        if (entry.runId !== runId || entry.model !== model) throw new Error('Saved attempts are not a unique ordered prefix');
        entry.publication = published(runId, adapter, model);
      }
      progress = saved;
      progress.recoveries ??= [];
      progress.recoveries.push({ resumedAt: new Date().toISOString(), previousState: progress.state, previousReason: progress.reason, toolingCommit });
      delete progress.reason;
    } else progress = { schemaVersion: 1, suite, baseCommit, baseBranch, prompt: options.prompt, reasoningEffort: options.effort, startedAt: new Date().toISOString(), active: null, completed: [] };
    progress.state = 'running'; progress.promptSha256 = promptSha256; progress.timeout = options.timeout; progress.toolingCommit = toolingCommit;
    log = await open(path.join(directory, 'controller.log'), options.resume ? 'a' : 'wx', 0o600);
    const spawnOptions = { cwd: repo, env: process.env, stdio: ['ignore', log.fd, log.fd] };
    await record();
    for (const [adapter, model] of models.slice(progress.completed.length)) {
      assertBase();
      const runId = `${suite}-${adapter}-${model}`;
      progress.active = runId; await record();
      const startedAt = new Date().toISOString();
      const result = await run(path.join(toolingRoot, 'scripts/run-benchmark'), ['--adapter', adapter, '--model', model, '--suite-id', suite, '--run-id', runId, '--prompt-file', options.prompt, '--reasoning-effort', options.effort, '--timeout', options.timeout], spawnOptions);
      progress.completed.push({ runId, model, toolingCommit, startedAt, finishedAt: new Date().toISOString(), exitCode: result.code, signal: result.signal });
      progress.active = null; await record();
      assertBase();
      // A model failure can continue; absent publication is a controller blocker.
      progress.completed.at(-1).publication = published(runId, adapter, model); await record();
    }
    progress.state = 'inspecting'; await record();
    const inspection = path.join(directory, `inspection-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    const inspected = await run(process.execPath, [path.join(toolingRoot, 'scripts/run-inspector/inspect.mjs'), '--suite', suite, '--expected-runs', String(models.length), '--live', '--output', inspection], spawnOptions);
    if (inspected.code !== 0) throw new Error('All attempts finished; automated inspection failed, see private controller log');
    progress.state = 'awaiting-human-audit'; progress.inspection = inspection; progress.finishedAt = new Date().toISOString(); await record();
  } catch (error) {
    if (progress) { progress.state = 'blocked'; progress.reason = error.message; await record(); }
    throw error;
  } finally { await log?.close(); await rm(lock, { recursive: true }); }
  return { directory, state: progress.state, completed: progress.completed.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.includes('--help')) console.log('Usage: node scripts/run-suite.mjs --suite ID [--repo CLEAN_WORKTREE] [--prompt prompt-minimal.md] [--effort high] [--timeout 7200] [--resume]\nResume verifies published attempts and the original base/prompt/effort before skipping them. Requires PRODIGI_API_KEY.');
  else try { console.log(JSON.stringify(await runSuite(parseArgs(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
