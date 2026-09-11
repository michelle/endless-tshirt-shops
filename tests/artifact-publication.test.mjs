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
  for (const secret of [`sk_test_${'a'.repeat(24)}`, `rkcs_test_${'b'.repeat(24)}`, `whsec_${'c'.repeat(24)}`, `sk_test_${'z'.repeat(24)}`, 'pi_fixture_secret_value', 'test_11111111-1111-1111-1111-111111111111', 'arbitrary-injected-provider-key']) {
    await writeFile(file, original + secret); git('add', '.');
    const denied = check({ PRODIGI_API_KEY: 'arbitrary-injected-provider-key' });
    assert.notEqual(denied.status, 0, `Secret fixture was not rejected: ${secret}`); assert.match(denied.stderr, /secret.*refusing/); assert.ok(!denied.stderr.includes(secret));
  }
  const outside = spawnSync('bash', [gate, 'fixture'], { cwd: os.tmpdir(), encoding: 'utf8' });
  assert.notEqual(outside.status, 0); assert.match(outside.stderr, /scan failed/);
});

// The 24-character cases are the floor's boundary, chosen because Stripe's own
// published sample key carries exactly 24 characters after its prefix. That
// literal is deliberately not reproduced here: push protection rejects it, and
// a constructed value of the same length exercises the identical edge.
test('placeholder keys pass anywhere; credential-length and provisioned ones never do', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'artifact-gate-ws-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
  git('init', '-q');
  await mkdir(path.join(dir, 'runs/fixture/workspace/tests'), { recursive: true });
  await mkdir(path.join(dir, '.benchmark-secrets/stripe'), { recursive: true });
  const wsSrc = path.join(dir, 'runs/fixture/workspace/tests/commerce.test.ts');
  const report = path.join(dir, 'runs/fixture/final.md');
  const check = () => spawnSync('bash', [gate, 'fixture'], { cwd: dir, encoding: 'utf8' });
  const stage = async body => { await writeFile(wsSrc, body); git('add', '.'); };

  // Placeholders are normal in generated source AND in the completion report's
  // setup instructions. Neither may fail a paid run closed.
  for (const placeholder of ['sk_test_not_real', 'whsec_test_only', 'pk_test_dummy', 'sk_test_xxx']) {
    await stage(`process.env.K = '${placeholder}';\n`);
    assert.equal(check().status, 0, `placeholder rejected in workspace: ${placeholder}`);
    await writeFile(report, `Run \`./enable-stripe.sh ${placeholder} whsec_xxx\` to switch.\n`); git('add', '.');
    assert.equal(check().status, 0, `placeholder rejected in report: ${placeholder}`);
    await rm(report); git('add', '.');
  }
  // Credential-length values are still refused wherever they appear.
  for (const real of [`sk_test_51${'A'.repeat(97)}`, `rkcs_test_51${'B'.repeat(95)}`, `whsec_${'C'.repeat(32)}`, `sk_test_${'z'.repeat(24)}`]) {
    await stage(`process.env.K = '${real}';\n`);
    const denied = check();
    assert.notEqual(denied.status, 0, `credential-length key admitted: ${real.slice(0, 12)}`);
    assert.ok(!denied.stderr.includes(real));
    await writeFile(report, `key ${real}\n`); git('add', '.');
    assert.notEqual(check().status, 0, `credential-length key admitted in report: ${real.slice(0, 12)}`);
    await rm(report); git('add', '.');
  }
  // A key this run actually provisioned is refused by value, whatever its shape.
  await writeFile(path.join(dir, '.benchmark-secrets/stripe/fixture.toml'),
    "[default]\ntest_mode_api_key = 'rkcs_test_shortbutreal'\n");
  await stage("process.env.K = 'rkcs_test_shortbutreal';\n");
  const provisioned = check();
  assert.notEqual(provisioned.status, 0, 'provisioned key was not matched by value');
  assert.ok(!provisioned.stderr.includes('rkcs_test_shortbutreal'));
});
