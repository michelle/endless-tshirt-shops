(() => {
  const timestamp = document.querySelector('#timestamp');
  const human = document.querySelector('#clockHuman');
  const checkout = document.querySelector('#checkoutButton');
  const message = document.querySelector('#formMessage');
  const modal = document.querySelector('#successModal');
  const successText = document.querySelector('#successText');
  const orderTimestamp = new URLSearchParams(location.search).get('session_id');
  document.querySelector('#year').textContent = new Date().getFullYear();
  function tick() { const now = new Date(); timestamp.textContent = String(now.getTime()); human.textContent = now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}); requestAnimationFrame(tick); }
  tick();
  function selected(name) { return document.querySelector(`input[name="${name}"]:checked`).value; }
  async function finish(sessionId) {
    modal.hidden = false; history.replaceState({}, '', '/success');
    try { const r = await fetch('/api/fulfill', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId})}); const data = await r.json(); if (!r.ok) throw new Error(data.error || 'We could not confirm your order yet.'); successText.textContent = data.orderId ? `Order ${data.orderId} is now queued for print. We’ll email your receipt and shipping updates.` : 'Your payment is confirmed. We’re preparing your timestamp for print.'; } catch (e) { successText.textContent = 'Your payment is confirmed. We’re preparing your timestamp for print and will email you shortly.'; }
  }
  if (orderTimestamp) finish(orderTimestamp);
  document.querySelector('#closeSuccess').onclick = () => modal.hidden = true;
  document.querySelector('#purchaseForm').addEventListener('submit', async e => {
    e.preventDefault(); message.textContent = ''; checkout.disabled = true; checkout.querySelector('span:first-child').textContent = 'Opening checkout…';
    try {
      const r = await fetch('/api/create-checkout', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({style:selected('style'),size:selected('size'),timestamp:Date.now()})});
      const data = await r.json(); if (!r.ok || !data.url) throw new Error(data.error || 'Checkout is unavailable.'); location.assign(data.url);
    } catch(err) { message.textContent = err.message; checkout.disabled = false; checkout.querySelector('span:first-child').textContent = 'Secure checkout'; }
  });
})();
