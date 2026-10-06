'use strict';
initChrome('order');
document.body.insertAdjacentHTML('beforeend', footerHtml);

(async function () {
  const box = $('#box');
  const cfg = await getConfig();
  const q = new URLSearchParams(location.search);
  let id = q.get('id'), t = q.get('t');

  if (q.get('sid')) {
    try {
      const r = await fetch('/api/finalize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid: q.get('sid') }) });
      const out = await r.json();
      if (!r.ok) throw new Error(out.error);
      if (!out.paid) { box.innerHTML = '<h2>Waiting for payment</h2><p class="muted">Your bank hasn\'t confirmed the payment yet. This page will update once it does; you can safely close it.</p>'; setTimeout(() => location.reload(), 8000); return; }
      id = out.id; t = out.t;
      history.replaceState(null, '', `/order.html?id=${id}&t=${t}`);
    } catch (e) { box.innerHTML = `<h2>We couldn't confirm that payment</h2><p class="muted">${esc(e.message || 'Please check your email for a receipt or contact us.')}</p>`; return; }
  }
  if (!id || !t) { box.innerHTML = '<h2>Order not found</h2><p class="muted">Use the link from your confirmation.</p>'; return; }
  Cart.clear();

  const STEPS = [['downloadAssets', 'Artwork received', 'We have your constellation file.'], ['printReadyAssetsPrepared', 'Print file prepared', 'Sized and checked for the press.'], ['allocateProductionLocation', 'Print studio assigned', 'Matched to the nearest print lab.'], ['inProduction', 'Printing', 'Your shirt is being printed and cured.'], ['shipping', 'On its way', 'Packed and handed to the courier.']];

  async function load() {
    const r = await fetch(`/api/order-status?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`);
    const s = await r.json();
    if (!r.ok) { box.innerHTML = `<div class="eyebrow">Order ${esc(id)}</div><h2 style="margin:10px 0 14px">Payment received</h2><p class="muted">${esc(s.error)}</p>`; return 4000; }
    const d = s.details || {};
    let seenNow = false;
    const lis = STEPS.map(([k, title, sub]) => {
      const v = d[k];
      let cls = '';
      if (v === 'Complete') cls = 'done'; else if (!seenNow) { cls = v === 'InProgress' || v === 'NotStarted' ? 'now' : ''; seenNow = true; }
      return `<li class="${cls}"><b>${title}</b>${cls ? sub : ''}</li>`;
    }).join('');
    const complete = s.stage === 'Complete';
    const ship = s.shipments.map((x) => `<p>Carrier: <b>${esc(x.carrier || 'TBC')}</b>${x.tracking && x.tracking.url ? ` · <a href="${esc(x.tracking.url)}" rel="noopener" style="color:var(--gold)">Track ${esc(x.tracking.number || 'parcel')}</a>` : ''}</p>`).join('');
    box.innerHTML = `<div class="eyebrow">Order ${esc(id)}</div>
      <h2 style="margin:10px 0 8px">${complete ? 'Delivered to the courier' : 'Thank you, your sky is being printed'}</h2>
      <p class="muted">Shipping to ${esc(s.shipTo.name)}, ${esc(s.shipTo.city)}, ${esc(s.shipTo.country)}. Bookmark this page to follow along.</p>
      ${cfg.payment === 'demo' ? '<div class="banner">Test mode: this order exists in Prodigi\'s sandbox only. Nothing will be printed or shipped.</div>' : ''}
      ${s.issues.length ? `<div class="banner err">${s.issues.map(esc).join('<br>')}</div>` : ''}
      <ul class="timeline">${lis}</ul>${ship}
      <p class="muted" style="font-size:15px">${s.items.map((i) => `${i.qty} × ${esc((cfg.colors.find((c) => c.id === i.color) || {}).label || i.color)} · ${esc(i.size.toUpperCase())}`).join('<br>')}</p>
      <a class="btn ghost" href="/#studio" style="margin-top:12px">Chart another sky</a>`;
    return complete ? 0 : 15000;
  }
  async function loop() { try { const next = await load(); if (next) setTimeout(loop, next); } catch { setTimeout(loop, 15000); } }
  loop();
})();
