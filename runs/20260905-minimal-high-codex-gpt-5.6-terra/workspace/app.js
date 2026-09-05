(() => {
  const preview = document.getElementById('previewTime');
  const form = document.getElementById('checkoutForm');
  const error = document.getElementById('formError');
  const buy = document.getElementById('buyButton');
  const success = document.getElementById('success');
  const path = document.getElementById('shirtPath');
  let stripe; let card; let checkoutTimestamp;
  const unisexPath = 'M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z';
  const fittedPath = path.getAttribute('d');
  function tick(){ preview.textContent = Date.now(); requestAnimationFrame(tick); } tick();
  document.querySelectorAll('input[name=style]').forEach(input => input.addEventListener('change', () => { path.setAttribute('d', input.value === 'unisex' ? unisexPath : fittedPath); }));
  function showError(message){ error.textContent = message || ''; }
  function setBusy(busy, label){ buy.disabled = busy; buy.querySelector('span').textContent = label || 'Buy this shirt — $22.50'; }
  async function setup(){
    try {
      const config = await fetch('/api/config').then(async r => { if(!r.ok) throw new Error('Payments are not ready.'); return r.json(); });
      stripe = Stripe(config.publishableKey);
      const elements = stripe.elements();
      card = elements.create('card', { style: { base: { fontFamily: 'Chivo, Arial, sans-serif', fontSize: '15px', color: '#1d1d1f', '::placeholder': { color: '#949499' } }, invalid: { color: '#b92332' } }, hidePostalCode: true });
      card.mount('#card-element');
      card.on('change', event => showError(event.error?.message));
    } catch (err) { showError(err.message); setBusy(true, 'Payments unavailable'); }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); showError('');
    if (!stripe || !card) return showError('Payment form is still loading.');
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    if (data.style === 'fitted' && data.countryCode !== 'US') return showError('The fitted shirt is currently available for US delivery only. Please choose unisex for international shipping.');
    checkoutTimestamp = Date.now(); setBusy(true, 'Preparing secure payment…');
    try {
      const intent = await fetch('/api/create-payment-intent', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email:data.email, style:data.style, size:data.size, timestamp:String(checkoutTimestamp), address:data }) }).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error);return body});
      setBusy(true, 'Confirming payment…');
      const confirmed = await stripe.confirmCardPayment(intent.clientSecret, { payment_method: { card, billing_details: { name:data.name, email:data.email, address:{line1:data.line1,line2:data.line2,city:data.city,state:data.state,postal_code:data.postalCode,country:data.countryCode} } } });
      if (confirmed.error) throw new Error(confirmed.error.message);
      setBusy(true, 'Sending to print…');
      const fulfilment = await fetch('/api/fulfill', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ paymentIntentId:confirmed.paymentIntent.id, address:data }) }).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error);return body});
      form.hidden = true; success.hidden = false; document.getElementById('successText').textContent = `Order ${fulfilment.orderId} is with our print partner.`;
    } catch (err) { showError(err.message || 'Something went wrong. Please try again.'); setBusy(false); }
  });
  document.getElementById('anotherButton').addEventListener('click',()=>{form.reset();form.hidden=false;success.hidden=true;setBusy(false);window.scrollTo({top:0,behavior:'smooth'});});
  setup();
})();
