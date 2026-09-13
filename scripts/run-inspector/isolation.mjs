// Distinguish verified facts from unknowns; different labels alone do not prove isolation.
const OBJECT_LISTS = ['payment_intents', 'checkout/sessions', 'customers', 'events'];

// fail beats unknown beats pass: a positive finding is never softened by a
// coverage gap, and a coverage gap is never reported as a clean pass.
const verdict = (failed, incomplete) => (failed ? 'fail' : incomplete ? 'unknown' : 'pass');

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
  const lacksCoverage = (run, names) => names.some(name => !snapshots[run.run_id]?.lists?.[name]?.complete);

  // Every run must hold a distinct value; a missing value is unknown, not pass.
  function unique(name, values) {
    const groups = new Map(); let missing = false;
    values.forEach(([id, value]) => {
      if (!value) { missing = true; return; }
      groups.set(value, [...(groups.get(value) ?? []), id]);
    });
    const duplicates = [...groups.values()].filter(ids => ids.length > 1).flat();
    add(name, verdict(duplicates.length > 0, missing),
      duplicates.length ? 'Value reused across runs' : missing ? 'Some identities unavailable' : 'Distinct across inspected runs',
      duplicates);
  }
  unique('run IDs', runs.map(r => [r.run_id, r.run_id]));
  unique('Vercel project names', runs.map(r => [r.run_id, r.vercel_project]));
  unique('deployment origins', runs.map(r => [r.run_id, r.deployment]));
  unique('Stripe profile paths', runs.map(r => [r.run_id, r.stripe_config_path]));
  unique('Stripe account identities', runs.map(r => [r.run_id, snapshots[r.run_id]?.accountId]));
  unique('Stripe credentials', runs.map(r => [r.run_id, snapshots[r.run_id]?.credentialFingerprint]));

  // The reverse of unique(): these must agree for the comparison to be fair.
  for (const field of ['suite_id', 'prompt_sha256', 'base_commit', 'reasoning_effort']) {
    const values = runs.map(r => r[field]);
    add(`consistent ${field}`, verdict(new Set(values).size > 1, values.some(v => !v)), 'Compare immutable run metadata');
  }

  for (const run of runs) {
    const snapshot = snapshots[run.run_id];
    const ids = [run.run_id];

    const identities = [snapshot?.accountId, snapshot?.profileAccountId];
    const known = identities.every(Boolean);
    add('profile/account agreement', verdict(known && identities[0] !== identities[1], !known),
      'Live GET /v1/account versus saved profile identity', ids);

    const endpoints = snapshot?.lists?.webhook_endpoints;
    const enabled = (endpoints?.data ?? []).filter(endpoint => endpoint.status === 'enabled');
    const elsewhere = enabled.some(endpoint => {
      try { return new URL(endpoint.url).origin !== run.deployment; } catch { return true; }
    });
    add('webhook destination', verdict(elsewhere, !endpoints?.complete || !enabled.length || !run.deployment),
      'Enabled endpoints must target this deployment; no endpoints is unknown', ids);

    const startedAt = Date.parse(run.started_at);
    const objects = OBJECT_LISTS.flatMap(name => snapshot?.lists?.[name]?.data ?? []);
    const predating = objects.some(o => Number.isFinite(o.created) && o.created < startedAt / 1000 - 60);
    add('objects predate run', verdict(predating, !Number.isFinite(startedAt) || !snapshot?.available || lacksCoverage(run, OBJECT_LISTS)),
      'Objects older than run start (60s tolerance) suggest pre-existing account state', ids);
  }

  const shared = links.filter(link => link.runIds.length > 1);
  add('cross-run Prodigi receipts',
    verdict(shared.length > 0, !prodigi?.complete || runs.some(run => lacksCoverage(run, ['checkout/sessions', 'payment_intents']))),
    'A single order must not be linked to Stripe objects from different runs', shared.flatMap(link => link.runIds));

  const owners = new Map();
  for (const run of runs) {
    for (const list of Object.values(snapshots[run.run_id]?.lists ?? {})) {
      for (const object of list.data ?? []) owners.set(object.id, new Set([...(owners.get(object.id) ?? []), run.run_id]));
    }
  }
  const reused = [...owners.values()].filter(runIds => runIds.size > 1);
  add('cross-run Stripe objects',
    verdict(reused.length > 0, runs.some(run => !snapshots[run.run_id]?.available || lacksCoverage(run, OBJECT_LISTS))),
    'Repeated object IDs across run profiles', reused.flatMap(runIds => [...runIds]));

  add('cross-run source references', verdict(sourceReferences.length > 0, false),
    'Static source contains another inspected run ID or deployment; review hits before attribution',
    [...new Set(sourceReferences.map(r => r.runId))]);
  add('Prodigi account separation', 'shared',
    'Harness intentionally supplies one shared Prodigi sandbox credential; orders are not account-isolated');

  return {
    scope: 'Observed suite only; not proof of absence of all ambient-state contamination',
    checks,
    sourceReferences,
    state: checks.some(c => c.state === 'fail') ? 'fail' : checks.some(c => c.state === 'unknown') ? 'unknown' : 'pass',
  };
}
