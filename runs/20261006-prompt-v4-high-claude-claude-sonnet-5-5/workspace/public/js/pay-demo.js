'use strict';
const $ = (s) => document.querySelector(s);
const money = (c) => '$' + (c / 100).toFixed(2);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const token = new URLSearchParams(location.search).get('o');
let total = 0;

const COLORS = {}; fetch('/api/config').then((r) => r.json()).then((c) => c.colors.forEach((x) => (COLORS[x.id] = x.label))).catch(() => {}).then(() => fetch('/api/demo/order?o=' + encodeURIComponent(token || '')).then(async (r) => {
  const o = await r.json();
  if (!r.ok) { $('#sum').innerHTML = `<div class="err">${esc(o.error)}</div>`; $('#go').disabled = true; return; }
  total = o.total;
  $('#sum').innerHTML = o.items.map((i) => `<div class="sumrow"><span>${esc(i.name)} · ${esc(COLORS[i.color] || i.color)} · ${esc(i.size.toUpperCase())} × ${i.qty}</span></div>`).join('') +
    `<div class="sumrow"><span>Subtotal</span><span>${money(o.subtotal)}</span></div><div class="sumrow"><span>Shipping</span><span>${money(o.shipping)}</span></div><div class="sumrow total"><span>Total</span><span>${money(o.total)}</span></div><p class="hint">Receipt to ${esc(o.email)}</p>`;
  $('#go').textContent = 'Pay ' + money(o.total);
}));

$('#num').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); });
$('#exp').addEventListener('input', (e) => { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); e.target.value = v; });

$('#f').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#err').textContent = '';
  const btn = $('#go'); const label = btn.textContent; btn.disabled = true; btn.textContent = 'Processing…';
  try {
    const r = await fetch('/api/demo/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ o: token, card: { number: $('#num').value, exp: $('#exp').value, cvc: $('#cvc').value } }) });
    const out = await r.json();
    if (!r.ok) throw new Error(out.error || 'Payment failed');
    localStorage.removeItem('asterism.cart.v1');
    location.href = out.redirectUrl;
  } catch (err) { $('#err').textContent = err.message; btn.disabled = false; btn.textContent = label; }
});
