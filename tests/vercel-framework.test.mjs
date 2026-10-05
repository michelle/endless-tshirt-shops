import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { vercelFramework } from '../scripts/vercel-framework.mjs';

async function manifest(t, value) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'vercel-framework-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(path.join(directory, 'package.json'), JSON.stringify(value));
  return directory;
}

test('detects Vercel framework presets without treating Sites vinext as Next.js', async t => {
  assert.equal(vercelFramework(await manifest(t, { dependencies: { next: '16.0.0' } })), 'nextjs');
  assert.equal(vercelFramework(await manifest(t, { devDependencies: { vite: '8.0.0' } })), 'vite');
  assert.equal(vercelFramework(await manifest(t, { dependencies: { next: '16.0.0', vinext: '1.0.0' } })), null);
  assert.equal(vercelFramework(await manifest(t, { scripts: { start: 'node server.js' } })), null);
});
