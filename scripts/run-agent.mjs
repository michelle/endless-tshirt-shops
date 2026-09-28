import { spawn } from 'node:child_process';
import { openSync, writeSync, closeSync, mkdirSync, readFileSync, writeFileSync, existsSync, cpSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalize } from './run-inspector/transcript.mjs';

// Launch one provider CLI for one benchmark run, record its raw event stream
// privately, and report a failure the CLI itself may not have reported.
const [provider, ...extra] = process.argv.slice(2);
if (!['codex', 'claude', 'kimi', 'opencode'].includes(provider)) throw new Error(`Unknown provider: ${provider}`);
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
  : provider === 'opencode'
  // `run` never prompts: questions and plan transitions are denied in
  // non-interactive mode and --auto answers permission asks. It has no effort
  // flag; effort is a variant carried in the model alias itself
  // (`provider/model#variant`), so BENCHMARK_MODEL is passed through verbatim
  // and BENCHMARK_REASONING_EFFORT is recorded but never turned into a flag.
  // An alias naming a variant the model does not have fails loudly with
  // provider.no-route rather than running at another effort.
  //
  // --standalone gives the run a private server instead of the background
  // service every other opencode process shares. A shared service is reachable
  // from outside the run -- an unrelated `opencode` command on the machine
  // proved it during a suite -- and a session it drops surfaces only as
  // `aborted: Session interrupted: shutdown`, indistinguishable from the agent
  // giving up. Benchmark runs are supposed to be isolated; this makes the
  // server isolated too.
  ? ['run', '--standalone', '--auto', '--format', 'json', '-m', env.BENCHMARK_MODEL, ...extra, prompt]
  : ['exec', '--dangerously-bypass-approvals-and-sandbox', '--skip-git-repo-check', '--ephemeral', '--disable', 'memories', '--disable', 'external_agent_memory_import', '--color', 'never', '--json', '--cd', env.BENCHMARK_WORKSPACE, '--model', env.BENCHMARK_MODEL, '--output-last-message', env.BENCHMARK_FINAL_OUTPUT, ...(effort ? ['--config', `model_reasoning_effort="${effort}"`] : []), ...extra, prompt];
// Kimi keeps config, credentials, sessions and history in one home directory.
// A fresh home per run replaces memory-disabled flags: nothing carries over
// between runs, and the run's sessions and logs stay inside the private
// capture directory. Auth and provider config are copied from the operator's
// home (KIMI_CODE_HOME when set, else ~/.kimi-code) so the run can log in.
// Sessions, history and logs never travel back; a refreshed OAuth token does,
// for the reason syncKimiAuthBack explains.
const kimiSource = env.KIMI_CODE_HOME ?? path.join(os.homedir(), '.kimi-code');
function kimiHome() {
  const home = path.join(directory, 'kimi-home');
  mkdirSync(home, { recursive: true, mode: 0o700 });
  for (const name of ['config.toml', 'credentials', 'oauth', 'region', 'device_id']) {
    const from = path.join(kimiSource, name), to = path.join(home, name);
    if (!existsSync(from) || existsSync(to)) continue;
    // cpSync copies a file or a directory tree; an absent or unreadable auth
    // piece is left for the CLI to report as a missing login.
    try { cpSync(from, to, { recursive: true }); } catch { /* see above */ }
  }
  return home;
}
// Kimi refreshes its OAuth token mid-run, and the provider rotates the refresh
// token when it does: the copy in the isolated home becomes the only valid one
// and the operator's own login stops working -- which also kills every later
// Kimi run in a suite, since each one copies its credentials from there. So a
// refreshed token is written back. Only a credential carrying a non-empty
// refresh token qualifies: when a refresh fails, the CLI leaves the fields
// empty, and copying that back would break the login this is meant to protect.
export function usableCredential(text) {
  try {
    const value = JSON.parse(text);
    return typeof value?.refresh_token === 'string' && value.refresh_token.length > 0;
  } catch { return false; }
}
function syncKimiAuthBack(home) {
  const from = path.join(home, 'credentials'), to = path.join(kimiSource, 'credentials');
  if (!existsSync(from) || !existsSync(to)) return;
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const source = path.join(from, entry.name), target = path.join(to, entry.name);
    try {
      const refreshed = readFileSync(source, 'utf8');
      if (!usableCredential(refreshed)) continue;
      if (existsSync(target) && readFileSync(target, 'utf8') === refreshed) continue;
      writeFileSync(target, refreshed, { mode: 0o600 });
    } catch { /* a credential we cannot read or replace is left as it was */ }
  }
}
let isolatedKimiHome = null;
const childEnv = provider === 'claude' ? {
  ...env,
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
  CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1',
} : provider === 'kimi' ? {
  ...env,
  KIMI_CODE_HOME: isolatedKimiHome = kimiHome(),
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
  if (isolatedKimiHome) syncKimiAuthBack(isolatedKimiHome);
  writeFileSync(path.join(directory, 'exit.json'), JSON.stringify({ code, signal, capturedRecords: sequence }), { mode: 0o600 });
  // Claude, Kimi and OpenCode deliver their final answer as text in the
  // stream; a zero exit without one means the run produced no report.
  process.exitCode = code === 0 && (result.failed || ((provider === 'claude' || provider === 'kimi' || provider === 'opencode') && result.final === null)) ? 1 : code ?? 1;
});
