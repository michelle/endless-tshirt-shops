#!/usr/bin/env node
// Replace credentials this run provisioned with a placeholder in the artifacts
// about to be published, preserving the originals privately.
//
//   node scripts/redact-run-secrets.mjs RUN_ID   # prints a JSON redaction list
//
// Agents sometimes persist the payment credentials they were given into their
// workspace. The publication gate refuses to commit those, which blocks the run
// and pauses the suite; dropping the run loses a paid attempt, and the leak is
// itself a finding worth publishing. So the known values are replaced here and
// the fact of the replacement is recorded in metadata.
//
// This redacts ONLY values already known to be credentials: the harness's own
// environment variables and the Stripe profile this run provisioned. It does
// not act on check-run-artifacts' structural pattern, which is the net for
// secrets nobody anticipated -- if that still fires after this step, the gate
// blocks publication and a human looks, which is the behaviour we want to keep.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const PLACEHOLDER = 'REDACTED_BUILD_PLACEHOLDER';
// The private raw CLI log is never published (run-benchmark unstages it), so it
// stays byte-exact as evidence rather than being rewritten here.
const SKIP = new Set(['agent.raw.log']);
const ENV_VARIABLES = ['PRODIGI_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET', 'VERCEL_TOKEN'];
// Mirrors the extraction in check-run-artifacts so the two steps agree on what
// counts as a provisioned credential.
const PROFILE_KEY = /^[ \t]*[a-z_]*(?:api_key|pub_key|secret)[ \t]*=[ \t]*'([^']+)'/gm;

export function profileSecrets(text) {
  return [...text.matchAll(PROFILE_KEY)].map(match => match[1]);
}

// Named credentials first, so a value that is both an env var and a profile key
// is reported under the more specific name.
export function knownSecrets({ env = {}, profiles = [] } = {}) {
  const secrets = new Map();
  const add = (value, name) => {
    if (typeof value !== 'string' || value.length < 8 || secrets.has(value)) return;
    secrets.set(value, name);
  };
  for (const variable of ENV_VARIABLES) add(env[variable], variable);
  for (const text of profiles) for (const secret of profileSecrets(text)) add(secret, 'stripe_profile');
  // Longest first: a short secret that is a substring of a longer one must not
  // shadow it and leave the longer value's remainder in the file.
  return [...secrets].sort((a, b) => b[0].length - a[0].length).map(([value, name]) => ({ value, name }));
}

// Text only: a credential pasted into a binary file would not survive a naive
// rewrite, and the gate still refuses to publish it, so a human decides.
export function redactText(text, secrets) {
  const names = new Set();
  let output = text;
  for (const { value, name } of secrets) {
    if (!output.includes(value)) continue;
    output = output.split(value).join(PLACEHOLDER);
    names.add(name);
  }
  return { text: output, credentials: [...names].sort() };
}

function walk(root, base, files = []) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walk(full, base, files);
    else if (entry.isFile() && !SKIP.has(path.relative(base, full))) files.push(full);
  }
  return files;
}

export function redactRun(runId, { env = process.env, cwd = process.cwd() } = {}) {
  const runDir = path.join(cwd, 'runs', runId);
  if (!statSync(runDir).isDirectory()) throw new Error(`${runDir} is not a directory`);
  const profiles = [];
  for (const suffix of ['', '.global', '.wrapper']) {
    const file = path.join(cwd, '.benchmark-secrets', 'stripe', `${runId}${suffix}.toml`);
    try { profiles.push(readFileSync(file, 'utf8')); } catch { /* absent profiles are normal */ }
  }
  const secrets = knownSecrets({ env, profiles });
  const redactions = [];
  if (!secrets.length) return redactions;
  const recoveries = path.join(cwd, '.benchmark-secrets', 'recoveries', runId);
  for (const file of walk(runDir, runDir)) {
    let original;
    // A file that cannot be read as text is left alone; see redactText.
    try { original = readFileSync(file, 'utf8'); } catch { continue; }
    if (original.includes('\u0000')) continue;
    const { text, credentials } = redactText(original, secrets);
    if (text === original) continue;
    const relative = path.relative(runDir, file);
    const preserved = path.join(recoveries, `${relative}.original`);
    mkdirSync(path.dirname(preserved), { recursive: true, mode: 0o700 });
    writeFileSync(preserved, original, { mode: 0o600 });
    writeFileSync(file, text);
    redactions.push({ path: relative, credentials });
  }
  return redactions.sort((a, b) => a.path.localeCompare(b.path));
}

function main() {
  const runId = process.argv[2];
  if (!runId || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runId) || runId.includes('..')) {
    process.stderr.write('error: a valid run ID is required\n');
    process.exit(2);
  }
  let redactions;
  try { redactions = redactRun(runId); }
  catch (error) { process.stderr.write(`error: ${error.message}\n`); process.exit(2); }
  // Never print the value, only where it was found.
  for (const { path: relative } of redactions) process.stderr.write(`note: redacted a provisioned credential from ${relative}\n`);
  process.stdout.write(JSON.stringify(redactions));
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) main();
