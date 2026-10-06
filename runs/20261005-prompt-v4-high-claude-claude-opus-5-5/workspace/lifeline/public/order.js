import { SIZES, lineColor, shirtColor } from './catalog.js';
import { shirtMockup } from './mockup.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (cents, cur = 'usd') => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur.toUpperCase() }).format(cents / 100);

const sessionId = new URLSearchParams(location.search).get('session_id');
let tries = 0;

// Prodigi stages: InProgress → Complete (shipped) | Cancelled
function steps(o) {
  const stage = o.prodigi?.stage;
  const shipped = stage === 'Complete' || o.prodigi?.shipments?.some((s) => s.tracking);
  return [
    { label: 'Payment received', detail: o.paid ? money(o.total, o.currency) : 'Waiting for payment confirmation', done: o.paid },
    {
      label: 'Sent to the print shop',
      detail: o.prodigi ? `Prodigi order ${o.prodigi.id}` : o.fulfilmentError || 'Queuing your print file…',
      done: Boolean(o.prodigi),
    },
    { label: 'Printing', detail: 'Printed direct-to-garment at the facility nearest you', done: Boolean(shipped), now: Boolean(o.prodigi) && !shipped },
    {
      label: 'Shipped',
      detail: shipped
        ? o.prodigi.shipments.map((s) => (s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.carrier || 'Track')} ${esc(s.tracking)}</a>` : esc(s.carrier))).join(', ') || 'On its way'
        : `${o.shippingMethod || 'Standard'} shipping with tracking`,
      done: Boolean(shipped),
    },
  ];
}

function render(o) {
  const color = lineColor(o.design.color)?.hex;
  document.body.style.setProperty('--line-c', color);
  $('#headline').textContent = o.paid ? `All aboard, ${o.shipTo?.name?.split(' ')[0] || 'friend'}!` : 'Payment pending';
  $('#sub').textContent = o.paid
    ? `“${o.design.name}” is on its way to the printer. A receipt is heading to ${o.email || 'your inbox'}.`
    : 'We haven’t received payment confirmation yet. This page will update automatically.';
  $('#timeline').innerHTML = steps(o)
    .map((s) => `<li class="${s.done ? 'done' : ''} ${s.now ? 'now' : ''}"><b>${s.label}</b><span>${s.detail}</span></li>`)
    .join('');
  const sizes = o.items.map((it) => `${it.qty} × ${SIZES.find((s) => s.id === it.size)?.label}`).join(', ');
  $('#details').innerHTML = `
    <dt>Line</dt><dd>${esc(o.design.name)}</dd>
    <dt>Shirt</dt><dd>${esc(shirtColor(o.shirt)?.name)} · Bella+Canvas 3001</dd>
    <dt>Sizes</dt><dd>${esc(sizes)}</dd>
    ${o.shipTo ? `<dt>Ship to</dt><dd>${esc(o.shipTo.name)}, ${esc(o.shipTo.city)} ${esc(o.shipTo.country)}</dd>` : ''}
    <dt>Print file</dt><dd><a href="${esc(o.printFile)}" target="_blank" rel="noopener">View full-resolution PNG</a></dd>`;
  $('#shirt').innerHTML = shirtMockup(o.design, o.shirt);
}

async function load() {
  if (!sessionId) {
    $('#headline').textContent = 'No order found';
    $('#sub').innerHTML = 'This link is missing an order reference. <a href="/#design">Design a shirt</a>.';
    return;
  }
  try {
    const res = await fetch(`/api/order?session_id=${encodeURIComponent(sessionId)}`);
    const o = await res.json();
    if (!res.ok) throw new Error(o.error || 'Could not load order');
    render(o);
    if ((!o.paid || !o.prodigi) && ++tries < 20) setTimeout(load, 3000);
  } catch (e) {
    $('#headline').textContent = 'Hmm, we hit a signal problem';
    $('#sub').textContent = `${e.message}. Refresh in a moment.`;
  }
}
load();
