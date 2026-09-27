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
// Two passes, with deliberately different reach:
//
//   by value  -- the harness's own environment variables and the Stripe profile
//                this run provisioned, replaced anywhere in the run directory.
//   by shape  -- anything matching a payment-credential shape, but only in the
//                artifacts an agent authors (workspace/ and final.md).
//
// The shape pass exists because the credentials that actually leak are minted
// during the run: `stripe sandbox create` issues its own keys and `stripe listen`
// its own webhook secret, so they appear in no file the harness wrote and no
// by-value pass can ever see them.
//
// Restricting the shape pass to agent-authored files is what keeps the gate
// meaningful. A payment-shaped value in metadata.json, events.jsonl or
// capture.json would mean the harness itself leaked one -- a bug, not an agent
// behaviour -- so those are left untouched for check-run-artifacts to block and
// a human to read. The gate is unchanged and still fails closed there.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
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

// Payment credentials an agent obtains at runtime -- a sandbox's own keys, a
// webhook secret from `stripe listen` -- exist in no file the harness wrote, so
// no by-value pass can see them. They are matched by shape instead, using the
// same pattern and the same 24-character floor as check-run-artifacts (tuned so
// placeholders like sk_test_xxx are left alone), and only inside the artifacts an
// agent writes. Everywhere else -- metadata.json, events.jsonl, capture.json --
// a payment-shaped value means the harness itself leaked one, so it is left for
// the gate to block and a human to read.
const PAYMENT_SHAPE = /(?<![A-Za-z0-9_])(?:(?:sk|pk|rkcs|rk)_(?:test|live)_[A-Za-z0-9_=-]{24,}|whsec_[A-Za-z0-9_=-]{24,}|(?:test|live)_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|(?:pi|cs)_[A-Za-z0-9_]+_secret_[A-Za-z0-9_]+)/g;
export function shapeName(token) {
  if (token.startsWith('whsec_')) return 'stripe_webhook_secret';
  if (token.startsWith('rkcs_') || token.startsWith('rk_')) return 'stripe_restricted_key';
  if (token.startsWith('sk_')) return 'stripe_secret_key';
  if (token.startsWith('pk_')) return 'stripe_publishable_key';
  if (token.startsWith('pi_') || token.startsWith('cs_')) return 'stripe_client_secret';
  return 'prodigi_api_key';
}
// Only what an agent itself authors is rewritten by shape.
export function agentAuthored(relative) {
  return relative === 'final.md' || relative === 'workspace' || relative.startsWith(`workspace${path.sep}`);
}
export function redactShapes(text) {
  const names = new Set();
  const output = text.replace(PAYMENT_SHAPE, token => { names.add(shapeName(token)); return PLACEHOLDER; });
  return { text: output, credentials: [...names].sort() };
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
  const recoveries = path.join(cwd, '.benchmark-secrets', 'recoveries', runId);
  for (const file of walk(runDir, runDir)) {
    let original;
    // A file that cannot be read as text is left alone; see redactText.
    try { original = readFileSync(file, 'utf8'); } catch { continue; }
    if (original.includes('\u0000')) continue;
    const relative = path.relative(runDir, file);
    const names = new Set();
    let text = original;
    for (const pass of [() => redactText(text, secrets), () => agentAuthored(relative) ? redactShapes(text) : { text, credentials: [] }]) {
      const result = pass();
      text = result.text;
      for (const name of result.credentials) names.add(name);
    }
    if (text === original) continue;
    const credentials = [...names].sort();
    const preserved = path.join(recoveries, `${relative}.original`);
    mkdirSync(path.dirname(preserved), { recursive: true, mode: 0o700 });
    // Never overwrite an original already on disk. A second pass -- a recovery,
    // or a widened policy -- sees a file this step has itself rewritten, so
    // preserving again would replace the true original with a redacted copy and
    // destroy the audit trail it exists for.
    if (!existsSync(preserved)) writeFileSync(preserved, original, { mode: 0o600 });
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
