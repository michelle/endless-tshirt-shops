import { readFile, writeFile } from 'node:fs/promises';
import { safeText } from './transcript.mjs';
const cell = value => safeText(value ?? 'unknown').replace(/[|\r\n]/g, ' ').replace(/</g, '&lt;');
const table = (headers, rows) => `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map(r => `| ${r.map(cell).join(' | ')} |`).join('\n')}\n`;
export function renderReport(report) {
  let md = '## Automated inspection evidence\n\n';
  md += `Snapshot: ${cell(report.inspectedAt)}. Suite: \`${cell(report.suiteId)}\`. Artifact ref: \`${cell(report.artifactCommit)}\`. Inspector: \`${cell(report.inspectorVersion)}\`.\n\n`;
  md += 'This is generated evidence, not a reviewed pass/fail rating. Searches do not prove reading or training-data reliance; paid Stripe objects do not prove the customer checkout flow. Live observations are later snapshots, not historical run-time evidence.\n\n';
  md += '### Run and framework evidence\n\n';
  md += table(['Model', 'Run status', 'Seconds', 'Framework dependencies', 'Runtime files / lines', 'Verification files / lines'], report.runs.map(r => [r.model, r.status, r.durationSeconds,
    r.source.packages.map(p => Object.entries(p.dependencies).map(([k,v]) => `${k}@${v}`).join(', ')).join('; '), `${r.source.runtimeFiles} / ${r.source.runtimeLines}`, `${r.source.verificationFiles} / ${r.source.verificationLines}`]));
  md += '\n### Documentation-use evidence\n\nSearch counts are individual query requests. Reference requests/reads count tool calls, not unique pages. A returned tool result can be an error page or snippet; it is not proof of successful document retrieval. Raw queries, commands and tool outputs remain private.\n\n';
  md += table(['Model', 'Topic', 'Coverage', 'Search queries', 'Document requests', 'Local reference calls', 'Reference results available'], report.runs.flatMap(r => Object.entries(r.documentation).map(([topic,d]) => [r.model, topic, d.coverage, ...[d.searchQueries, d.documentRequests, d.localReferenceReads, d.referenceResults].map(n => d.coverage === 'unknown' ? 'unknown' : n)])));
  md += '\n### Payment and fulfillment observations\n\n';
  md += table(['Model', 'Stripe evidence', 'Sessions / paid', 'PaymentIntents / succeeded', 'Linked Prodigi orders'], report.runs.map(r => [r.model, r.payments.available ? Object.values(r.payments.coverage).every(c => c.complete) ? 'Lists complete' : 'Partial lists' : r.payments.reason,
    r.payments.available ? `${r.payments.sessions.length} / ${r.payments.sessions.filter(s => s.paymentStatus === 'paid').length}` : 'unknown',
    r.payments.available ? `${r.payments.payments.length} / ${r.payments.payments.filter(p => p.status === 'succeeded').length}` : 'unknown',
    report.orders.filter(o => o.runIds.includes(r.id)).map(o => `${o.id}: ${o.linkage}`).join('; ') || 'None observed; check coverage']));
  md += '\n### Isolation evidence\n\nOverall: **' + report.isolation.state + '**. ' + report.isolation.scope + '. The Prodigi sandbox is intentionally shared. Missing evidence never establishes account separation.\n\n';
  md += table(['Check', 'State', 'Runs', 'Evidence'], report.isolation.checks.map(c => [c.name, c.state, c.runIds.join(', '), c.detail]));
  md += '\n### Artwork evidence\n\nNo artwork is reconstructed or executed automatically. Reviewed selections preserve original bytes and canvas. Pixel statistics and a matching hash alone do not establish printable quality.\n\n';
  md += table(['Run', 'Source class', 'Canvas', 'Nontransparent pixels', 'Bounds', 'Prodigi hash match'], report.artwork.map(a => [a.runId, a.kind, `${a.width}×${a.height}`, a.nontransparentPixels, JSON.stringify(a.bounds), a.prodigiHashMatches ?? 'not available']));
  md += '\n### Review required\n\n';
  md += '- Confirm payment-to-app-to-order provenance, variant/SKU mapping, artwork intent and physical print scale.\n- Inspect artwork on dark and light backgrounds and compare fetched Prodigi thumbnails.\n- Review source cues and capture gaps in inspection.json. No source cue is an automatic launch-blocker finding.\n- Review retry/idempotency, paid-state guards, deployment environment configuration and cross-run references.\n- Do not publish private snapshots, transcripts, profile files, signed source URLs or raw customer records.\n';
  if (report.warnings.length) md += '\nWarnings: ' + report.warnings.map(cell).join('; ') + '.\n';
  return md;
}
export const beginMarker = '<!-- run-inspector:v1:start -->';
export const endMarker = '<!-- run-inspector:v1:end -->';
export function mergeReport(existing, generated) {
  const start = existing.indexOf(beginMarker), end = existing.indexOf(endMarker);
  const block = `${beginMarker}\n${generated.trim()}\n${endMarker}`;
  if (start < 0 && end < 0) return existing.trimEnd() + '\n\n' + block + '\n';
  if (start < 0 || end < start || existing.indexOf(beginMarker, start + 1) >= 0 || existing.indexOf(endMarker, end + 1) >= 0) throw new Error('Malformed generated-summary markers; refusing overwrite');
  return existing.slice(0, start) + block + existing.slice(end + endMarker.length);
}
export async function updateSummary(file, generated) {
  const before = await readFile(file, 'utf8');
  await writeFile(file, mergeReport(before, generated));
}
