import { spawn } from 'node:child_process';
import { openSync, writeSync, closeSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { normalize } from '../run-inspector/transcript.mjs';
const [provider, ...extra] = process.argv.slice(2);
if (!['codex', 'claude'].includes(provider)) throw new Error('Unknown provider');
const env = process.env, directory = env.BENCHMARK_CAPTURE_DIR;
if (!directory) throw new Error('BENCHMARK_CAPTURE_DIR is required');
mkdirSync(directory, { recursive: true, mode: 0o700 });
const target = path.join(directory, 'transcript.jsonl');
const fd = openSync(target, 'wx', 0o600); let sequence = 0;
const prompt = readFileSync(env.BENCHMARK_PROMPT_FILE, 'utf8'), effort = env.BENCHMARK_REASONING_EFFORT;
const args = provider === 'claude'
  ? ['--print', '--dangerously-skip-permissions', '--no-session-persistence', '--output-format', 'stream-json', '--verbose', '--model', env.BENCHMARK_MODEL, ...(effort ? ['--effort', effort] : []), ...extra, prompt]
  : ['exec', '--dangerously-bypass-approvals-and-sandbox', '--skip-git-repo-check', '--ephemeral', '--disable', 'memories', '--disable', 'external_agent_memory_import', '--color', 'never', '--json', '--cd', env.BENCHMARK_WORKSPACE, '--model', env.BENCHMARK_MODEL, '--output-last-message', env.BENCHMARK_FINAL_OUTPUT, ...(effort ? ['--config', `model_reasoning_effort="${effort}"`] : []), ...extra, prompt];
const childEnv = provider === 'claude' ? {
  ...env,
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
  CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1',
} : env;
const child = spawn(provider, args, { cwd: env.BENCHMARK_WORKSPACE, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
const pending = { stdout: '', stderr: '' };
function record(stream, line) {
  let event; try { event = JSON.parse(line); } catch { event = { type: 'diagnostic', text: line }; }
  writeSync(fd, JSON.stringify({ captureVersion: 1, sequence: ++sequence, receivedAt: new Date().toISOString(), stream, event }) + '\n');
  process.stdout.write(line + '\n'); // Parent redirects to a private log.
}
for (const stream of ['stdout', 'stderr']) {
  child[stream].setEncoding('utf8'); child[stream].on('data', data => {
    pending[stream] += data; let newline;
    while ((newline = pending[stream].indexOf('\n')) !== -1) { record(stream, pending[stream].slice(0, newline)); pending[stream] = pending[stream].slice(newline + 1); }
  });
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', () => record('stderr', 'CLI launch failed'));
child.on('close', (code, signal) => {
  for (const stream of ['stdout', 'stderr']) if (pending[stream]) record(stream, pending[stream]);
  closeSync(fd); const result = normalize(readFileSync(target, 'utf8'), provider);
  if (provider === 'claude' && result.final !== null) writeFileSync(env.BENCHMARK_FINAL_OUTPUT, result.final + (result.final.endsWith('\n') ? '' : '\n'), { mode: 0o600 });
  writeFileSync(env.BENCHMARK_USAGE_OUTPUT, JSON.stringify(result.usage, null, 2) + '\n', { mode: 0o600 });
  writeFileSync(path.join(directory, 'exit.json'), JSON.stringify({ code, signal, capturedRecords: sequence }), { mode: 0o600 });
  process.exitCode = code === 0 && (result.failed || (provider === 'claude' && result.final === null)) ? 1 : code ?? 1;
});
