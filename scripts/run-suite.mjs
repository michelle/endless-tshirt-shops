#!/usr/bin/env node
// Serial, unattended suite controller. Launch in a dedicated clean worktree.
import { spawn } from 'node:child_process';
import { mkdir, open, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { git, identifier } from './run-inspector/common.mjs';

export const models = [
  ['codex', 'gpt-6-astra'], ['codex', 'gpt-5.6-sol'],
  ['codex', 'gpt-5.6-terra'], ['codex', 'gpt-5.6-luna'],
  ['claude', 'claude-fable-5-1'], ['claude', 'claude-opus-5'], ['claude', 'claude-sonnet-5'],
];
export function parseArgs(args) {
  const options = { repo: process.cwd(), prompt: 'prompt-minimal.md', effort: 'high', timeout: '7200' };
  for (let i = 0; i < args.length; i += 2) {
    const key = { '--repo': 'repo', '--suite': 'suite', '--prompt': 'prompt', '--effort': 'effort', '--timeout': 'timeout' }[args[i]];
    if (!key || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Unknown option or missing value');
    options[key] = args[i + 1];
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
  const directory = path.join(repo, '.benchmark-secrets/suites', suite);
  await mkdir(path.dirname(directory), { recursive: true, mode: 0o700 });
  await mkdir(directory, { mode: 0o700 }); // Refuse duplicate/resumed launch; inspect interrupted state first.
  const log = await open(path.join(directory, 'controller.log'), 'wx', 0o600);
  const progress = { schemaVersion: 1, suite, baseCommit, baseBranch, prompt: options.prompt, reasoningEffort: options.effort, startedAt: new Date().toISOString(), state: 'running', active: null, completed: [] };
  const record = () => writeFile(path.join(directory, 'progress.json'), JSON.stringify(progress, null, 2) + '\n', { mode: 0o600 });
  const spawnOptions = { cwd: repo, env: process.env, stdio: ['ignore', log.fd, log.fd] };
  try {
    await record();
    for (const [adapter, model] of models) {
      assertBase();
      const runId = `${suite}-${adapter}-${model}`;
      progress.active = runId; await record();
      const startedAt = new Date().toISOString();
      const result = await run(path.join(repo, 'scripts/run-benchmark'), ['--adapter', adapter, '--model', model, '--suite-id', suite, '--run-id', runId, '--prompt-file', options.prompt, '--reasoning-effort', options.effort, '--timeout', options.timeout], spawnOptions);
      progress.completed.push({ runId, model, startedAt, finishedAt: new Date().toISOString(), exitCode: result.code, signal: result.signal });
      progress.active = null; await record();
      assertBase();
      // A model failure can continue; absent publication is a controller blocker.
      readGit(['cat-file', '-e', `origin/benchmark-results:runs/${runId}/metadata.json`]);
    }
    progress.state = 'inspecting'; await record();
    const inspected = await run(process.execPath, [path.join(repo, 'scripts/run-inspector/inspect.mjs'), '--suite', suite, '--expected-runs', String(models.length), '--live', '--output', path.join(directory, 'inspection')], spawnOptions);
    if (inspected.code !== 0) throw new Error('All attempts finished; automated inspection failed, see private controller log');
    progress.state = 'awaiting-human-audit'; progress.inspection = path.join(directory, 'inspection'); progress.finishedAt = new Date().toISOString(); await record();
  } catch (error) {
    progress.state = 'blocked'; progress.reason = error.message; await record(); throw error;
  } finally { await log.close(); }
  return { directory, state: progress.state, completed: progress.completed.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.includes('--help')) console.log('Usage: node scripts/run-suite.mjs --suite ID [--repo CLEAN_WORKTREE] [--prompt prompt-minimal.md] [--effort high] [--timeout 7200]\nRuns all seven models serially, publishes individual results, then collects read-only inspection evidence. Requires PRODIGI_API_KEY.');
  else try { console.log(JSON.stringify(await runSuite(parseArgs(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
