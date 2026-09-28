#!/usr/bin/env node
// Probe the real provider CLIs before a suite launches. The unit tests run
// against fake CLIs, so they cannot catch a renamed flag, a binary missing
// from PATH, a model alias the provider has retired or a region the account
// cannot reach — every one of which wastes a run, or twelve.
//
//   node scripts/preflight-clis.mjs                 # resolve + list models
//   node scripts/preflight-clis.mjs --route         # also spend one tiny
//                                                   # completion per alias
//
// --route is the only mode that costs money. It sends a two-word prompt with
// no tools, which is cheap next to an hour-long benchmark run, and is the only
// way to learn whether an alias routes and whether its variant exists.
import { spawn } from 'node:child_process';
import { models } from './run-suite.mjs';

const route = process.argv.includes('--route');
// `list` names a command that prints the aliases the CLI can actually reach,
// and `aliases` reads them out of its stdout. Codex and Claude expose no such
// command, so their aliases can only be checked by --route.
const adapters = {
  codex: { probe: ['--version'] },
  claude: { probe: ['--version'] },
  kimi: { probe: ['--version'], list: ['provider', 'list', '--json'], aliases: out => Object.keys(JSON.parse(out).models ?? {}) },
  opencode: { probe: ['--version'], list: ['models'], aliases: out => out.split('\n').map(l => l.trim()).filter(Boolean) },
};

function exec(command, args, { timeout = 120_000 } = {}) {
  return new Promise(resolve => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timer = setTimeout(() => { child.kill('SIGKILL'); }, timeout);
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', error => { clearTimeout(timer); resolve({ code: null, stdout, stderr: String(error.message) }); });
    child.on('close', code => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}

// A routing probe must answer without reaching for a tool, so a refusal or an
// unavailable variant surfaces as the provider's own error rather than a
// timeout. Each adapter's flags mirror scripts/run-agent.mjs exactly; if these
// drift apart the preflight stops being evidence about the real launch.
function routeArgs(adapter, model) {
  const prompt = 'Reply with exactly: OK';
  if (adapter === 'kimi') return ['--output-format', 'stream-json', '-m', model, '-p', prompt];
  if (adapter === 'opencode') return ['run', '--auto', '--format', 'json', '-m', model, prompt];
  if (adapter === 'claude') return ['--print', '--output-format', 'stream-json', '--verbose', '--model', model, prompt];
  return ['exec', '--skip-git-repo-check', '--ephemeral', '--color', 'never', '--json', '--model', model, prompt];
}

// Providers report a bad alias, an absent variant and a blocked region as
// ordinary stream events, not as a non-zero exit, so the stream is searched
// for an error payload as well.
function routeFailure({ code, stdout, stderr }) {
  for (const line of stdout.split('\n')) {
    if (!line.trim().startsWith('{')) continue;
    let event; try { event = JSON.parse(line); } catch { continue; }
    const error = event.error ?? (event.type === 'error' ? event : null);
    if (error) return error.message ?? error.type ?? 'stream error';
  }
  if (code !== 0) return (stderr.trim() || stdout.trim() || `exit ${code}`).split('\n')[0].slice(0, 160);
  return null;
}

const failures = [];
const resolved = new Map();
for (const adapter of Object.keys(adapters)) {
  const version = await exec(adapter, adapters[adapter].probe, { timeout: 30_000 });
  if (version.code !== 0) {
    failures.push(`${adapter}: not runnable on PATH (${version.stderr.trim().split('\n')[0] || `exit ${version.code}`})`);
    console.log(`${adapter.padEnd(9)} MISSING`);
    continue;
  }
  resolved.set(adapter, true);
  console.log(`${adapter.padEnd(9)} ${version.stdout.trim().split('\n')[0] || 'ok'}`);
  if (!adapters[adapter].list) continue;
  const listing = await exec(adapter, adapters[adapter].list, { timeout: 60_000 });
  // A listing that cannot be read, or that comes back empty, leaves the
  // catalogue unset, which downgrades its aliases to unverified rather than
  // reporting them as absent. `opencode models` has been observed exiting 0
  // with no output while every alias still routed: trusting that as authority
  // would fail a whole roster that works.
  if (listing.code === 0) try {
    const aliases = adapters[adapter].aliases(listing.stdout);
    if (aliases.length) resolved.set(`${adapter}:models`, new Set(aliases));
    else console.log(`${''.padEnd(9)} (${adapter} listed no models; aliases fall back to --route)`);
  } catch { /* see above */ }
}

console.log('');
for (const [adapter, model] of models) {
  const label = `${adapter}/${model}`.padEnd(40);
  if (!resolved.get(adapter)) { console.log(`${label} skipped (CLI missing)`); continue; }
  // A variant suffix is not part of the alias the provider lists, so it is
  // stripped before the listing is consulted and only --route can confirm it.
  const catalogue = resolved.get(`${adapter}:models`);
  const [alias, variant] = model.split('#');
  if (catalogue && !catalogue.has(alias)) {
    failures.push(`${label.trim()}: alias absent from \`${adapter} models\``);
    console.log(`${label} UNLISTED`);
    continue;
  }
  if (!route) {
    const unverified = [catalogue ? null : 'alias', variant ? `variant #${variant}` : null].filter(Boolean);
    console.log(`${label} ${catalogue ? 'listed' : 'no catalogue'}${unverified.length ? ` (${unverified.join(' and ')} unverified)` : ''}`);
    continue;
  }
  const failure = routeFailure(await exec(adapter, routeArgs(adapter, model)));
  if (failure) { failures.push(`${label.trim()}: ${failure}`); console.log(`${label} FAILED  ${failure}`); }
  else console.log(`${label} routes${variant ? ` (#${variant})` : ''}`);
}

if (!process.env.PRODIGI_API_KEY) failures.push('PRODIGI_API_KEY is unset; run-benchmark requires a sandbox key');

console.log('');
if (failures.length) {
  console.error(`${failures.length} preflight failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exitCode = 1;
} else console.log(route ? 'All adapters resolve and every alias routes.' : 'All adapters resolve and every alias is listed. Re-run with --route to verify routing and variants.');
