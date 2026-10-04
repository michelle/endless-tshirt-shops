const $ = (s, r = document) => r.querySelector(s);
const money = (c) => `$${(c / 100).toFixed(2)}`;
const CART_KEY = 'orrery.cart.v1';

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
const debounce = (fn, ms) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};
const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
};

let cfg;
const design = { date: '1969-07-20', name: '', line: '', color: 'navy', accent: 'solar', size: '', qty: 1 };
let cart = [];
try {
  cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  if (!Array.isArray(cart)) cart = [];
} catch {
  cart = [];
}
const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));

function previewUrl(item, w, bg) {
  const p = new URLSearchParams({ date: item.date, name: item.name || 'Your Name', line: item.line || '', color: item.color, accent: item.accent, w: String(w) });
  if (bg) p.set('bg', '1');
  return `/api/preview.png?${p}`;
}

// ---------- builder ----------
const colorMeta = () => cfg.colors.find((c) => c.id === design.color);

function buildControls() {
  const sc = $('#sw-color');
  sc.replaceChildren(...cfg.colors.map((c) => h('button', { type: 'button', class: 'sw', role: 'radio', 'aria-checked': String(c.id === design.color), 'aria-label': c.label, title: c.label, style: `background:${c.hex}`, 'data-id': c.id, onclick: () => { design.color = c.id; syncControls(); } })));
  const ss = $('#sw-size');
  ss.replaceChildren(...cfg.sizes.map((s) => h('button', { type: 'button', class: 'sz', role: 'radio', 'aria-checked': 'false', 'data-id': s, onclick: () => { design.size = s; syncControls(); clearErr('size'); } }, s)));
  $('#f-date').min = cfg.dateRange.min;
  $('#f-date').max = cfg.dateRange.max;
  $('#f-date').value = design.date;
  $('#price-out').textContent = money(cfg.product.priceCents);
}

function syncControls() {
  const tone = colorMeta().tone;
  $('#lbl-color').textContent = colorMeta().label;
  for (const b of $('#sw-color').children) b.setAttribute('aria-checked', String(b.dataset.id === design.color));
  const sa = $('#sw-accent');
  sa.replaceChildren(...cfg.accents.map((a) => h('button', { type: 'button', class: 'sw', role: 'radio', 'aria-checked': String(a.id === design.accent), 'aria-label': a.label, title: a.label, style: `background:${a.hex[tone]}`, onclick: () => { design.accent = a.id; syncControls(); } })));
  $('#lbl-accent').textContent = cfg.accents.find((a) => a.id === design.accent).label;
  for (const b of $('#sw-size').children) b.setAttribute('aria-checked', String(b.dataset.id === design.size));
  $('#qty-out').textContent = design.qty;
  $('#tee-body').setAttribute('fill', colorMeta().hex);
  $('#f-date').value = design.date;
  $('#f-name').value = design.name;
  $('#f-line').value = design.line;
  refreshPreview();
}

let previewSeq = 0;
const refreshPreview = debounce(() => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(design.date)) return;
  const seq = ++previewSeq;
  const art = $('#art');
  art.classList.add('stale');
  $('#art-loading').hidden = !art.getAttribute('src');
  const img = new Image();
  img.onload = () => {
    if (seq !== previewSeq) return;
    art.src = img.src;
    art.classList.remove('stale');
    $('#art-loading').hidden = true;
    clearErr('date');
  };
  img.onerror = () => {
    if (seq !== previewSeq) return;
    art.classList.remove('stale');
    $('#art-loading').hidden = true;
    showErr('date', `Choose a date between ${cfg.dateRange.min.slice(0, 4)} and ${cfg.dateRange.max.slice(0, 4)}.`);
  };
  img.src = previewUrl(design, 1100, false);
  loadCaption(seq);
}, 220);

async function loadCaption(seq) {
  try {
    const r = await fetch(`/api/sky?date=${design.date}`);
    if (!r.ok || seq !== previewSeq) return;
    const s = await r.json();
    const cap = $('#sky-caption');
    cap.replaceChildren(h('b', {}, `${s.weekday}, ${s.date}`), ` · ${s.moon.phase}, ${Math.round(s.moon.illumination * 100)}% lit`);
  } catch {}
}

const showErr = (k, msg) => { const e = $(`[data-err="${k}"]`); if (e) e.textContent = msg; };
const clearErr = (k) => showErr(k, '');

function wireBuilder() {
  $('#f-date').addEventListener('input', (e) => { design.date = e.target.value; refreshPreview(); });
  $('#f-name').addEventListener('input', (e) => { design.name = e.target.value; clearErr('name'); refreshPreview(); });
  $('#f-line').addEventListener('input', (e) => { design.line = e.target.value; refreshPreview(); });
  $('#qty-minus').addEventListener('click', () => { design.qty = Math.max(1, design.qty - 1); syncControls(); });
  $('#qty-plus').addEventListener('click', () => { design.qty = Math.min(cfg.product.maxQtyPerLine, design.qty + 1); syncControls(); });
  $('#btn-closeup').addEventListener('click', (e) => {
    const on = $('.stage').classList.toggle('closeup');
    e.target.setAttribute('aria-pressed', String(on));
    e.target.textContent = on ? 'Back to the full shirt' : 'Close-up of the print';
  });
  $('#btn-surprise').addEventListener('click', () => {
    const y = 1950 + Math.floor(Math.random() * 76), m = 1 + Math.floor(Math.random() * 12), d = 1 + Math.floor(Math.random() * 28);
    design.date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    syncControls();
  });
  $('#design-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    if (!design.name.trim()) { showErr('name', 'Add a name to put on the shirt.'); ok = false; }
    if (!design.size) { showErr('size', 'Pick a size.'); ok = false; }
    if (!design.date || design.date < cfg.dateRange.min || design.date > cfg.dateRange.max) { showErr('date', 'Choose a valid date.'); ok = false; }
    if (!ok) return;
    const item = { date: design.date, name: design.name.trim(), line: design.line.trim(), color: design.color, accent: design.accent, size: design.size, qty: design.qty };
    const same = cart.find((c) => ['date', 'name', 'line', 'color', 'accent', 'size'].every((k) => c[k] === item[k]));
    if (same) same.qty = Math.min(cfg.product.maxQtyPerLine, same.qty + item.qty);
    else if (cart.length >= cfg.product.maxLines) return alert(`Carts are limited to ${cfg.product.maxLines} different designs.`);
    else cart.push(item);
    saveCart();
    renderCart();
    openCart();
  });
}

// ---------- examples ----------
const EXAMPLES = [
  { title: 'Welcome, little one', sub: 'For a new arrival', d: { date: '2026-08-14', name: 'Noah', line: 'Born 3:12 AM · 7 lb 2 oz', color: 'sand', accent: 'ember' } },
  { title: 'The day it began', sub: 'For an anniversary', d: { date: '2019-06-22', name: 'Sam & Jo', line: 'Forever started here', color: 'navy', accent: 'solar' } },
  { title: 'Forty laps around the Sun', sub: 'For a milestone birthday', d: { date: '1986-10-04', name: 'Dana', line: '40 laps and counting', color: 'black', accent: 'ember' } },
  { title: 'One small step', sub: 'For the space nerd', d: { date: '1969-07-20', name: 'Apollo 11', line: 'Tranquility Base', color: 'forest', accent: 'glacier' } },
];
function buildExamples() {
  $('#ex-grid').replaceChildren(...EXAMPLES.map((ex) => h('button', { class: 'ex', type: 'button', onclick: () => { Object.assign(design, ex.d, { size: design.size, qty: 1 }); syncControls(); $('#design').scrollIntoView({ behavior: 'smooth' }); } },
    h('img', { src: previewUrl({ ...ex.d }, 520, true), alt: `${ex.d.name} example design`, loading: 'lazy' }),
    h('div', {}, h('b', {}, ex.title), h('span', {}, `${ex.sub} · try it`)))));
}

// ---------- cart ----------
const drawer = $('#cart');
function openCart() {
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  $('#scrim').hidden = false;
  document.body.style.overflow = 'hidden';
  drawer.focus();
  requestQuote();
}
function closeCart() {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  $('#scrim').hidden = true;
  document.body.style.overflow = '';
}

function renderCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  $('#cart-count').hidden = count === 0;
  $('#cart-count').textContent = count;
  $('#cart-empty').hidden = cart.length > 0;
  $('#checkout-form').hidden = cart.length === 0;
  const colorLabel = (id) => cfg?.colors.find((c) => c.id === id)?.label || id;
  $('#cart-list').replaceChildren(...cart.map((it, idx) => h('li', { class: 'cart-item' },
    h('img', { src: previewUrl(it, 240, true), alt: '' }),
    h('div', {}, h('b', {}, it.name), h('small', {}, fmtDate(it.date), ' · ', colorLabel(it.color), ' · ', it.size.toUpperCase()), it.line ? h('small', {}, `“${it.line}”`) : null,
      h('div', { class: 'ctrl' },
        h('button', { type: 'button', 'aria-label': 'Decrease', onclick: () => changeQty(idx, -1) }, '−'), h('span', {}, it.qty),
        h('button', { type: 'button', 'aria-label': 'Increase', onclick: () => changeQty(idx, 1) }, '+'),
        h('button', { type: 'button', class: 'rm', onclick: () => { cart.splice(idx, 1); saveCart(); renderCart(); requestQuote(); } }, 'Remove'))),
    h('div', { class: 'price' }, money((cfg?.product.priceCents || 0) * it.qty)))));
}
function changeQty(idx, d) {
  cart[idx].qty = Math.min(cfg.product.maxQtyPerLine, Math.max(1, cart[idx].qty + d));
  saveCart(); renderCart(); requestQuote();
}

let quote = null;
let quoteSeq = 0;
const requestQuote = debounce(async () => {
  const country = $('#f-country').value;
  const sub = cart.reduce((s, i) => s + cfg.product.priceCents * i.qty, 0);
  $('#t-sub').textContent = cart.length ? money(sub) : '–';
  quote = null;
  $('#t-ship').textContent = cart.length && country ? 'Calculating…' : '–';
  $('#t-total').textContent = '–';
  $('#btn-pay').disabled = true;
  if (!cart.length || !country) return;
  const seq = ++quoteSeq;
  try {
    const r = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart, country }) });
    const j = await r.json();
    if (seq !== quoteSeq) return;
    if (!r.ok) throw new Error(j.error || 'Could not calculate shipping');
    quote = j;
    $('#t-ship').textContent = money(j.shippingCents);
    $('#t-total').textContent = money(j.totalCents);
    $('#checkout-err').textContent = '';
    $('#btn-pay').disabled = false;
  } catch (e) {
    if (seq !== quoteSeq) return;
    $('#t-ship').textContent = '–';
    $('#checkout-err').textContent = e.message;
  }
}, 200);

function wireCheckout() {
  $('#cart-open').addEventListener('click', openCart);
  $('#cart-close').addEventListener('click', closeCart);
  $('#scrim').addEventListener('click', closeCart);
  $('#cart-empty-link').addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });
  $('#f-country').addEventListener('change', requestQuote);
  const form = $('#checkout-form');
  form.addEventListener('input', (e) => e.target.classList.remove('bad'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#checkout-err');
    err.textContent = '';
    for (const el of form.elements) el.classList?.remove('bad');
    const fd = Object.fromEntries(new FormData(form));
    const btn = $('#btn-pay');
    if (!quote) { err.textContent = 'Please wait for shipping to be calculated.'; return; }
    btn.disabled = true;
    btn.textContent = 'Starting secure checkout…';
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, email: fd.email, expectedTotalCents: quote.totalCents, address: { name: fd.name, line1: fd.line1, line2: fd.line2, city: fd.city, state: fd.state, postalCode: fd.postalCode, country: fd.country, phone: fd.phone } }),
      });
      const j = await r.json();
      if (!r.ok) {
        for (const k of Object.keys(j.fields || {})) form.elements[k]?.classList.add('bad');
        if (r.status === 409) requestQuote();
        throw new Error(j.error || 'Checkout failed');
      }
      window.location.href = j.url;
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
      btn.textContent = payLabel;
    }
  });
}
let payLabel = 'Continue to payment';

function buildCountries() {
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  const opts = cfg.countries.map((c) => ({ c, n: names.of(c) || c })).sort((a, b) => a.n.localeCompare(b.n));
  const sel = $('#f-country');
  sel.replaceChildren(...opts.map(({ c, n }) => h('option', { value: c }, n)));
  const guess = (navigator.language || 'en-US').split('-')[1]?.toUpperCase();
  sel.value = cfg.countries.includes(guess) ? guess : cfg.countries.includes('US') ? 'US' : cfg.countries[0];
}

async function init() {
  cfg = await (await fetch('/api/config')).json();
  if (cfg.payment.demo) {
    $('#demo-banner').hidden = false;
    $('#pay-note').textContent = 'Demo mode: the next page simulates payment. No money is taken.';
    payLabel = 'Continue to (demo) payment';
  } else {
    $('#pay-note').textContent = 'You’ll pay securely with Stripe on the next page. We never see your card details.';
    payLabel = 'Continue to secure payment';
  }
  $('#btn-pay').textContent = payLabel;
  buildControls();
  buildCountries();
  buildExamples();
  wireBuilder();
  wireCheckout();
  syncControls();
  renderCart();
  const params = new URLSearchParams(location.search);
  if (params.get('canceled')) openCart();
  if (location.hash === '#cart') openCart();
}
init().catch((e) => {
  console.error(e);
  document.querySelector('.hero .lede').textContent = 'The store is having trouble loading. Please refresh in a moment.';
});
