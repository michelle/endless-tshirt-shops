const root = document.getElementById('root');
const id = location.pathname.split('/').pop();
const t = new URLSearchParams(location.search).get('t');
const money = (c) => `$${(c / 100).toFixed(2)}`;
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
async function pay(outcome, btns) {
  btns.forEach((b) => (b.disabled = true));
  const r = await fetch(`/api/demo/pay/${id}?t=${encodeURIComponent(t)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome }) });
  const j = await r.json();
  location.href = j.redirect || '/';
}
const r = await fetch(`/api/demo/order/${id}?t=${encodeURIComponent(t)}`);
if (!r.ok) root.replaceChildren(h('h1', {}, 'Order not found'));
else {
  const o = await r.json();
  const ok = h('button', { class: 'primary', id: 'demo-success' }, `Pay ${money(o.totalCents)} with test card`);
  const bad = h('button', { class: 'secondary', id: 'demo-decline' }, 'Simulate a declined card');
  ok.addEventListener('click', () => pay('success', [ok, bad]));
  bad.addEventListener('click', () => pay('decline', [ok, bad]));
  root.replaceChildren(
    h('p', { class: 'eyebrow' }, `Order ${o.id}`), h('h1', {}, 'Pay for your order'),
    h('div', { class: 'card' }, h('ul', { class: 'lines' }, o.items.map((i) => h('li', {}, h('div', {}, h('b', {}, `${i.title} × ${i.qty}`), h('br'), h('small', { style: 'color:var(--muted)' }, i.description))))),
      h('p', { style: 'margin:14px 0 0;color:var(--muted)' }, `Shipping ${money(o.shippingCents)} · `, h('b', { style: 'color:var(--text)' }, `Total ${money(o.totalCents)}`))),
    h('div', { class: 'card cardform' }, h('label', {}, 'Card number', h('input', { value: '4242 4242 4242 4242', disabled: '' }))),
    h('div', { class: 'btn-row' }, ok, bad),
    h('p', { class: 'fine' }, 'With Stripe configured, customers are sent to Stripe Checkout instead of this page, and the print order is created only when Stripe confirms the payment.'));
}
