import { spawn } from 'node:child_process';
import { openSync, writeSync, closeSync, mkdirSync, readFileSync, writeFileSync, existsSync, cpSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalize } from './run-inspector/transcript.mjs';

// Launch one provider CLI for one benchmark run, record its raw event stream
// privately, and report a failure the CLI itself may not have reported.
const [provider, ...extra] = process.argv.slice(2);
if (!['codex', 'claude', 'kimi'].includes(provider)) throw new Error(`Unknown provider: ${provider}`);
const env = process.env;
const required = ['BENCHMARK_WORKSPACE', 'BENCHMARK_PROMPT_FILE', 'BENCHMARK_MODEL',
  'BENCHMARK_FINAL_OUTPUT', 'BENCHMARK_USAGE_OUTPUT', 'BENCHMARK_CAPTURE_DIR'];
for (const name of required) if (!env[name]) throw new Error(`${name} is required`);
const directory = env.BENCHMARK_CAPTURE_DIR;
mkdirSync(directory, { recursive: true, mode: 0o700 });
const target = path.join(directory, 'transcript.jsonl');
const fd = openSync(target, 'wx', 0o600); let sequence = 0;
const prompt = readFileSync(env.BENCHMARK_PROMPT_FILE, 'utf8'), effort = env.BENCHMARK_REASONING_EFFORT;
const args = provider === 'claude'
  ? ['--print', '--dangerously-skip-permissions', '--no-session-persistence', '--output-format', 'stream-json', '--verbose', '--model', env.BENCHMARK_MODEL, ...(effort ? ['--effort', effort] : []), ...extra, prompt]
  : provider === 'kimi'
  // -p must stay immediately before the prompt so extra flags cannot be
  // swallowed as the prompt value; in -p mode kimi applies its auto
  // permission policy and never asks for approval.
  ? ['--output-format', 'stream-json', '-m', env.BENCHMARK_MODEL, ...extra, '-p', prompt]
  : ['exec', '--dangerously-bypass-approvals-and-sandbox', '--skip-git-repo-check', '--ephemeral', '--disable', 'memories', '--disable', 'external_agent_memory_import', '--color', 'never', '--json', '--cd', env.BENCHMARK_WORKSPACE, '--model', env.BENCHMARK_MODEL, '--output-last-message', env.BENCHMARK_FINAL_OUTPUT, ...(effort ? ['--config', `model_reasoning_effort="${effort}"`] : []), ...extra, prompt];
// Kimi keeps config, credentials, sessions and history in one home directory.
// A fresh home per run replaces memory-disabled flags: nothing carries over
// between runs, and the run's sessions and logs stay inside the private
// capture directory. Auth and provider config are copied from the operator's
// home (KIMI_CODE_HOME when set, else ~/.kimi-code) so the run can log in;
// a token refresh mid-run can rewrite only the copies, never the real home.
function kimiHome() {
  const home = path.join(directory, 'kimi-home');
  mkdirSync(home, { recursive: true, mode: 0o700 });
  const source = env.KIMI_CODE_HOME ?? path.join(os.homedir(), '.kimi-code');
  for (const name of ['config.toml', 'credentials', 'oauth', 'region', 'device_id']) {
    const from = path.join(source, name), to = path.join(home, name);
    if (!existsSync(from) || existsSync(to)) continue;
    // cpSync copies a file or a directory tree; an absent or unreadable auth
    // piece is left for the CLI to report as a missing login.
    try { cpSync(from, to, { recursive: true }); } catch { /* see above */ }
  }
  return home;
}
const childEnv = provider === 'claude' ? {
  ...env,
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
  CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1',
} : provider === 'kimi' ? {
  ...env,
  KIMI_CODE_HOME: kimiHome(),
  KIMI_CODE_NO_AUTO_UPDATE: '1',
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
  closeSync(fd);
  // Normalized here only to judge the outcome: run-benchmark then calls
  // finalize-capture.mjs, which is the single writer of the run's artifacts.
  const result = normalize(readFileSync(target, 'utf8'), provider);
  writeFileSync(path.join(directory, 'exit.json'), JSON.stringify({ code, signal, capturedRecords: sequence }), { mode: 0o600 });
  // Kimi, like Claude, delivers its final answer as the last assistant text in
  // the stream; a zero exit without one means the run produced no report.
  process.exitCode = code === 0 && (result.failed || ((provider === 'claude' || provider === 'kimi') && result.final === null)) ? 1 : code ?? 1;
});
