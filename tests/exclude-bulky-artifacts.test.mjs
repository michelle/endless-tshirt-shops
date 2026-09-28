import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { findExclusions, GENERATED_DIRECTORIES, SIZE_LIMIT } from '../scripts/exclude-bulky-artifacts.mjs';

// check-ignore needs a real repository, since nested .gitignore files decide
// whether a path would have been staged at all.
async function repo(t, files = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'exclude-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  execFileSync('git', ['-C', dir, 'init', '-q', '-b', 'main']);
  const runId = 'a-run';
  for (const [relative, content] of Object.entries(files)) {
    const full = path.join(dir, 'runs', runId, 'workspace', relative);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return { dir, runId };
}
const paths = list => list.map(entry => entry.path);

test('dependency and build directories are excluded when the agent ignored nothing', async t => {
  const { dir, runId } = await repo(t, {
    'app/page.tsx': 'export default () => null;\n',
    'node_modules/next/index.js': 'module.exports = {};\n',
    '.next/BUILD_ID': 'abc\n',
    'dist/bundle.js': 'console.log(1);\n',
  });
  assert.deepEqual(paths(findExclusions(runId, { cwd: dir })), [
    `runs/${runId}/workspace/.next`,
    `runs/${runId}/workspace/dist`,
    `runs/${runId}/workspace/node_modules`,
  ]);
});

test('the agent source itself is never excluded', async t => {
  const { dir, runId } = await repo(t, {
    'app/page.tsx': 'x\n', 'lib/stripe.ts': 'y\n', 'package.json': '{}\n', 'README.md': 'z\n',
  });
  assert.deepEqual(findExclusions(runId, { cwd: dir }), []);
});

test('a path the agent already ignored is not reported as excluded', async t => {
  // Recording it would claim an exclusion that never happened: git would not
  // have staged the path in the first place.
  const { dir, runId } = await repo(t, {
    '.gitignore': 'node_modules\n',
    'node_modules/next/index.js': 'module.exports = {};\n',
    '.next/BUILD_ID': 'abc\n',
  });
  assert.deepEqual(paths(findExclusions(runId, { cwd: dir })), [`runs/${runId}/workspace/.next`]);
});

test('an oversized file outside the named directories is excluded individually', async t => {
  const { dir, runId } = await repo(t, { 'assets/model.bin': 'x', 'app/page.tsx': 'y\n' });
  const big = path.join(dir, 'runs', runId, 'workspace', 'assets', 'model.bin');
  await writeFile(big, Buffer.alloc(2048));
  const found = findExclusions(runId, { cwd: dir, limit: 1024 });
  assert.deepEqual(paths(found), [`runs/${runId}/workspace/assets/model.bin`]);
  assert.match(found[0].reason, /publication limit/);
});

test('a file under the limit publishes normally', async t => {
  const { dir, runId } = await repo(t, { 'assets/art.png': 'small' });
  assert.deepEqual(findExclusions(runId, { cwd: dir, limit: 1024 }), []);
});

test('the size limit stays under the hard GitHub rejection threshold', () => {
  // The whole point is to drop the file before the push, not after it: GitHub
  // rejects a blob over 100 MB, which is what blocked minimax-m3.
  assert.ok(SIZE_LIMIT < 100 * 1024 * 1024);
  assert.ok(GENERATED_DIRECTORIES.includes('node_modules') && GENERATED_DIRECTORIES.includes('.next'));
});

test('a missing workspace yields no exclusions rather than throwing', async t => {
  const { dir } = await repo(t, {});
  assert.deepEqual(findExclusions('absent-run', { cwd: dir }), []);
});
