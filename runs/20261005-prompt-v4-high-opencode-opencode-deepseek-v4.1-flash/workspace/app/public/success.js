'use strict';
const $ = (id) => document.getElementById(id);

function kv(label, value) {
  return `<div class="kv"><span>${label}</span><span>${value}</span></div>`;
}

async function poll(sessionId, attempt) {
  try {
    const res = await fetch(`/api/order?session_id=${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not confirm your order.');
    if (data.status === 'fulfilled') return render(data);
    if (data.status === 'unpaid' && attempt < 12) {
      $('headline').textContent = 'Waiting for payment…';
      return setTimeout(() => poll(sessionId, attempt + 1), 2500);
    }
    if (data.status === 'unpaid') {
      $('headline').textContent = 'Payment not completed';
      $('sub').textContent = 'This checkout has not been paid, so nothing has been sent to print.';
      return;
    }
  } catch (e) {
    if (attempt < 12) return setTimeout(() => poll(sessionId, attempt + 1), 3000);
    $('headline').textContent = 'We hit a snag';
    $('sub').textContent = e.message;
  }
}

function render(d) {
  $('headline').textContent = 'Your sky is on its way';
  $('sub').textContent = 'Payment received and verified. Your one-of-one star map has been sent to the press.';
  const card = $('card');
  card.hidden = false;
  card.innerHTML =
    kv('Prodigi order', `<code>${d.prodigiOrderId || '—'}</code>`) +
    kv('Status', d.stage || 'In production') +
    kv('Caption', escapeHtml(d.caption || '')) +
    kv('Place', escapeHtml(d.place || '')) +
    kv('Variant', `${escapeHtml(d.color || '')} · ${String(d.size || '').toUpperCase()}`) +
    `<p class="tiny">Keep this page — the order reference is your receipt. Printed by Prodigi in their global lab network.</p>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', () => {
  const id = new URLSearchParams(location.search).get('session_id');
  if (!id) {
    $('headline').textContent = 'Missing order reference';
    $('sub').textContent = 'Return to the store and start a new design.';
    return;
  }
  poll(id, 0);
});
