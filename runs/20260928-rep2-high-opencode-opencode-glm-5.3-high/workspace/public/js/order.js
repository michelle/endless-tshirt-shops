// Nightshift order confirmation — lands here after Stripe payment.
// Calls /api/order-status, which is itself the fulfillment trigger: the
// server re-checks payment with Stripe and only then sends the order to
// the print lab. If the webhook already handled it, the same call
// idempotently reports the existing order.

import { renderSky } from './starmap.js';

const $ = (id) => document.getElementById(id);

const sessionId = new URLSearchParams(location.search).get('session_id');
if (!sessionId) {
  $('statusTitle').textContent = 'No order to check.';
  $('statusBody').textContent = 'This page is reached from Stripe after payment.';
} else {
  poll(0);
}

const MAX_TRIES = 15;

async function poll(attempt) {
  try {
    const response = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`);
    const result = await response.json();
    if (result.status === 'unpaid' && attempt < MAX_TRIES) {
      setTimeout(() => poll(attempt + 1), 2000);
      return;
    }
    if (result.status === 'fulfilled') {
      showResult(result);
      return;
    }
    if (result.status === 'unpaid') {
      fail('Payment is still settling. Refresh this page in a moment — your order is safe.');
      return;
    }
    fail(
      result.paid
        ? 'Your payment succeeded, but sending the order to the print lab failed. We have your payment recorded — this store is a demo, so nothing was actually charged; contact us and we will complete it.'
        : result.error || 'We could not confirm this order.',
    );
  } catch {
    if (attempt < MAX_TRIES) setTimeout(() => poll(attempt + 1), 2000);
    else fail('We could not reach the store — reload to check again.');
  }
}

async function showResult(result) {
  $('statusTitle').textContent = 'It’s on its way to the lab.';
  $('statusBody').textContent = 'Paid, verified, and sent to print.';
  $('spinner').classList.add('hidden');
  $('result').classList.remove('hidden');
  $('prodigiOrder').textContent = result.orderId;
  if (result.email) $('emailLine').textContent = `Confirmation to ${result.email}`;

  try {
    const response = await fetch('/api/catalog');
    const catalog = await response.json();
    const theme = catalog.themes.find((t) => t.id === result.design.theme) || catalog.themes[0];
    const color = catalog.colors.find((c) => c.id === (result.garment.c || result.garment.color)) || catalog.colors[0];
    const canvas = $('keepsakeCanvas');
    renderSky(canvas.getContext('2d'), canvas.width, canvas.height, result.design, theme, color.ink);
    document.fonts.ready.then(() => {
      renderSky(canvas.getContext('2d'), canvas.width, canvas.height, result.design, theme, color.ink);
    });
  } catch {
    // The keepsake preview is a nicety; the order status is already shown.
  }
}

function fail(message) {
  $('spinner').classList.add('hidden');
  $('statusTitle').textContent = 'Hmm.';
  $('statusBody').textContent = '';
  const el = $('orderError');
  el.textContent = message;
  el.classList.remove('hidden');
}
