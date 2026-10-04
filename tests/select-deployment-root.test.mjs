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

test('prefers a nested static storefront over a generic root package', async t => {
  const root = await fixture(t);
  const app = path.join(root, 'store');
  await mkdir(app, { recursive: true });
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ private: true }));
  await writeFile(path.join(app, 'index.html'), '<h1>shop</h1>');
  assert.equal(selectDeploymentRoot(root), app);
});

test('selects a root static site', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'index.html'), '<h1>shop</h1>');
  assert.equal(selectDeploymentRoot(root), root);
});

test('ignores generated and provider-state decoys', async t => {
  const root = await fixture(t);
  const app = path.join(root, 'web');
  for (const decoy of ['node_modules/pkg', '.vercel/output', '.netlify/cache', 'dist/assets', 'build/static']) {
    await mkdir(path.join(root, decoy), { recursive: true });
    await writeFile(path.join(root, decoy, 'index.html'), '<h1>decoy</h1>');
  }
  await mkdir(app, { recursive: true });
  await writeFile(path.join(app, 'index.html'), '<h1>real</h1>');
  assert.equal(selectDeploymentRoot(root), app);
});

test('finds a conventionally nested app six levels deep', async t => {
  const root = await fixture(t);
  const app = path.join(root, 'one', 'two', 'three', 'four', 'five', 'store');
  await mkdir(path.join(app, 'src'), { recursive: true });
  await writeFile(path.join(app, 'package.json'), JSON.stringify({ scripts: { build: 'vite build' }, devDependencies: { vite: '8.0.0' } }));
  assert.equal(selectDeploymentRoot(root), app);
});

test('malformed package JSON does not hide a static site', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'package.json'), '{ nope');
  await writeFile(path.join(root, 'index.html'), '<h1>shop</h1>');
  assert.equal(selectDeploymentRoot(root), root);
});

test('does not traverse symlinked directories', async t => {
  const root = await fixture(t);
  const outside = await fixture(t);
  await writeFile(path.join(outside, 'index.html'), '<h1>outside</h1>');
  const { symlink } = await import('node:fs/promises');
  await symlink(outside, path.join(root, 'store'));
  assert.equal(selectDeploymentRoot(root), null);
});
