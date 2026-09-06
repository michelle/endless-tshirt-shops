import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, regular, identifier } from './common.mjs';

export function imageInfo(file) {
  return JSON.parse(execFileSync('python3', [fileURLToPath(new URL('./image-info.py', import.meta.url)), file], { encoding: 'utf8', maxBuffer: 1000000 }));
}
export async function fetchImage(url, allowedHosts, fetcher = fetch) {
  const u = new URL(url);
  if (u.protocol !== 'https:' || u.username || u.password || !allowedHosts.includes(u.hostname)) throw new Error('Artwork host not allowed');
  if (/\/(?:checkout|fulfill(?:ment)?|success|order(?:s|-status)?|webhooks?|stripe)(?:\/|$)/i.test(u.pathname)) throw new Error('Refusing potentially state-changing storefront route');
  const r = await fetcher(u.href, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Artwork HTTP ${r.status}`);
  if (Number(r.headers.get('content-length')) > 40000000) throw new Error('Artwork exceeds size limit');
  const chunks = []; let length = 0;
  for await (const part of r.body) { length += part.length; if (length > 40000000) throw new Error('Artwork exceeds size limit'); chunks.push(Buffer.from(part)); }
  return Buffer.concat(chunks);
}
export async function recoverArtwork({ plan, runs, stripe, prodigi, links, root, fetcher }) {
  const results = []; const seen = new Set();
  for (const selection of plan) {
    identifier(selection.runId);
    const run = runs.find(r => r.run_id === selection.runId);
    if (!run) throw new Error('Artwork selection references unknown run');
    if (!['paid-order', 'hosted-unpaid', 'synthetic', 'direct', 'local'].includes(selection.kind)) throw new Error('Explicit artwork provenance is required');
    const name = selection.name ?? (['synthetic', 'direct'].includes(selection.kind) ? 'submitted' : 'design');
    if (!['design', 'submitted'].includes(name) || seen.has(`${run.run_id}/${name}`)) throw new Error('Duplicate or invalid artwork name');
    seen.add(`${run.run_id}/${name}`);
    const order = prodigi?.orders?.find(o => o.id === selection.orderId);
    const item = order?.items?.[selection.itemIndex ?? 0];
    const asset = item?.assets?.[selection.assetIndex ?? 0];
    const link = links.find(l => l.orderId === selection.orderId);
    if (selection.kind === 'paid-order' && (!asset || link?.linkage !== 'paid-stripe-object-linked' || link.runIds.length !== 1 || link.runIds[0] !== run.run_id)) throw new Error('Paid artwork requires an unambiguous paid Stripe-to-order link');
    if (selection.kind === 'hosted-unpaid') {
      const session = stripe[run.run_id]?.lists?.['checkout/sessions']?.data?.find(s => s.id === selection.sessionId);
      if (!session || session.payment_status !== 'unpaid' || !Object.keys(session.metadata ?? {}).length) throw new Error('Hosted-unpaid selection requires an actual app Session with metadata');
    }
    if (selection.orderId && !asset) throw new Error('Selected Prodigi order asset unavailable');
    const url = asset?.url ?? selection.url;
    if (asset && selection.url && selection.url !== asset.url) throw new Error('Selection URL differs from exact order source');
    const dir = path.join(root, run.run_id); await mkdir(dir, { recursive: true, mode: 0o700 });
    let bytes;
    if (selection.kind === 'local') { await regular(selection.file); bytes = await readFile(selection.file); }
    else {
      const host = run.deployment ? new URL(run.deployment).hostname : null;
      bytes = await fetchImage(url, [host, 'pwintyimages.blob.core.windows.net'].filter(Boolean), fetcher);
    }
    const temporary = path.join(dir, `${name}.original`); await writeFile(temporary, bytes, { mode: 0o600 });
    const info = imageInfo(temporary);
    const extension = { PNG: 'png', JPEG: 'jpg', WEBP: 'webp', GIF: 'gif' }[info.format];
    if (!extension) throw new Error('Unsupported artwork raster format');
    const file = path.join(dir, `${name}.${extension}`); await copyFile(temporary, file);
    let thumbnail = 'not-available';
    if (asset?.thumbnailUrl) {
      try { await writeFile(path.join(dir, `${name}-prodigi-thumbnail`), await fetchImage(asset.thumbnailUrl, ['pwintyimages.blob.core.windows.net'], fetcher), { mode: 0o600 }); thumbnail = 'fetched'; }
      catch { thumbnail = 'unavailable'; }
    }
    results.push({ runId: run.run_id, kind: selection.kind, name, file: `${run.run_id}/${name}.${extension}`, orderId: selection.orderId ?? null,
      sessionId: selection.sessionId ?? null, sourceHost: url ? new URL(url).hostname : null, sha256: hash(bytes), md5: hash(bytes, 'md5'),
      prodigiHashMatches: asset?.md5Hash ? hash(bytes, 'md5') === asset.md5Hash : null, ...info, thumbnail,
      mapping: item ? { sku: item.sku, copies: item.copies, sizing: item.sizing, printArea: asset.printArea, color: item.attributes?.color, size: item.attributes?.size } : null,
      reviewRequired: 'Inspect against a dark/light background and confirm source selection, customer flow, visual quality and physical placement. Paid-object linkage is not automatic checkout proof.' });
  }
  if (results.length) {
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    // A browser proof only: original image files and their full canvases are unchanged.
    const figures = results.map(a => `<figure><figcaption>${escape(a.runId)} — ${escape(a.kind)} — ${a.width}×${a.height}</figcaption><img src="${escape(a.file)}" alt="Original artwork for ${escape(a.runId)}"></figure>`).join('\n');
    await writeFile(path.join(root, 'proof.html'), `<!doctype html><meta charset="utf-8"><title>Artwork transparency proof</title><style>body{font:14px system-ui;margin:20px}figure{margin:20px 0}img{display:block;max-width:500px;max-height:600px;background:var(--proof,#222);object-fit:contain}figcaption{margin-bottom:8px}</style><h1>Original artwork</h1><p>Background <input type="color" value="#222222" aria-label="Proof background" oninput="document.documentElement.style.setProperty('--proof',this.value)"></p><p>Full canvas, scaled only for display. This is not a physical garment-placement mockup.</p>${figures}`, { mode: 0o600 });
  }
  return results;
}
