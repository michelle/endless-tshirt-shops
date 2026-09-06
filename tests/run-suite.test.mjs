import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runSuite, parseArgs, models } from '../scripts/run-suite.mjs';
const git = args => args[0] === 'rev-parse' ? 'base' : args[0] === 'branch' ? 'base-branch' : '';
async function setup(t) {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'suite-controller-')); t.after(() => rm(repo, { recursive: true, force: true }));
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
  await assert.rejects(runSuite(opts, { git: args => { if (args[0] === 'cat-file') throw new Error('Not published'); return git(args); }, execute: async () => { calls++; return { code: 1, signal: null }; } }), /Not published/);
  assert.equal(calls, 1);
  const progress = JSON.parse(await readFile(path.join(opts.repo, '.benchmark-secrets/suites/fixture-suite/progress.json')));
  assert.equal(progress.state, 'blocked'); assert.equal(progress.completed.length, 1);
});
