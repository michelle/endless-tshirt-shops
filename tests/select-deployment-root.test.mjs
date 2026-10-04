import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { selectDeploymentRoot } from '../scripts/select-deployment-root.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'deployment-root-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('selects a nested app instead of treating public/index.html as another app', async t => {
  const root = await fixture(t);
  const app = path.join(root, 'store');
  await mkdir(path.join(app, 'public'), { recursive: true });
  await writeFile(path.join(app, 'package.json'), JSON.stringify({ scripts: { build: 'next build' }, dependencies: { next: '15.0.0' } }));
  await writeFile(path.join(app, 'vercel.json'), '{}');
  await writeFile(path.join(app, 'public/index.html'), '<h1>fallback</h1>');
  assert.equal(selectDeploymentRoot(root), app);
});

test('prefers a framework application over a repository helper manifest', async t => {
  const root = await fixture(t);
  const app = path.join(root, 'apps', 'shop');
  await mkdir(path.join(app, 'src'), { recursive: true });
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ private: true }));
  await writeFile(path.join(app, 'package.json'), JSON.stringify({ scripts: { build: 'vite build' }, devDependencies: { vite: '8.0.0' } }));
  assert.equal(selectDeploymentRoot(root), app);
});

test('returns null when a failed run produced no deployable artifact', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'notes.txt'), 'unfinished');
  assert.equal(selectDeploymentRoot(root), null);
});
