import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const root = path.resolve(import.meta.dirname, '..');
async function run(provider, events, t, { exit = 0, final = 'Codex final', tail = '', delay = false } = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'adapter-capture-')); t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'bin'));
  const script = `#!${process.execPath}\nconst fs = require('node:fs');\nconst args = process.argv.slice(2);\nfs.writeFileSync(process.env.ARGUMENTS, JSON.stringify(args));\n${provider === 'codex' ? `fs.writeFileSync(args[args.indexOf('--output-last-message') + 1], ${JSON.stringify(final)});` : ''}\nfor (const event of ${JSON.stringify(events)}) process.stdout.write(JSON.stringify(event) + '\\n');\nprocess.stdout.write(${JSON.stringify(tail)});\n${delay ? 'setTimeout(() => process.exit(0), 30000);' : `process.exitCode = ${exit};`}`;
  await writeFile(path.join(dir, 'bin', provider), script, { mode: 0o700 });
  await writeFile(path.join(dir, 'prompt.md'), 'Fixture prompt');
  const env = { ...process.env, PATH: `${dir}/bin:${process.env.PATH}`, ARGUMENTS: `${dir}/args.json`, BENCHMARK_WORKSPACE: dir, BENCHMARK_PROMPT_FILE: `${dir}/prompt.md`, BENCHMARK_MODEL: 'fake', BENCHMARK_REASONING_EFFORT: 'high', BENCHMARK_FINAL_OUTPUT: `${dir}/final.md`, BENCHMARK_USAGE_OUTPUT: `${dir}/usage.json`, BENCHMARK_CAPTURE_DIR: `${dir}/capture` };
  const child = spawn(process.execPath, [path.join(root, 'scripts/adapters/capture.mjs'), provider], { env });
  let stdout = '', stderr = '';
  child.stdout.on('data', d => { stdout += d; if (delay && stdout.includes('item.started')) child.kill('SIGTERM'); });
  child.stderr.on('data', d => { stderr += d; });
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
  return { dir, env, code, stdout, stderr, capture: (await readFile(`${dir}/capture/transcript.jsonl`, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse) };
}

test('Claude stream capture retains tools privately and writes only terminal result', async t => {
  const r = await run('claude', [
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'WebSearch', input: { query: 'stripe docs private@example.com' } }] } },
    { type: 'result', result: 'Answer ✓', usage: { input_tokens: 4, cache_creation_input_tokens: 5, output_tokens: 2 } },
  ], t);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(await readFile(`${r.dir}/final.md`, 'utf8'), 'Answer ✓\n');
  assert.equal(JSON.parse(await readFile(`${r.dir}/usage.json`)).new_input_tokens, 9);
  assert.equal(r.capture.length, 2); assert.equal(r.capture[0].sequence, 1); assert.ok(r.capture[0].receivedAt);
  assert.equal((await stat(`${r.dir}/capture/transcript.jsonl`)).mode & 0o777, 0o600);
  const args = JSON.parse(await readFile(`${r.dir}/args.json`));
  assert.equal(args[args.indexOf('--output-format') + 1], 'stream-json'); assert.ok(args.includes('--verbose'));
  assert.equal(args[args.indexOf('--effort') + 1], 'high');
});

test('Claude missing or error final returns failure even when CLI exits zero', async t => {
  assert.notEqual((await run('claude', [{ type: 'assistant', message: { content: [] } }], t)).code, 0);
  assert.notEqual((await run('claude', [{ type: 'result', result: 'failed', is_error: true }], t)).code, 0);
});

test('Codex captures final unterminated JSON line and preserves provider exit code', async t => {
  const r = await run('codex', [], t, { exit: 7, tail: JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 20, cached_input_tokens: 8 } }) });
  assert.equal(r.code, 7); assert.equal(r.capture.length, 1);
  assert.equal(JSON.parse(await readFile(`${r.dir}/usage.json`)).new_input_tokens, 12);
  assert.equal(await readFile(`${r.dir}/final.md`, 'utf8'), 'Codex final');
});

test('signal interruption retains partial tool history', async t => {
  const r = await run('codex', [{ type: 'item.started', item: { id: 'x', type: 'web_search', query: 'prodigi docs' } }], t, { delay: true });
  assert.notEqual(r.code, 0); assert.equal(r.capture[0].event.type, 'item.started');
  assert.equal(JSON.parse(await readFile(`${r.dir}/capture/exit.json`)).signal, 'SIGTERM');
});
