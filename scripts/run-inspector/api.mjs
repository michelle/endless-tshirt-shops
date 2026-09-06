import { readFile } from 'node:fs/promises';
import { hash } from './common.mjs';
export const stripeOrigin = 'https://api.stripe.com';
export const prodigiOrigin = 'https://api.sandbox.prodigi.com';
// The collector only knows GET endpoints. Never call storefront success/status routes.
export async function getJson(url, headers, fetcher = fetch) {
  const u = new URL(url);
  if (![stripeOrigin, prodigiOrigin].includes(u.origin) || u.username || u.password) throw new Error('API origin not allowed');
  let response;
  try { response = await fetcher(u.href, { method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(30000) }); }
  catch { return { error: 'Network request failed', httpStatus: null }; }
  if (!response.ok) return { error: `HTTP ${response.status}`, httpStatus: response.status };
  try { return { httpStatus: response.status, body: await response.json() }; }
  catch { return { error: 'Invalid JSON', httpStatus: response.status }; }
}
export async function stripeList(endpoint, key, { fetcher = fetch, maxPages = 100 } = {}) {
  if (!['payment_intents', 'checkout/sessions', 'webhook_endpoints', 'customers', 'events'].includes(endpoint)) throw new Error('Stripe endpoint not allowed');
  const data = []; let cursor;
  for (let page = 0; page < maxPages; page++) {
    const u = new URL(`/v1/${endpoint}`, stripeOrigin); u.searchParams.set('limit', '100'); if (cursor) u.searchParams.set('starting_after', cursor);
    const r = await getJson(u, { Authorization: `Bearer ${key}` }, fetcher);
    if (r.error || !Array.isArray(r.body?.data)) return { data, complete: false, error: r.error ?? 'Missing list data' };
    data.push(...r.body.data);
    if (r.body.has_more === false) return { data, complete: true };
    const next = r.body.data.at(-1)?.id;
    if (!next || next === cursor) return { data, complete: false, error: 'Missing or repeated cursor' };
    cursor = next;
  }
  return { data, complete: false, error: 'Pagination limit reached' };
}
export async function collectStripe(file, options = {}) {
  let config; try { config = await readFile(file, 'utf8'); } catch { return { available: false, reason: 'Saved profile unavailable' }; }
  const field = name => {
    const raw = config.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, 'm'))?.[1]?.trim();
    if (!raw) return null;
    try { return raw.startsWith('"') ? JSON.parse(raw) : raw.startsWith("'") ? raw.slice(1, raw.indexOf("'", 1)) : raw; } catch { return null; }
  };
  const key = field('test_mode_api_key');
  if (!/^(?:sk|rk|rkcs)_test_/.test(key ?? '')) return { available: false, reason: 'No test key in saved profile' };
  const account = await getJson(`${stripeOrigin}/v1/account`, { Authorization: `Bearer ${key}` }, options.fetcher);
  const result = { available: true, accountId: account.body?.id ?? null, profileAccountId: field('account_id'), accountError: account.error ?? null,
    profileFingerprint: hash(config), credentialFingerprint: hash(key), claimAvailable: Boolean(field('sandbox_claim_url')), expiresAt: field('sandbox_expires_at'), lists: {} };
  for (const endpoint of ['payment_intents', 'checkout/sessions', 'webhook_endpoints', 'customers', 'events']) result.lists[endpoint] = await stripeList(endpoint, key, options);
  return result;
}
export async function collectProdigi(key, { fetcher = fetch, maxPages = 100, createdFrom } = {}) {
  if (!/^test_[a-f\d-]{36}$/i.test(key ?? '')) return { available: false, orders: [], complete: false, reason: 'Prodigi test key unavailable' };
  const orders = []; let url = new URL('/v4.0/orders?top=100', prodigiOrigin); const visited = new Set();
  if (createdFrom) url.searchParams.set('createdFrom', createdFrom);
  for (let page = 0; page < maxPages; page++) {
    if (url.origin !== prodigiOrigin || url.pathname.toLowerCase() !== '/v4.0/orders' || visited.has(url.href)) return { available: true, orders, complete: false, reason: 'Unsafe or repeated next URL' };
    visited.add(url.href);
    const r = await getJson(url, { 'X-API-Key': key }, fetcher);
    if (r.error || !Array.isArray(r.body?.orders)) return { available: true, orders, complete: false, reason: r.error ?? 'Invalid orders response' };
    orders.push(...r.body.orders);
    if (r.body.hasMore === false) return { available: true, orders, complete: true };
    try { url = new URL(r.body.nextUrl); } catch { return { available: true, orders, complete: false, reason: 'Missing next URL' }; }
  }
  return { available: true, orders, complete: false, reason: 'Pagination limit reached' };
}
export function paymentEvidence(snapshot) {
  if (!snapshot?.available) return { available: false, reason: snapshot?.reason ?? 'Not collected' };
  const lists = snapshot.lists ?? {};
  const objects = endpoint => lists[endpoint]?.data ?? [];
  return { available: true, accountId: snapshot.accountId, claimAvailable: snapshot.claimAvailable, expiresAt: snapshot.expiresAt,
    coverage: Object.fromEntries(Object.entries(lists).map(([k,v]) => [k, { complete: v.complete, count: v.data.length, error: v.error ?? null }])),
    sessions: objects('checkout/sessions').map(s => ({ id: s.id, created: s.created, status: s.status, paymentStatus: s.payment_status, amount: s.amount_total, currency: s.currency, paymentIntent: typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id,
      shippingField: s.collected_information?.shipping_details ? 'collected_information.shipping_details' : s.shipping_details ? 'shipping_details' : null })),
    payments: objects('payment_intents').map(p => ({ id: p.id, created: p.created, status: p.status, amount: p.amount, currency: p.currency })),
    webhooks: objects('webhook_endpoints').map(w => ({ id: w.id, origin: (() => { try { return new URL(w.url).origin; } catch { return null; } })(), status: w.status, events: w.enabled_events, apiVersion: w.api_version })),
    events: objects('events').map(e => ({ id: e.id, type: e.type, created: e.created, pendingWebhooks: e.pending_webhooks })) };
}
export function orderEvidence(order, owner) {
  return { id: order.id, created: order.created, linkage: owner?.linkage ?? 'unattributed', runIds: owner?.runIds ?? [], stripeObjectIds: owner?.stripeObjectIds ?? [],
    stage: order.status?.stage, assetStatus: order.status?.details?.downloadAssets, issuesCount: order.status?.issues?.length ?? 0,
    items: (order.items ?? []).map(i => ({ sku: i.sku, copies: i.copies, sizing: i.sizing,
      attributes: Object.fromEntries(['color', 'size', 'gender', 'style'].filter(k => i.attributes?.[k]).map(k => [k, i.attributes[k]])),
      assets: (i.assets ?? []).map(a => ({ printArea: a.printArea, md5Hash: a.md5Hash, status: a.status, thumbnailAvailable: Boolean(a.thumbnailUrl) })) })) };
}
