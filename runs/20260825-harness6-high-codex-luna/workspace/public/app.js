(() => {
  const timeNode = document.querySelector('#shirt-time');
  const dateNode = document.querySelector('#preview-date');
  const shirtPath = document.querySelector('#shirt-path');
  const checkoutButton = document.querySelector('#checkout-button');
  const messageNode = document.querySelector('#checkout-message');
  const params = new URLSearchParams(window.location.search);
  const success = params.get('checkout');
  const sessionId = params.get('session_id');
  let frozenStamp = null;
  const formatDate = (date) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'short' }).format(date).replace(',', ' ·');
  const tick = () => { const stamp = frozenStamp || Date.now(); timeNode.textContent = String(stamp); dateNode.textContent = formatDate(new Date(stamp)); if (!frozenStamp) window.requestAnimationFrame(tick); };
  tick();
  const fittedShape = 'M174 33c-15 3-42 13-63 26L43 126l36 42 33-26c8 31 13 80 9 127l-6 154c21 10 55 16 95 16s74-6 95-16l-6-154c-4-47 1-96 9-127l33 26 36-42-68-67c-21-13-48-23-63-26-11 21-26 31-38 31s-27-10-38-31Z';
  const unisexShape = 'M166 31c-24 2-46 10-71 28L33 122l46 51 36-30c4 36 5 84 3 129l-2 147c28 10 58 15 94 15s66-5 94-15l-2-147c-2-45-1-93 3-129l36 30 46-51-62-63c-25-18-47-26-71-28-13 22-25 34-44 34s-31-12-44-34Z';
  const updateChoiceState = (name) => { document.querySelectorAll(`input[name="${name}"]`).forEach((input) => input.closest('.choice').classList.toggle('active', input.checked)); if (name === 'style') { const isFitted = document.querySelector('input[name="style"]:checked').value === 'fitted'; shirtPath.classList.toggle('fitted', isFitted); shirtPath.setAttribute('d', isFitted ? fittedShape : unisexShape); } };
  document.querySelectorAll('input[type="radio"]').forEach((input) => input.addEventListener('change', () => updateChoiceState(input.name)));
  updateChoiceState('style'); updateChoiceState('size');
  const setMessage = (text, type = '') => { messageNode.textContent = text; messageNode.className = `checkout-message ${type}`.trim(); };
  if (success === 'cancelled') setMessage('No worries — your shirt is still here when you are ready.', 'info');
  if (success === 'success' && sessionId) {
    frozenStamp = Date.now(); checkoutButton.disabled = true; checkoutButton.querySelector('span').textContent = 'Confirming order…';
    fetch(`/api/complete-order?session_id=${encodeURIComponent(sessionId)}`).then(async (response) => { const payload = await response.json(); if (!response.ok && payload.status !== 'pending') throw new Error(payload.error || 'We could not confirm the order.'); return payload; }).then((payload) => { setMessage(payload.status === 'fulfilled' ? `Order confirmed · ${payload.orderId}` : 'Payment received — your print order is being queued now.', payload.status === 'fulfilled' ? 'success' : 'info'); checkoutButton.querySelector('span').textContent = 'Thank you for this moment'; }).catch((error) => { setMessage(`Payment received. We’re finishing the order in the background. ${error.message}`, 'info'); checkoutButton.disabled = false; checkoutButton.querySelector('span').textContent = 'Buy another moment'; });
  }
  checkoutButton.addEventListener('click', async () => {
    if (checkoutButton.disabled) return;
    checkoutButton.disabled = true; checkoutButton.querySelector('span').textContent = 'Opening secure checkout…'; setMessage('');
    const stamp = Date.now(); frozenStamp = stamp;
    const style = document.querySelector('input[name="style"]:checked').value; const size = document.querySelector('input[name="size"]:checked').value;
    try { const response = await fetch('/api/create-checkout-session', { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({stamp, style, size}) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Checkout could not be started.'); window.location.assign(payload.url); }
    catch (error) { frozenStamp = null; tick(); checkoutButton.disabled = false; checkoutButton.querySelector('span').textContent = 'Buy this moment'; setMessage(error.message, 'error'); }
  });
})();
