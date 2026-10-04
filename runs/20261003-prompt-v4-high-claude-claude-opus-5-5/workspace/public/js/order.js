import { GARMENTS } from './design.js';
import { shirtSVG } from './mockup.js';

const $ = (s) => document.querySelector(s);
const id = new URLSearchParams(location.search).get('session_id');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let drawn = false;

function steps(o) {
  const d = o.prodigi?.details || {};
  const stage = o.prodigi?.stage;
  const ok = (v) => v === 'Complete';
  return [
    ['Payment received', o.paid ? 'Thanks! Your payment went through.' : 'Waiting for your payment to clear…', o.paid],
    ['Sent to the print shop', o.prodigi ? `Print order ${o.prodigi.id}` : 'Submitting your design…', !!o.prodigi],
    ['Artwork checked', 'Your print file has been downloaded and prepared.', ok(d.downloadAssets) && ok(d.printReadyAssetsPrepared)],
    ['Printing', 'Your shirt is being printed and finished.', ok(d.inProduction) || stage === 'Complete'],
    ['Shipped', o.prodigi?.shipments?.find((s) => s.tracking)?.tracking ? `Tracking: ${o.prodigi.shipments.find((s) => s.tracking).tracking}` : 'Tracking appears here once it ships.', ok(d.shipping) || stage === 'Complete'],
  ];
}

async function poll() {
  if (!id) {
    $('#headline').textContent = 'Order not found';
    return;
  }
  try {
    const res = await fetch(`/api/order?session_id=${encodeURIComponent(id)}`);
    const o = await res.json();
    if (!res.ok) {
      $('#error').textContent = o.error || 'Something went wrong.';
      $('#error').hidden = false;
      if (o.retry || res.status >= 500) setTimeout(poll, 5000);
      else $('#headline').textContent = 'Order not found';
      return;
    }
    $('#error').hidden = true;
    $('#eyebrow').textContent = o.paid ? 'Order confirmed' : 'Order pending';
    $('#headline').textContent = o.paid ? `${o.design.title} is going into service.` : 'Almost there…';
    $('#sub').textContent = o.paid ? `Order for ${o.email}. Bookmark this page to follow your shirt from the print shop to your door.` : 'Some payment methods take a little while to confirm. This page updates automatically.';
    $('#timeline').innerHTML = steps(o)
      .map(([t, s, done]) => `<li class="${done ? 'done' : ''}"><b>${esc(t)}</b>${esc(s)}</li>`)
      .join('');
    const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: o.currency.toUpperCase() }).format(o.total / 100);
    $('#details').innerHTML = [
      ['Shirt', `Bella+Canvas 3001 · ${GARMENTS[o.garment]?.label}`],
      ['Sizes', o.sizes.map((s) => `${s.copies} × ${s.size}`).join(', ')],
      ['Shipping', `${o.shipping || ''} to ${o.name || ''}`],
      ['Total paid', money],
    ]
      .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
      .join('');
    if (!drawn) {
      await document.fonts.ready;
      $('#preview').innerHTML = shirtSVG(o.design, o.garment);
      drawn = true;
    }
    const finished = o.prodigi?.stage === 'Complete' || o.prodigi?.stage === 'Cancelled';
    if (!finished) setTimeout(poll, o.prodigi ? 30000 : o.paid ? 3000 : 15000);
  } catch {
    setTimeout(poll, 5000);
  }
}
poll();
