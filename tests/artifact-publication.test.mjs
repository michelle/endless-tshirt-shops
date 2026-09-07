import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const gate = path.resolve(import.meta.dirname, '../scripts/check-run-artifacts');
test('archive gate warns on whitespace, preserves bytes, and still blocks secrets', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'artifact-gate-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
  git('init', '-q');
  await mkdir(path.join(dir, 'runs/fixture'), { recursive: true });
  const file = path.join(dir, 'runs/fixture/OFL.txt'), original = 'Vendor license  \r\nKeep unchanged  \r\n';
  await writeFile(file, original); git('add', '.');
  const check = env => spawnSync('bash', [gate, 'fixture'], { cwd: dir, env: { ...process.env, ...env }, encoding: 'utf8' });
  const ok = check(); assert.equal(ok.status, 0, ok.stderr); assert.match(ok.stderr, /warning.*whitespace/);
  assert.equal(await readFile(file, 'utf8'), original);
  for (const secret of ['sk_test_fixture', 'rkcs_test_fixture', 'whsec_fixture', 'pi_fixture_secret_value', 'test_11111111-1111-1111-1111-111111111111', 'arbitrary-injected-provider-key']) {
    await writeFile(file, original + secret); git('add', '.');
    const denied = check({ PRODIGI_API_KEY: 'arbitrary-injected-provider-key' });
    assert.notEqual(denied.status, 0, `Secret fixture was not rejected: ${secret}`); assert.match(denied.stderr, /secret.*refusing/); assert.ok(!denied.stderr.includes(secret));
  }
  const outside = spawnSync('bash', [gate, 'fixture'], { cwd: os.tmpdir(), encoding: 'utf8' });
  assert.notEqual(outside.status, 0); assert.match(outside.stderr, /scan failed/);
});
