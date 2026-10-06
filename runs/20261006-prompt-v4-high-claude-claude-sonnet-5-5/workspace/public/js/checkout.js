'use strict';
initChrome('checkout');
document.body.insertAdjacentHTML('beforeend', footerHtml);

(async function () {
  const cfg = await getConfig();
  if (new URLSearchParams(location.search).has('cancelled')) $('#cancelled').hidden = false;
  const items = Cart.load();
  if (!items.length) { $('#empty').hidden = false; return; }
  $('#co').hidden = false;

  if (cfg.payment === 'demo') {
    $('#modeBanner').innerHTML = '<div class="banner"><b>Test mode.</b> Payments are simulated and no card is charged. Orders are sent to Prodigi\'s sandbox, so no shirt will actually ship.</div>';
    $('#payHint').textContent = 'You will enter a test card on the next step.';
  } else {
    $('#payHint').textContent = 'Secure payment by Stripe. Your shirts are only sent to print once payment succeeds.';
  }

  const sel = $('#country');
  sel.innerHTML = Object.entries(cfg.countries).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
  sel.value = 'US';

  // Remember the address between visits (never the payment details).
  const FIELDS = ['name', 'email', 'phone', 'line1', 'line2', 'city', 'state', 'postal'];
  try { const saved = JSON.parse(sessionStorage.getItem('asterism.addr') || '{}'); FIELDS.forEach((f) => { if (saved[f]) $('#' + f).value = saved[f]; }); if (saved.country && cfg.countries[saved.country]) sel.value = saved.country; } catch { /* ignore */ }

  function renderLines() {
    const cart = Cart.load();
    if (!cart.length) { location.reload(); return; }
    $('#lines').innerHTML = cart.map((i) => {
      const c = cfg.colors.find((x) => x.id === i.color);
      return `<div class="line" data-id="${i.id}"><div class="thumb">${shirtSvg(c, '', { label: '' })}</div>
        <div><div class="t">${esc(i.design.name)}</div><div class="m">${esc(c.label)} · ${i.size.toUpperCase()}${i.design.date ? ' · ' + esc(i.design.date) : ''}</div>
        <div class="acts"><div class="qty"><button data-a="dec" aria-label="Fewer">&minus;</button><span>${i.qty}</span><button data-a="inc" aria-label="More">+</button></div><button class="link" data-a="rm">Remove</button></div></div>
        <div>${money(cfg.price * i.qty)}</div></div>`;
    }).join('');
    cart.forEach(async (i) => {
      const c = cfg.colors.find((x) => x.id === i.color);
      try { const svg = await fetchDesign(i.design, i.color, { idp: 'c' + i.id }); const el = $(`#lines .line[data-id="${i.id}"] .thumb`); if (el) el.innerHTML = shirtSvg(c, svg, { label: `${i.design.name} shirt` }); } catch { /* cosmetic */ }
    });
    requote();
  }
  $('#lines').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const id = b.closest('.line').dataset.id; const it = Cart.load().find((x) => x.id === id);
    if (b.dataset.a === 'rm') Cart.remove(id); else Cart.setQty(id, it.qty + (b.dataset.a === 'inc' ? 1 : -1));
  });
  document.addEventListener('cart:change', renderLines);

  async function requote() {
    const country = sel.value;
    const c = cfg.countries[country];
    $('#state').required = !!c.needsState;
    $('#stateLbl').textContent = c.needsState ? 'State / province' : 'State / region (optional)';
    try {
      const r = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: Cart.load().map(payloadItem), country }) });
      const q = await r.json();
      if (!r.ok) throw new Error(q.error);
      $('#sums').innerHTML = `<div class="sumrow"><span>Subtotal (${q.units} shirt${q.units > 1 ? 's' : ''})</span><span>${money(q.subtotal)}</span></div>
        <div class="sumrow"><span>Shipping to ${esc(c.name)}</span><span>${money(q.shipping)}</span></div>
        <div class="sumrow total"><span>Total</span><span>${money(q.total)}</span></div>
        <p class="hint">Prices in USD. Taxes and import duties, where they apply, are not included.</p>`;
    } catch (e) { $('#sums').innerHTML = `<div class="err">${esc(e.message || 'Could not price your order.')}</div>`; }
  }
  const payloadItem = (i) => ({ design: i.design, color: i.color, size: i.size, qty: i.qty });
  sel.onchange = requote;
  renderLines();

  $('#addr').addEventListener('submit', async (e) => {
    e.preventDefault();
    $$('.err').forEach((x) => (x.textContent = '')); $$('input,select').forEach((x) => x.removeAttribute('aria-invalid'));
    const recipient = { country: sel.value };
    FIELDS.forEach((f) => (recipient[f] = $('#' + f).value));
    sessionStorage.setItem('asterism.addr', JSON.stringify({ ...recipient }));
    const btn = $('#pay'); btn.disabled = true; btn.textContent = 'One moment…';
    try {
      const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: Cart.load().map(payloadItem), recipient }) });
      const out = await r.json();
      if (!r.ok) {
        const f = out.field && $('#' + out.field + 'Err');
        if (f) { f.textContent = out.error; $('#' + out.field).setAttribute('aria-invalid', 'true'); $('#' + out.field).focus(); }
        else $('#formErr').textContent = out.error || 'Something went wrong.';
        throw new Error('invalid');
      }
      location.href = out.redirectUrl;
    } catch (err) {
      if (err.message !== 'invalid') $('#formErr').textContent = 'Network problem. Please try again.';
      btn.disabled = false; btn.textContent = 'Continue to payment';
    }
  });
})();
