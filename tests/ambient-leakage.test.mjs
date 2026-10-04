import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve(import.meta.dirname, '..');

test('concept commitment validator accepts only the exact schema', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'concept-commit-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'concept-commitment.json'), JSON.stringify({
    brand: 'Fixture', productConcept: 'A shirt.', customerCustomization: 'A word.', reason: 'One-off printing.',
  }));
  const valid = spawnSync(process.execPath, [path.join(root, 'scripts/check-concept-commitment.mjs'), dir], { encoding: 'utf8' });
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(JSON.parse(valid.stdout).valid, true);
  await writeFile(path.join(dir, 'concept-commitment.json'), JSON.stringify({ brand: 'Fixture', extra: 'not allowed' }));
  const invalid = spawnSync(process.execPath, [path.join(root, 'scripts/check-concept-commitment.mjs'), dir], { encoding: 'utf8' });
  assert.notEqual(invalid.status, 0);
});

test('ambient audit identifies foreign runs without printing raw commands', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ambient-audit-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const run = path.join(dir, '20261001-current');
  await mkdir(run);
  const event = { event: { command: 'git show benchmark-results:runs/20260928-other/final.md' } };
  await writeFile(path.join(run, 'transcript.jsonl'), `${JSON.stringify(event)}\n`);
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/audit-ambient-leakage.mjs'), dir], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.reports[0].hits[0].foreignRunArtifacts, true);
  assert.equal(result.stdout.includes('git show'), false, 'raw commands must remain private');
});

test('ambient audit does not mistake shared viewer tooling for a foreign run', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ambient-viewer-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const run = path.join(dir, '20261001-current');
  await mkdir(run);
  await writeFile(path.join(run, 'transcript.jsonl'), `${JSON.stringify({ event: { command: 'node run_viewer/test.mjs' } })}\n`);
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/audit-ambient-leakage.mjs'), dir], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).matchingFiles, 0);
});
