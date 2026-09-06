// Distinguish verified facts from unknowns; different labels alone do not prove isolation.
export function linkOrders(runs, snapshots, orders) {
  return orders.map(order => {
    const text = JSON.stringify({ merchantReference: order.merchantReference, metadata: order.metadata, idempotencyKey: order.idempotencyKey });
    const matches = []; const ids = []; let paid = false;
    for (const run of runs) {
      const lists = snapshots[run.run_id]?.lists ?? {};
      const objects = [...(lists['checkout/sessions']?.data ?? []), ...(lists.payment_intents?.data ?? [])];
      for (const o of objects) {
        // Metadata on the Stripe object may point to an order even when merchantReference is unrelated.
        const receipt = JSON.stringify(o.metadata ?? {}).match(/ord_\d+/g) ?? [];
        const references = text.match(/(?:cs|pi)_[a-zA-Z0-9_]+/g) ?? [];
        if (references.includes(o.id) || receipt.includes(order.id)) { matches.push(run.run_id); ids.push(o.id); paid ||= o.payment_status === 'paid' || o.status === 'succeeded'; }
      }
    }
    return { orderId: order.id, runIds: [...new Set(matches)], stripeObjectIds: [...new Set(ids)], linkage: matches.length ? paid ? 'paid-stripe-object-linked' : 'unpaid-stripe-object-linked' : 'unattributed' };
  });
}
export function inspectIsolation(runs, snapshots, prodigi, links, sourceReferences = []) {
  const checks = [];
  const add = (name, state, detail, runIds = []) => checks.push({ name, state, detail, runIds });
  function unique(name, values) {
    const groups = new Map(); let missing = false;
    values.forEach(([id,v]) => { if (!v) { missing = true; return; } const group = groups.get(v) ?? []; group.push(id); groups.set(v, group); });
    const duplicates = [...groups.values()].filter(ids => ids.length > 1).flat();
    add(name, duplicates.length ? 'fail' : missing ? 'unknown' : 'pass', duplicates.length ? 'Value reused across runs' : missing ? 'Some identities unavailable' : 'Distinct across inspected runs', duplicates);
  }
  unique('run IDs', runs.map(r => [r.run_id, r.run_id]));
  unique('Vercel project names', runs.map(r => [r.run_id, r.vercel_project]));
  unique('deployment origins', runs.map(r => [r.run_id, r.deployment]));
  unique('Stripe profile paths', runs.map(r => [r.run_id, r.stripe_config_path]));
  unique('Stripe account identities', runs.map(r => [r.run_id, snapshots[r.run_id]?.accountId]));
  unique('Stripe credentials', runs.map(r => [r.run_id, snapshots[r.run_id]?.credentialFingerprint]));
  for (const field of ['suite_id', 'prompt_sha256', 'base_commit', 'reasoning_effort']) {
    const values = runs.map(r => r[field]);
    add(`consistent ${field}`, values.some(v => !v) ? 'unknown' : new Set(values).size === 1 ? 'pass' : 'fail', 'Compare immutable run metadata');
  }
  for (const run of runs) {
    const s = snapshots[run.run_id]; const ids = [run.run_id];
    add('profile/account agreement', !s?.accountId || !s?.profileAccountId ? 'unknown' : s.accountId === s.profileAccountId ? 'pass' : 'fail', 'Live GET /v1/account versus saved profile identity', ids);
    const w = s?.lists?.webhook_endpoints;
    const enabled = (w?.data ?? []).filter(e => e.status === 'enabled');
    const mismatch = enabled.some(e => { try { return new URL(e.url).origin !== run.deployment; } catch { return true; } });
    add('webhook destination', mismatch ? 'fail' : !w?.complete || !enabled.length || !run.deployment ? 'unknown' : 'pass', 'Enabled endpoints must target this deployment; no endpoints is unknown', ids);
    const objects = ['payment_intents', 'checkout/sessions', 'customers', 'events'].flatMap(k => s?.lists?.[k]?.data ?? []);
    const old = objects.some(o => Number.isFinite(o.created) && o.created < Date.parse(run.started_at) / 1000 - 60);
    add('objects predate run', old ? 'fail' : !Number.isFinite(Date.parse(run.started_at)) || !s?.available || ['payment_intents', 'checkout/sessions', 'customers', 'events'].some(k => !s.lists?.[k]?.complete) ? 'unknown' : 'pass', 'Objects older than run start (60s tolerance) suggest pre-existing account state', ids);
  }
  const cross = links.filter(l => l.runIds.length > 1);
  add('cross-run Prodigi receipts', cross.length ? 'fail' : !prodigi?.complete || runs.some(r => !snapshots[r.run_id]?.lists?.['checkout/sessions']?.complete || !snapshots[r.run_id]?.lists?.payment_intents?.complete) ? 'unknown' : 'pass', 'A single order must not be linked to Stripe objects from different runs', cross.flatMap(l => l.runIds));
  const objectOwners = new Map();
  for (const run of runs) for (const list of Object.values(snapshots[run.run_id]?.lists ?? {})) for (const o of list.data ?? []) { const owners = objectOwners.get(o.id) ?? new Set(); owners.add(run.run_id); objectOwners.set(o.id, owners); }
  const reused = [...objectOwners.values()].filter(s => s.size > 1);
  add('cross-run Stripe objects', reused.length ? 'fail' : runs.some(r => !snapshots[r.run_id]?.available || ['payment_intents', 'checkout/sessions', 'customers', 'events'].some(k => !snapshots[r.run_id]?.lists?.[k]?.complete)) ? 'unknown' : 'pass', 'Repeated object IDs across run profiles', reused.flatMap(s => [...s]));
  add('cross-run source references', sourceReferences.length ? 'fail' : 'pass', 'Static source contains another inspected run ID or deployment; review hits before attribution', [...new Set(sourceReferences.map(r => r.runId))]);
  add('Prodigi account separation', 'shared', 'Harness intentionally supplies one shared Prodigi sandbox credential; orders are not account-isolated');
  return { scope: 'Observed suite only; not proof of absence of all ambient-state contamination', checks, sourceReferences,
    state: checks.some(c => c.state === 'fail') ? 'fail' : checks.some(c => c.state === 'unknown') ? 'unknown' : 'pass' };
}
