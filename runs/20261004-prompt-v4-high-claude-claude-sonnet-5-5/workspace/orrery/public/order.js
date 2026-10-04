const root = document.getElementById('root');
const id = location.pathname.split('/').pop();
const t = new URLSearchParams(location.search).get('t');
const money = (c) => `$${(c / 100).toFixed(2)}`;
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (k === 'class') el.className = v; else if (v !== false && v != null) el.setAttribute(k, v); }
  for (const k of kids.flat()) if (k != null) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
const prev = (i) => `/api/preview.png?${new URLSearchParams({ date: i.date, name: i.name, line: i.line || '', color: i.color, accent: i.accent, w: '240', bg: '1' })}`;

function steps(o) {
  const paid = !['pending_payment', 'payment_failed', 'expired', 'canceled'].includes(o.status);
  const sent = ['submitted'].includes(o.status);
  const ship = o.shipping;
  const shipped = ship?.shipments?.length > 0 || ship?.stage === 'Complete';
  const inProd = sent && !shipped;
  return [
    { label: 'Payment received', done: paid, now: !paid, detail: paid ? '' : 'Waiting for confirmation…' },
    { label: 'Sent to the print lab', done: sent, now: paid && !sent, detail: paid && !sent ? (o.status === 'fulfillment_failed' ? 'We hit a snag sending your order; our team has been alerted and will fix it.' : 'Preparing your print files…') : '' },
    { label: 'Printing your shirt', done: shipped, now: inProd, detail: inProd ? 'Your design is being printed and quality checked.' : '' },
    { label: 'Shipped', done: shipped, now: false, detail: '' },
  ];
}

let timer;
async function load() {
  const r = await fetch(`/api/orders/${encodeURIComponent(id)}?t=${encodeURIComponent(t || '')}`);
  if (!r.ok) { root.replaceChildren(h('h1', {}, 'Order not found'), h('p', { class: 'lede' }, 'That link looks incomplete. Check the link from your confirmation.'), h('a', { href: '/' }, '← Back to the store')); return; }
  const o = await r.json();
  const failed = ['payment_failed', 'expired', 'canceled'].includes(o.status);
  const title = failed ? 'Payment not completed' : o.status === 'pending_payment' ? 'Confirming your payment…' : 'Thank you, your sky is on its way';
  const kids = [h('p', { class: 'eyebrow' }, `Order ${o.id}`), h('h1', {}, title)];
  if (o.demo) kids.push(h('p', { class: 'notice' }, 'Demo order: no money was taken and this order went to the Prodigi sandbox, so nothing will really be printed.'));
  if (failed) {
    kids.push(h('p', { class: 'lede' }, 'No charge was made for this order.'), h('a', { class: 'cta', href: '/#cart' }, 'Return to your cart'));
  } else {
    kids.push(h('p', { class: 'lede' }, o.status === 'pending_payment' ? 'This usually takes a few seconds.' : `We'll keep this page up to date. A receipt is on its way to ${o.email}.`));
    kids.push(h('ol', { class: 'timeline' }, steps(o).map((s) => h('li', { class: `${s.done ? 'done' : ''} ${s.now ? 'now' : ''}` }, s.label, s.detail ? h('small', {}, s.detail) : null))));
    const sh = o.shipping?.shipments?.filter((s) => s.trackingUrl || s.trackingNumber) || [];
    for (const s of sh) kids.push(h('p', { class: 'card' }, `Carrier: ${s.carrier || '—'}${s.service ? ` (${s.service})` : ''} `, s.trackingUrl ? h('a', { href: s.trackingUrl, target: '_blank', rel: 'noopener' }, `Track package ${s.trackingNumber || ''}`) : (s.trackingNumber || '')));
  }
  kids.push(h('div', { class: 'card' },
    h('ul', { class: 'lines' }, o.items.map((i) => h('li', {}, h('img', { src: prev(i), alt: '' }), h('div', {}, h('b', {}, `${i.title} × ${i.qty}`), h('br'), h('small', { style: 'color:var(--muted)' }, i.description))))),
    h('p', { style: 'margin:16px 0 0;color:var(--muted)' }, `Subtotal ${money(o.subtotalCents)} · Shipping ${money(o.shippingCents)} · `, h('b', { style: 'color:var(--text)' }, `Total ${money(o.totalCents)}`)),
    h('p', { style: 'margin:6px 0 0;color:var(--muted)' }, `Shipping to ${o.shipTo.name}, ${o.shipTo.city}, ${o.shipTo.country}`)));
  kids.push(h('a', { href: '/' }, '← Back to the store'));
  root.replaceChildren(...kids);
  const settled = failed || (o.status === 'submitted' && o.shipping?.shipments?.length);
  clearTimeout(timer);
  if (!settled) timer = setTimeout(load, 5000);
}
load().catch(() => { root.replaceChildren(h('p', { class: 'lede' }, 'Could not load your order. Please refresh.')); });
