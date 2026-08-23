const state = { style: 'fitted', size: 'M', timestamp: Date.now(), busy: false };
const app = document.getElementById('app');

function timestamp() {
  const now = new Date(state.timestamp);
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}.${pad(now.getUTCMilliseconds(), 3)} UTC`;
}

function shirtSvg() {
  const fitted = state.style === 'fitted';
  const path = fitted
    ? 'M79.3 15.1c-1.6-1.6-16.1-6.1-16.1-6.1s-4.3 8.7-11.7 8.7S39.9 9 39.9 9s-15.4 4.9-16.5 6.1C22.3 16.2 9.7 32 9.7 32l10.1 8.4 6.6-5.5s14.4 24 1.4 58.9c0 0 43.5 10.8 47.4 0-9.7-43.3 1.4-58.6 1.4-58.6l6.3 5.2 9.4-11.1c-1.7-1.9-14.2-14.5-15.9-16.2Z'
    : 'M79.3 6.1C77.7 4.5 63.2 4 63.2 4S53.4 17.7 51.5 17.7 39.9 4 39.9 4s-15.4.9-16.5 2.1C22.3 7.2.6 31 .6 31l16.1 12 9.7-8.1 1.4 58.9s43.5 10.7 47.4 0l1.4-58.6 9.3 7.8L99.9 31S80.9 7.8 79.3 6.1Z';
  return `<svg class="shirt-svg" viewBox="0 0 100 105" aria-label="Black t-shirt preview"><path fill="#111313" d="${path}"/><path fill="#252b29" d="M40 5c2.2 5.2 6.5 12.7 11.5 12.7S60.8 10.2 63 5l-4.1-.9c-2.6 3.9-4.9 6.5-7.5 6.5s-4.9-2.6-7.5-6.5L40 5Z"/></svg>`;
}

function layout() {
  app.innerHTML = `<div class="shell">
    <header class="nav"><div class="wordmark">datetime.store</div><div class="nav-meta"><span>live edition</span><span>made for now</span></div></header>
    <section class="hero">
      <div class="visual">
        <div class="eyebrow">Object 001 / The current moment</div>
        <h1>Wear the<br>moment.</h1>
        <p class="lede">A t-shirt printed with the exact time you place your order. No two are ever quite the same.</p>
        <div class="product-stage">
          <div class="stage-top"><span>datetime / <strong>now</strong></span><span>01—01</span></div>
          <div class="shirt-wrap">${shirtSvg()}<div class="shirt-print">${timestamp()}<small>THIS MOMENT IS YOURS</small></div></div>
          <div class="stage-caption">front print / <b>one moment only</b><br>black cotton / printed to order</div>
        </div>
      </div>
      <section class="purchase" aria-label="Purchase options">
        <div class="eyebrow">The timestamp tee</div>
        <h2>Keep this moment.</h2>
        <p class="purchase-intro">Printed on a soft black tee and made just for you. Ships free, anywhere we can reach.</p>
        <div class="option-label"><span>Fit</span><span>choose one</span></div>
        <div class="option-grid styles">
          <div class="option"><input id="fitted" type="radio" name="style" value="fitted" ${state.style === 'fitted' ? 'checked' : ''}><label for="fitted">Fitted</label></div>
          <div class="option"><input id="unisex" type="radio" name="style" value="unisex" ${state.style === 'unisex' ? 'checked' : ''}><label for="unisex">Unisex</label></div>
        </div>
        <div class="option-label"><span>Size</span><span>US sizing</span></div>
        <div class="option-grid sizes">${['S','M','L','XL'].map(size => `<div class="option"><input id="size-${size}" type="radio" name="size" value="${size}" ${state.size === size ? 'checked' : ''}><label for="size-${size}">${size}</label></div>`).join('')}</div>
        <div class="total"><span class="total-label">Your total</span><div class="prices"><span class="was">$30.00</span><span class="now">$22.50</span></div></div>
        <button class="buy" id="buy" type="button">Continue to secure checkout <span class="arrow">↗</span></button>
        <div class="fine-print"><span>Free shipping · printed to order</span><span>Stripe secure checkout</span></div>
        <div class="message" id="message" role="alert" aria-live="polite"></div>
      </section>
    </section>
    <footer class="footer"><span>© datetime.store / 2026</span><span>made with an accurate clock</span></footer>
  </div>`;
  document.querySelectorAll('input[name="style"]').forEach(input => input.addEventListener('change', event => { state.style = event.target.value; layout(); }));
  document.querySelectorAll('input[name="size"]').forEach(input => input.addEventListener('change', event => { state.size = event.target.value; layout(); }));
  document.getElementById('buy').addEventListener('click', startCheckout);
}

function artworkDataUrl() {
  const canvas = document.createElement('canvas');
  canvas.width = 1800; canvas.height = 500;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#fff';
  context.font = '500 72px "DM Mono", monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(timestamp(), canvas.width / 2, 205);
  context.fillStyle = '#bac5c1';
  context.font = '500 26px "DM Mono", monospace';
  context.fillText('THIS MOMENT IS YOURS', canvas.width / 2, 300);
  return canvas.toDataURL('image/png');
}

async function startCheckout() {
  if (state.busy) return;
  state.busy = true;
  const button = document.getElementById('buy');
  const message = document.getElementById('message');
  button.disabled = true;
  button.innerHTML = '<span class="spinner"></span>Preparing your moment…';
  message.textContent = '';
  state.timestamp = Date.now();
  try {
    const response = await fetch('/api/prepare-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ style: state.style, size: state.size, artwork: artworkDataUrl() }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'We could not prepare your shirt.');
    const checkout = await fetch('/api/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ style: state.style, size: state.size, designId: payload.designId }) });
    const checkoutPayload = await checkout.json();
    if (!checkout.ok) throw new Error(checkoutPayload.error || 'Checkout is temporarily unavailable.');
    window.location.assign(checkoutPayload.url);
  } catch (error) {
    state.busy = false;
    button.disabled = false;
    button.innerHTML = 'Continue to secure checkout <span class="arrow">↗</span>';
    message.textContent = error.message;
  }
}

async function successPage(sessionId) {
  app.innerHTML = `<div class="shell"><header class="nav"><div class="wordmark">datetime.store</div><div class="nav-meta"><span>order received</span></div></header><section class="success"><div class="success-mark">✓</div><div class="eyebrow">Thank you for being here</div><h1>Your moment is saved.</h1><p>Payment went through. Your shirt is now being prepared with the timestamp from your order.</p><p>We’ll send the order confirmation and tracking details to your email.</p><p class="order-note" id="order-note">Checking fulfillment status…</p><a class="back" href="/">Shop another moment</a></section></div>`;
  try {
    await fetch('/api/complete-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId }) });
    const response = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`);
    const data = await response.json();
    const note = document.getElementById('order-note');
    if (data.orderId) note.textContent = `Scalable Press order ${data.orderId} · fulfillment queued`;
    else note.textContent = data.status === 'paid' ? 'Payment confirmed · fulfillment is being queued' : 'Payment received · preparing fulfillment';
  } catch (_) { document.getElementById('order-note').textContent = 'Payment confirmed · fulfillment is being queued'; }
}

const sessionId = new URLSearchParams(window.location.search).get('session_id');
if (sessionId) successPage(sessionId); else layout();
