import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runSuite, parseArgs, models } from '../scripts/run-suite.mjs';
import { hash } from '../scripts/run-inspector/common.mjs';
const git = args => {
  if (args[0] === 'show') {
    const runId = args[1].split('/')[2], model = models.find(([adapter, model]) => runId === `fixture-suite-${adapter}-${model}`);
    return JSON.stringify({ run_id: runId, suite_id: 'fixture-suite', adapter: model[0], model: model[1], base_commit: 'base', prompt_file: 'prompt-minimal.md', prompt_sha256: hash('fixture prompt'), reasoning_effort: 'high', status: 'succeeded' });
  }
  return args[0] === 'rev-parse' ? 'base' : args[0] === 'branch' ? 'base-branch' : '';
};
async function setup(t) {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'suite-controller-')); t.after(() => rm(repo, { recursive: true, force: true }));
  await writeFile(path.join(repo, 'prompt-minimal.md'), 'fixture prompt');
  const old = process.env.PRODIGI_API_KEY; process.env.PRODIGI_API_KEY = 'test_11111111-1111-1111-1111-111111111111';
  t.after(() => { if (old === undefined) delete process.env.PRODIGI_API_KEY; else process.env.PRODIGI_API_KEY = old; });
  return parseArgs(['--suite', 'fixture-suite', '--repo', repo]);
}
test('controller runs all seven serially, continues published model failures, then inspects', async t => {
  const opts = await setup(t), calls = []; let active = false;
  const result = await runSuite(opts, { git, execute: async (command, args) => {
    assert.equal(active, false); active = true; calls.push({ command, args });
    await new Promise(resolve => setTimeout(resolve, 1)); active = false;
    return { code: calls.length === 2 ? 1 : 0, signal: null };
  } });
  assert.equal(result.completed, 7); assert.equal(result.state, 'awaiting-human-audit');
  assert.deepEqual(calls.slice(0, 7).map(c => c.args[c.args.indexOf('--model') + 1]), models.map(m => m[1]));
  assert.ok(calls[7].args.includes('--live'));
  for (const call of calls.slice(0, 7)) assert.equal(call.args[call.args.indexOf('--reasoning-effort') + 1], 'high');
  const progress = JSON.parse(await readFile(path.join(result.directory, 'progress.json')));
  assert.equal(progress.completed[1].exitCode, 1); assert.equal(progress.active, null);
  await assert.rejects(runSuite(opts, { git }), { code: 'EEXIST' });
});
test('controller stops on absent publication and preserves progress', async t => {
  const opts = await setup(t); let calls = 0;
  await assert.rejects(runSuite(opts, { git: args => { if (args[0] === 'show') throw new Error('Not published'); return git(args); }, execute: async () => { calls++; return { code: 1, signal: null }; } }), /Not published/);
  assert.equal(calls, 1);
  const progress = JSON.parse(await readFile(path.join(opts.repo, '.benchmark-secrets/suites/fixture-suite/progress.json')));
  assert.equal(progress.state, 'blocked'); assert.equal(progress.completed.length, 1);
});

async function blocked(t) {
  const opts = await setup(t);
  await assert.rejects(runSuite(opts, { git: args => { if (args[0] === 'show') throw new Error('Not published'); return git(args); }, execute: async () => ({ code: 1, signal: null }) }), /Not published/);
  return { ...opts, resume: true };
}
test('resume verifies recovery and starts at Sol without rerunning Astra', async t => {
  const opts = await blocked(t), calls = [];
  const result = await runSuite(opts, { git, execute: async (cmd, args) => { calls.push({ cmd, args }); return { code: 0, signal: null }; } });
  assert.equal(calls.length, 7); // six models, then the inspector
  assert.equal(calls[0].args[calls[0].args.indexOf('--model') + 1], 'gpt-5.6-sol');
  assert.equal(result.completed, 7);
  const p = JSON.parse(await readFile(path.join(result.directory, 'progress.json')));
  assert.equal(p.completed[0].exitCode, 1); // Preserve the original publication failure.
  assert.equal(p.completed[0].publication.modelStatus, 'succeeded');
  assert.equal(p.recoveries.length, 1);
});
test('resume refuses missing or mismatched artifacts without rewriting saved progress', async t => {
  const opts = await blocked(t), file = path.join(opts.repo, '.benchmark-secrets/suites/fixture-suite/progress.json');
  const original = await readFile(file, 'utf8');
  for (const badGit of [
    args => { if (args[0] === 'show') throw new Error('Missing artifact'); return git(args); },
    args => args[0] === 'show' ? JSON.stringify({ ...JSON.parse(git(args)), base_commit: 'other' }) : git(args),
    args => args[0] === 'show' ? JSON.stringify({ ...JSON.parse(git(args)), model: 'other' }) : git(args),
  ]) {
    await assert.rejects(runSuite(opts, { git: badGit, execute: () => assert.fail('Must not launch') }));
    assert.equal(await readFile(file, 'utf8'), original);
  }
  await assert.rejects(runSuite({ ...opts, effort: 'low' }, { git }), /configuration differs/);
});
test('resume refuses concurrent controller locks', async t => {
  const opts = await blocked(t);
  await mkdir(path.join(opts.repo, '.benchmark-secrets/suites/fixture-suite/controller.lock'));
  await assert.rejects(runSuite(opts, { git, execute: () => assert.fail('Must not launch') }), { code: 'EEXIST' });
});
