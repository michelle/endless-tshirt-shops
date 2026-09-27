import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { redactRun, knownSecrets, redactText, PLACEHOLDER } from '../scripts/redact-run-secrets.mjs';

// A run's provisioned Stripe keys are 107 characters after the prefix in
// practice; the fixtures keep that shape so they also trip the structural
// pattern in check-run-artifacts, as the real ones do.
const SK = `rkcs_test_${'a'.repeat(97)}`;
const PK = `pk_test_${'b'.repeat(97)}`;
const PRODIGI = 'test_8b27f3d3-80a2-4660-8d5d-f0d5697d0a84';

async function fixture(t, files = {}, profile = null) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'redact-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const runId = 'a-run';
  await mkdir(path.join(dir, 'runs', runId), { recursive: true });
  for (const [relative, content] of Object.entries(files)) {
    const full = path.join(dir, 'runs', runId, relative);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  if (profile) {
    await mkdir(path.join(dir, '.benchmark-secrets', 'stripe'), { recursive: true });
    await writeFile(path.join(dir, '.benchmark-secrets', 'stripe', `${runId}.toml`), profile);
  }
  return { dir, runId };
}
const read = (dir, ...parts) => readFile(path.join(dir, ...parts), 'utf8');

test('a provisioned Stripe key is replaced and the original preserved privately', async t => {
  const { dir, runId } = await fixture(t, {
    'workspace/.stripe_sk': `${SK}\n`,
    'workspace/lib/stripe.ts': `const key = process.env.STRIPE_SECRET_KEY;\n`,
  }, `[default]\n  api_key = '${SK}'\n  pub_key = '${PK}'\n`);

  const redactions = redactRun(runId, { env: {}, cwd: dir });
  assert.deepEqual(redactions, [{ path: 'workspace/.stripe_sk', credentials: ['stripe_profile'] }]);
  // The published copy carries the placeholder and no trace of the key.
  const published = await read(dir, 'runs', runId, 'workspace/.stripe_sk');
  assert.equal(published, `${PLACEHOLDER}\n`);
  assert.ok(!published.includes(SK));
  // The original is kept privately, owner-only, for the audit trail.
  const preserved = path.join(dir, '.benchmark-secrets', 'recoveries', runId, 'workspace/.stripe_sk.original');
  assert.equal(await readFile(preserved, 'utf8'), `${SK}\n`);
  assert.equal((await stat(preserved)).mode & 0o777, 0o600);
  // A file that never held a credential is untouched and unreported.
  assert.match(await read(dir, 'runs', runId, 'workspace/lib/stripe.ts'), /process\.env\.STRIPE_SECRET_KEY/);
});

test('environment credentials are redacted and named in the report', async t => {
  const { dir, runId } = await fixture(t, { 'final.md': `Set PRODIGI_API_KEY=${PRODIGI} to run it.\n` });
  const redactions = redactRun(runId, { env: { PRODIGI_API_KEY: PRODIGI }, cwd: dir });
  assert.deepEqual(redactions, [{ path: 'final.md', credentials: ['PRODIGI_API_KEY'] }]);
  assert.equal(await read(dir, 'runs', runId, 'final.md'), `Set PRODIGI_API_KEY=${PLACEHOLDER} to run it.\n`);
});

test('a runtime-minted credential in the workspace is redacted by shape', async t => {
  // What actually blocked the first suite run: keys from `stripe sandbox create`
  // and a webhook secret from `stripe listen`, in no file the harness wrote.
  const webhook = `whsec_${'e'.repeat(40)}`;
  const sandbox = `sk_test_${'f'.repeat(97)}`;
  const { dir, runId } = await fixture(t, {
    'workspace/.stripe-webhook-secret': `${webhook}\n`,
    'workspace/.stripe-account': `STRIPE_SECRET_KEY=${sandbox}\n`,
  });
  const redactions = redactRun(runId, { env: {}, cwd: dir });
  assert.deepEqual(redactions, [
    { path: 'workspace/.stripe-account', credentials: ['stripe_secret_key'] },
    { path: 'workspace/.stripe-webhook-secret', credentials: ['stripe_webhook_secret'] },
  ]);
  assert.equal(await read(dir, 'runs', runId, 'workspace/.stripe-webhook-secret'), `${PLACEHOLDER}\n`);
  assert.equal(await read(dir, 'runs', runId, 'workspace/.stripe-account'), `STRIPE_SECRET_KEY=${PLACEHOLDER}\n`);
});

test('the agent report is redacted by shape, harness artifacts are not', async t => {
  const key = `rkcs_test_${'g'.repeat(97)}`;
  const { dir, runId } = await fixture(t, {
    'final.md': `I configured ${key} for you.\n`,
    // A payment-shaped value here means the harness leaked it: left for the gate.
    'events.jsonl': `{"tool":"bash","note":"${key}"}\n`,
    'metadata.json': `{"deployment_url":"${key}"}\n`,
  });
  const redactions = redactRun(runId, { env: {}, cwd: dir });
  assert.deepEqual(redactions.map(r => r.path), ['final.md']);
  assert.equal(await read(dir, 'runs', runId, 'final.md'), `I configured ${PLACEHOLDER} for you.\n`);
  // Untouched, so check-run-artifacts still refuses to publish the run.
  assert.match(await read(dir, 'runs', runId, 'events.jsonl'), /rkcs_test_g+/);
  assert.match(await read(dir, 'runs', runId, 'metadata.json'), /rkcs_test_g+/);
});

test('placeholder credentials in generated source survive redaction', async t => {
  // The 24-character floor is what lets docs and tests keep saying sk_test_xxx;
  // rewriting those would corrupt the evidence the benchmark is collecting.
  const { dir, runId } = await fixture(t, {
    'workspace/README.md': 'Run it with sk_test_xxx or sk_test_not_real.\n',
    'workspace/env.example': 'STRIPE_SECRET_KEY=sk_test_123\n',
  });
  assert.deepEqual(redactRun(runId, { env: {}, cwd: dir }), []);
  assert.match(await read(dir, 'runs', runId, 'workspace/README.md'), /sk_test_xxx/);
});

test('a shape match inside a longer identifier is not rewritten', async t => {
  const { dir, runId } = await fixture(t, {
    'workspace/notes.md': `prefixed_sk_test_${'h'.repeat(30)} stays whole\n`,
  });
  assert.deepEqual(redactRun(runId, { env: {}, cwd: dir }), []);
});

test('the private raw CLI log keeps its original bytes', async t => {
  const { dir, runId } = await fixture(t, { 'agent.raw.log': `probed key ${SK}\n`, 'final.md': `report ${SK}\n` });
  const redactions = redactRun(runId, { env: { STRIPE_SECRET_KEY: SK }, cwd: dir });
  assert.deepEqual(redactions.map(r => r.path), ['final.md'], 'the raw log must not be rewritten');
  assert.equal(await read(dir, 'runs', runId, 'agent.raw.log'), `probed key ${SK}\n`);
});

test('a longer secret is not shadowed by a shorter one it contains', async t => {
  const short = 'whsec_' + 'd'.repeat(24);
  const long = `${short}_and_more_tail`;
  const { dir, runId } = await fixture(t, { 'final.md': `${long}\n` });
  redactRun(runId, { env: { STRIPE_WEBHOOK_SECRET: short, STRIPE_SECRET_KEY: long }, cwd: dir });
  // Replacing the short value first would leave "_and_more_tail" behind.
  assert.equal(await read(dir, 'runs', runId, 'final.md'), `${PLACEHOLDER}\n`);
});

test('a binary file is skipped rather than corrupted', async t => {
  const { dir, runId } = await fixture(t, {});
  const full = path.join(dir, 'runs', runId, 'workspace', 'art.png');
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, Buffer.concat([Buffer.from('PNG\u0000'), Buffer.from(SK), Buffer.from([0, 1, 2])]));
  assert.deepEqual(redactRun(runId, { env: { STRIPE_SECRET_KEY: SK }, cwd: dir }), [],
    'a NUL-bearing file is left for the gate to block');
});

test('redaction is idempotent and writes no second recovery copy', async t => {
  const { dir, runId } = await fixture(t, { 'final.md': `key ${SK}\n` });
  assert.equal(redactRun(runId, { env: { STRIPE_SECRET_KEY: SK }, cwd: dir }).length, 1);
  assert.deepEqual(redactRun(runId, { env: { STRIPE_SECRET_KEY: SK }, cwd: dir }), []);
  assert.equal(await read(dir, 'runs', runId, 'final.md'), `key ${PLACEHOLDER}\n`);
});

test('short or absent credential values are ignored', async t => {
  // The gate's own floor: values under 8 characters are too short to be a real
  // credential and matching them would rewrite unrelated text.
  assert.deepEqual(knownSecrets({ env: { PRODIGI_API_KEY: 'short' } }).map(s => s.value), []);
  assert.deepEqual(knownSecrets({ env: { PRODIGI_API_KEY: undefined } }), []);
  assert.deepEqual(redactText('nothing here', []), { text: 'nothing here', credentials: [] });
});

test('a missing run directory is an error, not a silent pass', async t => {
  const { dir } = await fixture(t, {});
  assert.throws(() => redactRun('absent-run', { env: {}, cwd: dir }));
});

test('a second pass never overwrites an original already preserved', async t => {
  // A recovery, or a widened policy, re-runs redaction over files this step has
  // itself rewritten. Preserving again would replace the true original with a
  // redacted copy and destroy the audit trail.
  const env = `PRODIGI=${PRODIGI}\nSTRIPE=${SK}\n`;
  const { dir, runId } = await fixture(t, { 'workspace/.env.local': env });
  redactRun(runId, { env: { PRODIGI_API_KEY: PRODIGI }, cwd: dir });
  const preserved = path.join(dir, '.benchmark-secrets', 'recoveries', runId, 'workspace/.env.local.original');
  assert.equal(await readFile(preserved, 'utf8'), env);
  // A later pass sees a file this step already rewrote. Whatever it finds, the
  // original captured the first time must survive untouched.
  await writeFile(path.join(dir, 'runs', runId, 'workspace/.env.local'), `STRIPE=${PK}\n`);
  const again = redactRun(runId, { env: {}, cwd: dir });
  assert.deepEqual(again.map(r => r.path), ['workspace/.env.local']);
  assert.equal(await readFile(preserved, 'utf8'), env, 'the first-pass original must survive');
  assert.equal(await read(dir, 'runs', runId, 'workspace/.env.local'), `STRIPE=${PLACEHOLDER}\n`);
});
