#!/usr/bin/env node
import { mkdir, readFile, writeFile, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { git, identifier, json, save } from './common.mjs';
import { extractSuite, inspectSource } from './artifacts.mjs';
import { normalize, documentation } from './transcript.mjs';
import { collectStripe, collectProdigi, paymentEvidence, orderEvidence } from './api.mjs';
import { inspectIsolation, linkOrders } from './isolation.mjs';
import { recoverArtwork } from './artwork.mjs';
import { renderReport, updateSummary } from './report.mjs';

export const inspectorVersion = '1.0.0';
export function viewerRuns(runs, suiteId) {
  const modelIds = { 'gpt-6-astra': 'astra', 'gpt-5.6-sol': 'sol', 'gpt-5.6-terra': 'terra', 'gpt-5.6-luna': 'luna', 'claude-fable-5-1': 'fable', 'claude-opus-5': 'opus', 'claude-sonnet-5': 'sonnet' };
  return runs.filter(r => r.deployment).map(r => ({ id: runs.filter(other => other.model === r.model).length === 1 ? modelIds[r.model] ?? r.id : r.id,
    benchmarkRunId: r.id, deployment: r.deployment, finalOutput: `/suites/${suiteId}/runs/${r.id}/final.md` }));
}
export function parseArgs(args) {
  const opts = { ref: 'origin/benchmark-results', live: false, capture: false };
  const names = { '--suite': 'suite', '--repo': 'repo', '--ref': 'ref', '--output': 'output', '--profiles': 'profiles', '--snapshot': 'snapshot', '--artwork': 'artwork', '--update-summary': 'summary', '--expected-runs': 'expectedRuns' };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--live') opts.live = true;
    else if (arg === '--capture') opts.capture = true;
    else if (names[arg]) { if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${arg}`); opts[names[arg]] = args[++i]; }
    else throw new Error(`Unknown option: ${arg}`);
  }
  identifier(opts.suite);
  if (opts.live && opts.snapshot) throw new Error('Choose --live or --snapshot, not both');
  if (opts.expectedRuns && !/^[1-9]\d*$/.test(opts.expectedRuns)) throw new Error('Invalid expected run count');
  return opts;
}
export async function inspect(opts) {
  const repo = path.resolve(opts.repo ?? git(process.cwd(), ['rev-parse', '--show-toplevel']).trim());
  const inspectedAt = new Date().toISOString();
  const output = path.resolve(opts.output ?? path.join(repo, '.benchmark-secrets', 'inspections', opts.suite, `${inspectedAt.replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`));
  if (output.split(path.sep).some(p => ['public', '.git', 'out'].includes(p))) throw new Error('Private inspection snapshots must not be placed in a public/build/Git directory');
  await mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
  await mkdir(output, { mode: 0o700 }); // Exclusive snapshot: existing destinations must fail.
  const extracted = await extractSuite(repo, opts.ref, opts.suite, path.join(output, 'artifacts'));
  if (opts.expectedRuns && extracted.runs.length !== Number(opts.expectedRuns)) throw new Error('Suite run count does not match --expected-runs');
  const source = await inspectSource(path.join(output, 'artifacts'), extracted.runs);
  let snapshot = { schemaVersion: 1, suiteId: opts.suite, observedAt: inspectedAt, runs: {}, prodigi: { available: false, complete: false, orders: [] } };
  if (opts.snapshot) {
    snapshot = await json(path.resolve(opts.snapshot));
    if (snapshot?.schemaVersion !== 1 || snapshot.suiteId !== opts.suite || !snapshot.runs || !snapshot.prodigi) throw new Error('Snapshot schema/suite mismatch');
    if (!Number.isFinite(Date.parse(snapshot.observedAt)) || !Array.isArray(snapshot.prodigi.orders) || typeof snapshot.runs !== 'object' || Array.isArray(snapshot.runs)) throw new Error('Malformed snapshot coverage');
    for (const run of Object.values(snapshot.runs)) {
      if (!run || typeof run !== 'object' || Object.values(run.lists ?? {}).some(list => !list || !Array.isArray(list.data) || typeof list.complete !== 'boolean')) throw new Error('Malformed Stripe snapshot lists');
    }
    if (Object.keys(snapshot.runs).some(id => !extracted.runs.some(r => r.run_id === id))) throw new Error('Snapshot contains another suite/run');
  } else if (opts.live) {
    for (const run of extracted.runs) snapshot.runs[run.run_id] = await collectStripe(path.join(path.resolve(opts.profiles ?? path.join(repo, '.benchmark-secrets/stripe')), `${run.run_id}.toml`));
    snapshot.prodigi = await collectProdigi(process.env.PRODIGI_API_KEY, { createdFrom: extracted.runs[0].started_at });
  }
  await save(path.join(output, 'private-snapshot.json'), snapshot);
  const links = linkOrders(extracted.runs, snapshot.runs, snapshot.prodigi.orders ?? []);
  const isolation = inspectIsolation(extracted.runs, snapshot.runs, snapshot.prodigi, links, source.crossReferences);
  if (extracted.skipped.length || Object.values(source.results).some(s => !s.runtimeFiles)) {
    isolation.checks.push({ name: 'source coverage', state: 'unknown', detail: 'Some artifacts were excluded or runtime files unavailable', runIds: [] });
    if (isolation.state !== 'fail') isolation.state = 'unknown';
  }
  const warnings = [];
  if (!opts.live && !opts.snapshot) warnings.push('Offline source/transcript inspection only; payment/account evidence not collected');
  if (!snapshot.prodigi.complete) warnings.push('Prodigi enumeration missing or incomplete; no-order observations are not definitive');
  if (extracted.skipped.length) warnings.push('Non-regular artifact entries excluded');
  const runs = [];
  for (const run of extracted.runs) {
    const root = path.join(output, 'artifacts/runs', run.run_id);
    let normalized;
    const coverage = await json(path.join(root, 'capture.json'));
    if (coverage) {
      const text = await readFile(path.join(root, 'events.jsonl'), 'utf8');
      normalized = { events: text.split('\n').filter(l => l.trim()).map(l => JSON.parse(l)), coverage };
    } else {
      let transcript = ''; try { transcript = await readFile(path.join(root, 'agent.log'), 'utf8'); } catch { warnings.push(`${run.run_id}: transcript unavailable`); }
      normalized = normalize(transcript, run.adapter);
    }
    if (!normalized.coverage.terminalEvent) warnings.push(`${run.run_id}: no terminal transcript event`);
    runs.push({ id: run.run_id, model: run.model, adapter: run.adapter, status: run.status, durationSeconds: run.duration_seconds,
      deployment: run.deployment, artifactCommit: run.artifactCommit, promptSha256: run.prompt_sha256, usage: run.usage,
      capture: normalized.coverage, documentation: documentation(normalized.events, normalized.coverage), toolEvents: normalized.events,
      source: source.results[run.run_id], payments: paymentEvidence(snapshot.runs[run.run_id]) });
  }
  const plan = opts.artwork ? await json(path.resolve(opts.artwork)) : [];
  if (!Array.isArray(plan)) throw new Error('Artwork plan must be an array');
  const artwork = await recoverArtwork({ plan, runs: extracted.runs, stripe: snapshot.runs, prodigi: snapshot.prodigi, links, root: path.join(output, 'artwork') });
  const orders = (snapshot.prodigi.orders ?? []).map(o => orderEvidence(o, links.find(l => l.orderId === o.id))).filter(o => o.runIds.length);
  const report = { schemaVersion: 1, inspectorVersion, suiteId: opts.suite, inspectedAt, externalObservedAt: snapshot.observedAt,
    artifactCommit: extracted.commit, runs, isolation, orders, artwork, warnings, reviewState: 'review_required' };
  await save(path.join(output, 'inspection.json'), report);
  const markdown = renderReport(report);
  await writeFile(path.join(output, 'summary.generated.md'), markdown, { mode: 0o600 });
  if (opts.capture) {
    const captureModule = path.join(repo, 'run_viewer/scripts/capture-storefronts.mjs');
    const playwright = path.join(repo, 'run_viewer/node_modules/playwright/index.mjs');
    await access(playwright);
    const { captureSuite } = await import(pathToFileURL(captureModule));
    const { chromium } = await import(pathToFileURL(playwright));
    const suite = { id: opts.suite, runs: viewerRuns(runs, opts.suite) };
    const stage = path.join(output, 'viewer-stage');
    await save(path.join(stage, 'import-plan.json'), { ...suite, reviewState: 'review_required', summary: `/suites/${opts.suite}/summary.md` });
    for (const r of suite.runs) {
      const dir = path.join(stage, 'public', path.posix.dirname(r.finalOutput)); await mkdir(dir, { recursive: true, mode: 0o700 });
      await copyFile(path.join(output, 'artifacts/runs', r.benchmarkRunId, 'final.md'), path.join(dir, 'final.md'));
      for (const a of artwork.filter(a => a.runId === r.benchmarkRunId)) await copyFile(path.join(output, 'artwork', a.file), path.join(dir, path.basename(a.file)));
    }
    const browser = await chromium.launch({ headless: true, ...(process.env.CAPTURE_BROWSER === 'chrome' ? { channel: 'chrome' } : {}) });
    try {
      if (suite.runs.length) { const captured = await captureSuite({ suite, root: stage, browser, log: () => {} }); if (captured.failureCount) warnings.push('Some storefront captures failed; inspect capture-errors.json'); }
    } finally { await browser.close(); }
    if (suite.runs.length !== runs.length) warnings.push('Runs without deployment URL could not be captured');
    await save(path.join(output, 'inspection.json'), report);
    await writeFile(path.join(output, 'summary.generated.md'), renderReport(report), { mode: 0o600 });
  }
  if (opts.summary) await updateSummary(path.resolve(opts.summary), renderReport(report));
  return { output, runs: runs.length, isolation: isolation.state, reviewState: report.reviewState };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.includes('--help')) console.log('Usage: node scripts/run-inspector/inspect.mjs --suite ID [--repo PATH] [--ref REF] [--output NEW_PRIVATE_DIR] [--live | --snapshot FILE] [--profiles DIR] [--artwork PRIVATE_PLAN.json] [--capture] [--expected-runs 7] [--update-summary FILE]\nOffline by default. Does not execute archived apps, create payments/orders, publish, or assign ratings.');
  else { try { console.log(JSON.stringify(await inspect(parseArgs(process.argv.slice(2))), null, 2)); } catch (error) { console.error(`Inspection failed: ${error.message}`); process.exitCode = 1; } }
}
