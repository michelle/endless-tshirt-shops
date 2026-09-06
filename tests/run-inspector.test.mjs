import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { normalize, documentation, docUrl } from '../scripts/run-inspector/transcript.mjs';
import { stripeList, collectProdigi, collectStripe, paymentEvidence } from '../scripts/run-inspector/api.mjs';
import { inspectIsolation, linkOrders } from '../scripts/run-inspector/isolation.mjs';
import { mergeReport, beginMarker, endMarker } from '../scripts/run-inspector/report.mjs';
import { parseArgs, inspect, viewerRuns } from '../scripts/run-inspector/inspect.mjs';
import { fetchImage, recoverArtwork } from '../scripts/run-inspector/artwork.mjs';
const jsonl = values => values.map(v => JSON.stringify(v)).join('\n');
const response = body => new Response(JSON.stringify(body), { status: 200 });
const key = 'test_11111111-1111-1111-1111-111111111111';

test('Codex deduplicates lifecycle events, preserves queries, and separates search from reads', () => {
  const n = normalize(jsonl([
    { type: 'item.started', item: { id: 'a', type: 'web_search', action: { type: 'search', queries: ['stripe checkout alice@example.com', 'prodigi print API'] } } },
    { type: 'item.completed', item: { id: 'a', type: 'web_search' } },
    { type: 'item.completed', item: { id: 'b', type: 'command_execution', command: 'curl https://docs.stripe.com/payments?token=private', aggregated_output: 'sk_test_private Alice Example', exit_code: 0 } },
    { type: 'item.completed', item: { id: 'c', type: 'command_execution', command: 'apply_patch docs https://docs.stripe.com/api', aggregated_output: 'ok', exit_code: 0 } },
    { type: 'turn.completed', usage: { input_tokens: 100, cached_input_tokens: 40, output_tokens: 10 } },
  ]), 'codex');
  assert.equal(n.events.length, 3);
  assert.equal(n.events[0].operation, 'search');
  assert.equal(n.events[1].operation, 'document_request');
  assert.equal(n.events[2].operation, 'other');
  assert.equal(n.usage.new_input_tokens, 60);
  assert.equal(documentation(n.events, n.coverage).stripe.searchQueries, 1);
  assert.equal(documentation(n.events, n.coverage).prodigi.searchQueries, 1);
  assert.equal(documentation(n.events, n.coverage).stripe.documentRequests, 1);
  assert.doesNotMatch(JSON.stringify(n.events), /alice|Alice|sk_test_|token=|curl|apply_patch/);
});

test('Claude captures tool results and terminal answer without exposing raw payloads', () => {
  const n = normalize(jsonl([
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'x', name: 'WebFetch', input: { url: 'https://www.prodigi.com/print-api/docs/' } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'x', content: 'Private response', is_error: true }] } },
    { type: 'assistant', parent_tool_use_id: 'child', message: { content: [{ type: 'tool_use', id: 'x', name: 'Read', input: { file_path: 'node_modules/next/dist/docs/app.md' } }] } },
    { type: 'result', result: 'Final only', usage: { input_tokens: 10, cache_creation_input_tokens: 20, output_tokens: 3 } },
  ]), 'claude');
  assert.equal(n.final, 'Final only');
  assert.equal(n.usage.new_input_tokens, 30);
  assert.deepEqual(n.events.map(e => e.evidence), ['failed_attempt', 'incomplete_attempt']);
  assert.equal(n.events[1].operation, 'local_reference_read');
  assert.doesNotMatch(JSON.stringify(n.events), /Private response|file_path/);
});

test('missing history, malformed/partial captures, and error terminal events remain explicit', () => {
  const old = normalize('{"result":"done","usage":{"input_tokens":1}}', 'claude');
  assert.equal(documentation(old.events, old.coverage).stripe.coverage, 'unknown');
  const partial = normalize('{bad\n' + jsonl([{ type: 'item.started', item: { id: 'x', type: 'command_execution', command: 'curl https://docs.stripe.com/api' } }]), 'codex');
  assert.equal(partial.coverage.malformedLines, 1);
  assert.equal(partial.coverage.terminalEvent, false);
  assert.equal(partial.events[0].evidence, 'incomplete_attempt');
  assert.equal(normalize('{"type":"turn.failed"}', 'codex').failed, true);
  assert.equal(normalize('{"type":"result","is_error":true,"result":"oops"}', 'claude').failed, true);
});

test('document URLs omit credentials, queries, fragments, and untrusted hosts', () => {
  assert.equal(docUrl('https://docs.stripe.com/api?email=private#part'), 'https://docs.stripe.com/api');
  for (const url of ['https://user:pass@docs.stripe.com/api', 'https://evil.example/docs', 'https://github.com/untrusted/repo', 'https://docs.stripe.com/sk_test_private', 'https://docs.stripe.com/%73ecret/value']) assert.equal(docUrl(url), null);
});

test('Stripe GET collection paginates, preserves partial results, and never follows redirects', async () => {
  let count = 0;
  const result = await stripeList('payment_intents', 'rk_test_fixture', { fetcher: async (url, init) => {
    assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'error');
    count++;
    if (count === 1) return response({ data: [{ id: 'pi_one' }], has_more: true });
    assert.equal(new URL(url).searchParams.get('starting_after'), 'pi_one');
    return response({ data: [{ id: 'pi_two' }], has_more: false });
  } });
  assert.equal(count, 2); assert.equal(result.complete, true); assert.equal(result.data.length, 2);
  const partial = await stripeList('events', 'rk_test_fixture', { maxPages: 2, fetcher: async () => response({ data: [{ id: 'evt_repeat' }], has_more: true }) });
  assert.equal(partial.complete, false);
  const denied = await stripeList('events', 'rk_test_fixture', { fetcher: async () => new Response('secret response', { status: 403 }) });
  assert.equal(denied.error, 'HTTP 403'); assert.doesNotMatch(JSON.stringify(denied), /secret response/);
});

test('Prodigi pagination rejects credential exfiltration and missing evidence', async () => {
  let calls = 0;
  const result = await collectProdigi(key, { fetcher: async (url, init) => {
    calls++; assert.equal(new URL(url).origin, 'https://api.sandbox.prodigi.com'); assert.equal(init.method, 'GET');
    return response({ orders: [{ id: 'ord_1' }], hasMore: true, nextUrl: 'https://evil.example/v4.0/orders' });
  } });
  assert.equal(calls, 1); assert.equal(result.complete, false); assert.equal(result.orders.length, 1);
  assert.equal((await collectProdigi('live_bad')).available, false);
  const pages = await collectProdigi(key, { fetcher: async url => response(new URL(url).searchParams.has('page') ? { orders: [], hasMore: false } : { orders: [{ id: 'ord_1' }], hasMore: true, nextUrl: 'https://api.sandbox.prodigi.com/v4.0/orders?page=2' }) });
  assert.equal(pages.complete, true);
});

test('restricted Stripe account identity remains unavailable; public evidence drops customer data', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'inspector-profile-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'profile.toml');
  await writeFile(file, 'test_mode_api_key = "rk_test_fixture"\naccount_id = "acct_profile"\nsandbox_claim_url = "https://private.example/claim"\n');
  const snapshot = await collectStripe(file, { fetcher: async url => url.endsWith('/account') ? new Response('', { status: 403 }) : response({ data: [], has_more: false }) });
  assert.equal(snapshot.accountId, null); assert.equal(snapshot.profileAccountId, 'acct_profile');
  snapshot.lists['checkout/sessions'].data.push({ id: 'cs_test_one', customer_details: { email: 'private@example.com' }, metadata: { secret: 'private' }, client_secret: 'private', collected_information: { shipping_details: { name: 'Private Customer' } } });
  assert.doesNotMatch(JSON.stringify(paymentEvidence(snapshot)), /private|Private|rk_test|acct_profile/);
  await writeFile(file, 'test_mode_api_key = "sk_live_no"');
  assert.equal((await collectStripe(file, { fetcher: () => assert.fail('Live key used') })).available, false);
});

const runs = ['one', 'two'].map(id => ({ run_id: id, suite_id: 'suite', prompt_sha256: 'hash', base_commit: 'base', reasoning_effort: 'high', started_at: '2026-09-06T00:00:00Z', deployment: `https://${id}.vercel.app`, vercel_project: id, stripe_config_path: `${id}.toml` }));
function snapshots() {
  return Object.fromEntries(runs.map(r => [r.run_id, { available: true, accountId: `acct_${r.run_id}`, profileAccountId: `acct_${r.run_id}`, credentialFingerprint: r.run_id,
    lists: Object.fromEntries(['payment_intents', 'checkout/sessions', 'customers', 'events', 'webhook_endpoints'].map(k => [k, { complete: true, data: k === 'webhook_endpoints' ? [{ id: `we_${r.run_id}`, status: 'enabled', url: `${r.deployment}/api/webhook` }] : [] }])) }]));
}
test('isolation detects credential reuse, foreign webhooks, stale objects, and missing coverage', () => {
  const s = snapshots();
  assert.equal(inspectIsolation(runs, s, { complete: true }, []).state, 'pass');
  assert.equal(inspectIsolation(runs, {}, { complete: false }, []).state, 'unknown');
  s.two.credentialFingerprint = 'one';
  s.one.lists.webhook_endpoints.data[0].url = runs[1].deployment;
  s.one.lists.customers.data = [{ id: 'cus_old', created: 1 }];
  const failed = inspectIsolation(runs, s, { complete: true }, []);
  for (const name of ['Stripe credentials', 'webhook destination', 'objects predate run']) assert.equal(failed.checks.find(c => c.name === name).state, 'fail');
  const partial = snapshots(); partial.one.lists.events.complete = false;
  assert.equal(inspectIsolation(runs, partial, { complete: true }, []).checks.find(c => c.name === 'cross-run Stripe objects').state, 'unknown');
});

test('order linkage uses exact Stripe IDs and reports cross-run ownership', () => {
  const s = snapshots();
  s.one.lists['checkout/sessions'].data = [{ id: 'cs_test_abc', payment_status: 'paid' }];
  let links = linkOrders(runs, s, [{ id: 'ord_1', merchantReference: 'cs_test_abcd' }]);
  assert.equal(links[0].linkage, 'unattributed');
  s.two.lists.payment_intents.data = [{ id: 'pi_two', status: 'succeeded', metadata: { order: 'ord_1' } }];
  links = linkOrders(runs, s, [{ id: 'ord_1', merchantReference: 'cs_test_abc' }]);
  assert.deepEqual(links[0].runIds, ['one', 'two']);
  assert.equal(inspectIsolation(runs, s, { complete: true }, links).state, 'fail');
});

test('summary refresh preserves human sections and heading permalinks', () => {
  const before = '# Suite\n\n## Human findings\n\nKeep this.\n';
  const once = mergeReport(before, '## Automated inspection evidence\n\nFirst');
  const twice = mergeReport(once, '## Automated inspection evidence\n\nSecond');
  assert.ok(twice.startsWith(before)); assert.doesNotMatch(twice, /First/);
  assert.equal(twice.split(beginMarker).length, 2);
  assert.throws(() => mergeReport(beginMarker, 'bad'), /Malformed/);
  assert.throws(() => mergeReport(`${beginMarker}${endMarker}${endMarker}`, 'bad'), /Malformed/);
});

test('CLI rejects ambiguous snapshots and unsafe suite identifiers', () => {
  assert.equal(parseArgs(['--suite', 'suite']).live, false);
  for (const args of [['--suite', '../x'], ['--suite', 'suite', '--live', '--snapshot', 'x'], ['--suite', 'suite', '--expected-runs', '0']]) assert.throws(() => parseArgs(args));
});

test('artwork requests reject untrusted hosts and checkout side-effect routes', async () => {
  for (const url of ['https://evil.example/design.png', 'https://one.vercel.app/api/checkout', 'https://one.vercel.app/api/orders/status']) await assert.rejects(fetchImage(url, ['one.vercel.app'], () => assert.fail('Unsafe fetch')));
});

test('local artwork recovery preserves exact canvas bytes and requires provenance', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'inspector-art-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'pixel.png');
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=', 'base64');
  await writeFile(file, bytes);
  const args = { runs, stripe: {}, prodigi: { orders: [] }, links: [], root: path.join(dir, 'out') };
  const [art] = await recoverArtwork({ ...args, plan: [{ runId: 'one', kind: 'local', file }] });
  assert.equal(art.width, 1); assert.equal(art.height, 1); assert.equal(art.nontransparentPixels, 0);
  assert.deepEqual(await readFile(path.join(args.root, art.file)), bytes);
  assert.match(await readFile(path.join(args.root, 'proof.html'), 'utf8'), /type="color"/);
  await assert.rejects(recoverArtwork({ ...args, plan: [{ runId: 'one', kind: 'paid-order', orderId: 'ord_1' }] }), /unambiguous/);
});

test('viewer staging uses existing short model IDs without conflating retries', () => {
  const run = { id: 'suite-codex-sol', model: 'gpt-5.6-sol', deployment: 'https://sol.vercel.app' };
  assert.equal(viewerRuns([run], 'suite')[0].id, 'sol');
  assert.equal(viewerRuns([run], 'suite')[0].finalOutput, '/suites/suite/runs/suite-codex-sol/final.md');
  assert.deepEqual(viewerRuns([run, { ...run, id: 'suite-codex-sol-retry' }], 'suite').map(r => r.id), ['suite-codex-sol', 'suite-codex-sol-retry']);
});

test('end-to-end offline inspector pins artifacts, excludes symlinks, and refreshes only its summary block', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'inspector-suite-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const repo = path.join(dir, 'repo'); await mkdir(repo);
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.com');
  const id = 'suite-codex-sol', artifact = path.join(repo, 'runs', id); await mkdir(path.join(artifact, 'workspace'), { recursive: true });
  await writeFile(path.join(artifact, 'metadata.json'), JSON.stringify({ ...runs[0], suite_id: 'suite', run_id: id, adapter: 'codex', model: 'gpt-5.6-sol', status: 'succeeded', deployment_url: 'https://one.vercel.app' }));
  await writeFile(path.join(artifact, 'final.md'), 'Done');
  await writeFile(path.join(artifact, 'agent.log'), '{"type":"turn.completed","usage":{"input_tokens":1}}');
  await writeFile(path.join(artifact, 'workspace', 'app.js'), 'const session = {}; console.log(session.shipping_details);');
  await symlink('/etc/passwd', path.join(artifact, 'workspace', 'outside'));
  git('add', '.'); git('commit', '-qm', 'Fixture');
  const summary = path.join(dir, 'summary.md'); await writeFile(summary, '# Human summary\n\n## Keep this heading\n');
  const output = path.join(dir, 'inspection');
  const result = await inspect({ repo, ref: 'HEAD', suite: 'suite', expectedRuns: 1, output, summary });
  assert.equal(result.runs, 1); assert.equal(result.isolation, 'unknown');
  const report = JSON.parse(await readFile(path.join(output, 'inspection.json')));
  assert.equal(report.artifactCommit, git('rev-parse', 'HEAD'));
  assert.equal(report.runs[0].source.reviewCues[0].kind, 'legacy-shipping-read');
  await assert.rejects(readFile(path.join(output, 'artifacts', 'runs', id, 'workspace', 'outside')), { code: 'ENOENT' });
  assert.match(await readFile(summary, 'utf8'), /^# Human summary\n\n## Keep this heading/);
  await assert.rejects(inspect({ repo, ref: 'HEAD', suite: 'suite', output }), { code: 'EEXIST' });
});
