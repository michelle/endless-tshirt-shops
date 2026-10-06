#!/usr/bin/env node
// Deploys Dayprint to Vercel and wires the Stripe webhook to the resulting URL.
//
//   node scripts/deploy.mjs            # anonymous "temporary" deployment (no Vercel login needed)
//   node scripts/deploy.mjs --prod     # production deployment on a linked, logged-in Vercel project
//   node scripts/deploy.mjs --fresh    # forget the previous anonymous deployment and create a new one
//
// Reads secrets from .env (or the environment). Steps:
//   1. deploy with all runtime env vars
//   2. create (or reuse) a Stripe webhook endpoint for <url>/api/stripe-webhook
//   3. if the webhook secret is new, redeploy with STRIPE_WEBHOOK_SECRET set
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';

const args = new Set(process.argv.slice(2));
const env = {};
if (existsSync('.env')) for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}
for (const k of ['STRIPE_SECRET_KEY', 'PRODIGI_API_KEY', 'ART_SIGNING_SECRET', 'PRODIGI_API_BASE', 'PRICE_CENTS', 'SHIPPING_CENTS', 'STRIPE_WEBHOOK_SECRET', 'PUBLIC_BASE_URL']) {
  if (process.env[k]) env[k] = process.env[k];
}
for (const k of ['STRIPE_SECRET_KEY', 'PRODIGI_API_KEY', 'ART_SIGNING_SECRET']) if (!env[k]) { console.error(`missing ${k}`); process.exit(1); }

const vercel = process.env.VERCEL_BIN || (() => { try { execFileSync('vercel', ['--version'], { stdio: 'ignore' }); return 'vercel'; } catch { return 'vc'; } })();
const temporary = !args.has('--prod');
if (args.has('--fresh')) {
  // Start a brand-new anonymous deployment (new URL, new 60-minute window). Anything tied to the
  // old URL must be re-derived rather than carried over from .env.
  if (existsSync('.vercel/anonymous.json')) rmSync('.vercel/anonymous.json');
  delete env.PUBLIC_BASE_URL;
  delete env.STRIPE_WEBHOOK_SECRET;
}

function deploy(extraEnv) {
  // The CLI reuses a prebuilt .vercel/output if one exists, which would ship stale code.
  if (existsSync('.vercel/output')) rmSync('.vercel/output', { recursive: true, force: true });
  const flags = ['deploy', '-y', ...(temporary ? ['--temporary'] : ['--prod'])];
  const runtimeEnv = { ...env, ...extraEnv };
  for (const [k, v] of Object.entries(runtimeEnv)) if (v) flags.push('-e', `${k}=${v}`);
  // Do not leak secrets into the log; only show the command skeleton.
  console.log(`> ${vercel} ${flags.filter((f, i) => !(flags[i - 1] === '-e')).join(' ')}`);
  const out = execFileSync(vercel, flags, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600000 });
  const json = (() => { try { return JSON.parse(out.slice(out.indexOf('{'))); } catch { return null; } })();
  const url = json?.url || json?.deployment?.url || (out.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/) || [])[0];
  if (!url) { console.error(out); throw new Error('could not find deployment URL in vercel output'); }
  return { url: url.startsWith('http') ? url : `https://${url}`, claimUrl: json?.claimUrl || json?.deployment?.claimUrl || (out.match(/https:\/\/vercel\.com\/claim-deployment\?code=[a-f0-9-]+/) || [])[0], expiresAt: json?.expiresAt || json?.deployment?.expiresAt };
}

async function stripeFetch(path, body) {
  const r = await fetch(`https://api.stripe.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Basic ${Buffer.from(env.STRIPE_SECRET_KEY + ':').toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body ? new URLSearchParams(body) : undefined,
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j;
}

const first = deploy({});
console.log(`deployed: ${first.url}`);
const hookUrl = `${first.url}/api/stripe-webhook`;

const state = existsSync('.secrets/webhooks.json') ? JSON.parse(readFileSync('.secrets/webhooks.json', 'utf8')) : {};
let secret = state[hookUrl]?.secret;
if (!secret) {
  const existing = (await stripeFetch('/webhook_endpoints?limit=100')).data.find((w) => w.url === hookUrl);
  if (existing) {
    // Secrets are only returned at creation time; rotate by recreating.
    await fetch(`https://api.stripe.com/v1/webhook_endpoints/${existing.id}`, { method: 'DELETE', headers: { Authorization: `Basic ${Buffer.from(env.STRIPE_SECRET_KEY + ':').toString('base64')}` } });
  }
  const created = await stripeFetch('/webhook_endpoints', {
    url: hookUrl,
    'enabled_events[0]': 'checkout.session.completed',
    'enabled_events[1]': 'checkout.session.async_payment_succeeded',
    'enabled_events[2]': 'checkout.session.async_payment_failed',
    description: 'Dayprint fulfilment',
  });
  secret = created.secret;
  state[hookUrl] = { id: created.id, secret, created: new Date().toISOString() };
  try { writeFileSync('.secrets/webhooks.json', JSON.stringify(state, null, 2)); } catch {}
  console.log(`stripe webhook created: ${created.id} -> ${hookUrl}`);
  // Remove endpoints we created for earlier temporary URLs; those deployments have expired.
  for (const [url, info] of Object.entries(state)) {
    if (url === hookUrl || !/temporary-[a-z0-9-]+\.vercel\.app/.test(url)) continue;
    await fetch(`https://api.stripe.com/v1/webhook_endpoints/${info.id}`, { method: 'DELETE', headers: { Authorization: `Basic ${Buffer.from(env.STRIPE_SECRET_KEY + ':').toString('base64')}` } }).catch(() => {});
    delete state[url];
    console.log(`stripe webhook removed (expired deployment): ${info.id}`);
  }
  try { writeFileSync('.secrets/webhooks.json', JSON.stringify(state, null, 2)); } catch {}
} else {
  console.log(`stripe webhook reused: ${state[hookUrl].id}`);
}

let final = first;
if (env.STRIPE_WEBHOOK_SECRET !== secret) {
  final = deploy({ STRIPE_WEBHOOK_SECRET: secret, PUBLIC_BASE_URL: first.url });
  if (final.url !== first.url) console.warn(`warning: URL changed on redeploy (${first.url} -> ${final.url}); re-run to re-point the webhook`);
}

if (existsSync('.env')) {
  let dotenv = readFileSync('.env', 'utf8');
  const set = (k, v) => { dotenv = new RegExp(`^${k}=.*$`, 'm').test(dotenv) ? dotenv.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`) : dotenv + `\n${k}=${v}`; };
  set('STRIPE_WEBHOOK_SECRET', secret);
  set('PUBLIC_BASE_URL', final.url);
  writeFileSync('.env', dotenv);
}

console.log('\n==================== Dayprint deployed ====================');
console.log(`Store URL:       ${final.url}`);
console.log(`Stripe webhook:  ${hookUrl}`);
if (final.claimUrl) console.log(`Claim URL:       ${final.claimUrl}`);
if (final.expiresAt) console.log(`Expires:         ${new Date(final.expiresAt).toISOString()} (claim it before then to keep it)`);
console.log('============================================================');
