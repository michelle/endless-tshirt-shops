import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const root = path.resolve(import.meta.dirname, '..');
async function run(provider, events, t, { exit = 0, final = 'Codex final', tail = '', delay = false, drop = null } = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'run-agent-')); t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'bin'));
  const script = `#!${process.execPath}\nconst fs = require('node:fs');\nconst args = process.argv.slice(2);\nfs.writeFileSync(process.env.ARGUMENTS, JSON.stringify(args));\nfs.writeFileSync(process.env.MEMORY_ENV, JSON.stringify({ auto: process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY, md: process.env.CLAUDE_CODE_DISABLE_CLAUDE_MDS }));\nfs.writeFileSync(process.env.KIMI_ENV_DUMP, JSON.stringify({ home: process.env.KIMI_CODE_HOME, noUpdate: process.env.KIMI_CODE_NO_AUTO_UPDATE }));\n${provider === 'codex' ? `fs.writeFileSync(args[args.indexOf('--output-last-message') + 1], ${JSON.stringify(final)});` : ''}\nfor (const event of ${JSON.stringify(events)}) process.stdout.write(JSON.stringify(event) + '\\n');\nprocess.stdout.write(${JSON.stringify(tail)});\n${delay ? 'setTimeout(() => process.exit(0), 30000);' : `process.exitCode = ${exit};`}`;
  await writeFile(path.join(dir, 'bin', provider), script, { mode: 0o700 });
  await writeFile(path.join(dir, 'prompt.md'), 'Fixture prompt');
  // Kimi runs always get a fixture source home so the test never touches the
  // operator's real ~/.kimi-code; run-agent copies auth pieces from it into
  // the isolated per-run home.
  if (provider === 'kimi') {
    await mkdir(path.join(dir, 'kimi-source', 'credentials'), { recursive: true });
    await writeFile(path.join(dir, 'kimi-source', 'config.toml'), 'fixture config\n');
    await writeFile(path.join(dir, 'kimi-source', 'credentials', 'fixture.json'), '{}');
  }
  const env = { ...process.env, PATH: `${dir}/bin:${process.env.PATH}`, ARGUMENTS: `${dir}/args.json`, MEMORY_ENV: `${dir}/memory-env.json`, KIMI_ENV_DUMP: `${dir}/kimi-env.json`, BENCHMARK_WORKSPACE: dir, BENCHMARK_PROMPT_FILE: `${dir}/prompt.md`, BENCHMARK_MODEL: 'fake', BENCHMARK_REASONING_EFFORT: 'high', BENCHMARK_FINAL_OUTPUT: `${dir}/final.md`, BENCHMARK_USAGE_OUTPUT: `${dir}/usage.json`, BENCHMARK_CAPTURE_DIR: `${dir}/capture`, ...(provider === 'kimi' ? { KIMI_CODE_HOME: `${dir}/kimi-source` } : {}) };
  if (drop) delete env[drop];
  const child = spawn(process.execPath, [path.join(root, 'scripts/run-agent.mjs'), provider], { env });
  let stdout = '', stderr = '';
  child.stdout.on('data', d => { stdout += d; if (delay && stdout.includes('item.started')) child.kill('SIGTERM'); });
  child.stderr.on('data', d => { stderr += d; });
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
  const launched = existsSync(`${dir}/args.json`);
  const capture = launched ? (await readFile(`${dir}/capture/transcript.jsonl`, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse) : [];
  return { dir, env, code, stdout, stderr, launched, capture };
}

test('Claude stream capture retains tools privately and writes only terminal result', async t => {
  const r = await run('claude', [
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'WebSearch', input: { query: 'stripe docs private@example.com' } }] } },
    { type: 'result', result: 'Answer ✓', usage: { input_tokens: 4, cache_creation_input_tokens: 5, output_tokens: 2 } },
  ], t);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.capture.length, 2); assert.equal(r.capture[0].sequence, 1); assert.ok(r.capture[0].receivedAt);
  // finalize-capture.mjs is the sole writer of final.md and usage.json; this
  // step only records the raw stream and the outcome.
  for (const artifact of ['final.md', 'usage.json']) {
    await assert.rejects(readFile(`${r.dir}/${artifact}`), { code: 'ENOENT' }, `run-agent wrote ${artifact}`);
  }
  assert.equal((await stat(`${r.dir}/capture/transcript.jsonl`)).mode & 0o777, 0o600);
  const args = JSON.parse(await readFile(`${r.dir}/args.json`));
  assert.equal(args[args.indexOf('--output-format') + 1], 'stream-json'); assert.ok(args.includes('--verbose'));
  assert.equal(args[args.indexOf('--effort') + 1], 'high');
  assert.deepEqual(JSON.parse(await readFile(`${r.dir}/memory-env.json`, 'utf8')), { auto: '1', md: '1' });
});

test('a missing contract variable fails before the CLI is launched', async t => {
  const r = await run('claude', [{ type: 'result', result: 'ok' }], t, { drop: 'BENCHMARK_MODEL' });
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /BENCHMARK_MODEL is required/);
  assert.equal(r.launched, false, 'the provider CLI must not run without the full contract');
});

test('Claude missing or error final returns failure even when CLI exits zero', async t => {
  assert.notEqual((await run('claude', [{ type: 'assistant', message: { content: [] } }], t)).code, 0);
  assert.notEqual((await run('claude', [{ type: 'result', result: 'failed', is_error: true }], t)).code, 0);
});

test('Codex captures final unterminated JSON line and preserves provider exit code', async t => {
  const r = await run('codex', [], t, { exit: 7, tail: JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 20, cached_input_tokens: 8 } }) });
  assert.equal(r.code, 7); assert.equal(r.capture.length, 1);
  // Codex writes its own final answer through --output-last-message.
  assert.equal(await readFile(`${r.dir}/final.md`, 'utf8'), 'Codex final');
  const args = JSON.parse(await readFile(`${r.dir}/args.json`));
  assert.ok(args.includes('--ephemeral'));
  assert.deepEqual(args.flatMap((arg, index) => arg === '--disable' ? [args[index + 1]] : []), ['memories', 'external_agent_memory_import']);
});

test('Kimi stream-json launch keeps final.md to finalize-capture and isolates its home', async t => {
  const r = await run('kimi', [
    { role: 'assistant', tool_calls: [{ type: 'function', id: 'call_1', function: { name: 'Bash', arguments: '{"command":"ls"}' } }] },
    { role: 'tool', tool_call_id: 'call_1', content: 'listed' },
    { role: 'assistant', content: 'Kimi final ✓' },
  ], t);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.capture.length, 3);
  const args = JSON.parse(await readFile(`${r.dir}/args.json`));
  assert.equal(args[args.indexOf('--output-format') + 1], 'stream-json');
  assert.equal(args[args.indexOf('-m') + 1], 'fake');
  // -p takes the prompt as its value and must stay last.
  assert.equal(args.at(-2), '-p'); assert.equal(args.at(-1), 'Fixture prompt');
  // finalize-capture.mjs is the sole writer of final.md and usage.json.
  for (const artifact of ['final.md', 'usage.json']) {
    await assert.rejects(readFile(`${r.dir}/${artifact}`), { code: 'ENOENT' }, `run-agent wrote ${artifact}`);
  }
  const childEnv = JSON.parse(await readFile(`${r.dir}/kimi-env.json`));
  assert.equal(childEnv.noUpdate, '1');
  assert.ok(childEnv.home.startsWith(`${r.dir}/capture/`), 'the isolated home must live in the private capture dir');
  assert.notEqual(childEnv.home, `${r.dir}/kimi-source`);
  // Auth pieces are copied in so the run can log in...
  assert.equal(await readFile(`${childEnv.home}/config.toml`, 'utf8'), 'fixture config\n');
  assert.equal(await readFile(`${childEnv.home}/credentials/fixture.json`, 'utf8'), '{}');
  // ...but sessions and history never carry over between runs.
  assert.equal(existsSync(`${childEnv.home}/sessions`), false);
});

test('Kimi exit zero without an assistant final answer is a failure', async t => {
  assert.notEqual((await run('kimi', [{ role: 'meta', type: 'system.version', version: '2.1.0' }], t)).code, 0);
  assert.notEqual((await run('kimi', [{ role: 'assistant', content: '' }], t)).code, 0);
});

test('OpenCode json launch maps effort to --variant and keeps final.md to finalize-capture', async t => {
  const r = await run('opencode', [
    { type: 'step_start', part: { type: 'step-start' } },
    { type: 'tool_use', part: { id: 'call_1', type: 'tool', tool: 'bash', state: { status: 'completed', input: { command: 'ls' }, output: 'listed' } } },
    { type: 'step_finish', part: { type: 'step-finish', tokens: { input: 30, output: 5, reasoning: 0, cache: { read: 10, write: 0 } } } },
    { type: 'text', part: { type: 'text', text: 'OpenCode final ✓' } },
  ], t);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.capture.length, 4);
  const args = JSON.parse(await readFile(`${r.dir}/args.json`));
  assert.equal(args[0], 'run');
  assert.ok(args.includes('--auto'));
  assert.equal(args[args.indexOf('--format') + 1], 'json');
  assert.equal(args[args.indexOf('--variant') + 1], 'high');
  assert.equal(args[args.indexOf('-m') + 1], 'fake');
  assert.equal(args.at(-1), 'Fixture prompt');
  // finalize-capture.mjs is the sole writer of final.md and usage.json.
  for (const artifact of ['final.md', 'usage.json']) {
    await assert.rejects(readFile(`${r.dir}/${artifact}`), { code: 'ENOENT' }, `run-agent wrote ${artifact}`);
  }
});

test('OpenCode exit zero without a text part is a failure', async t => {
  assert.notEqual((await run('opencode', [{ type: 'step_start', part: { type: 'step-start' } }], t)).code, 0);
});

test('signal interruption retains partial tool history', async t => {
  const r = await run('codex', [{ type: 'item.started', item: { id: 'x', type: 'web_search', query: 'prodigi docs' } }], t, { delay: true });
  assert.notEqual(r.code, 0); assert.equal(r.capture[0].event.type, 'item.started');
  assert.equal(JSON.parse(await readFile(`${r.dir}/capture/exit.json`)).signal, 'SIGTERM');
});
