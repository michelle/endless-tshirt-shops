'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = (c) => '$' + (c / 100).toFixed(2);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let cfgPromise;
const getConfig = () => (cfgPromise ||= fetch('/api/config').then((r) => r.json()));

const PALETTES = {
  starlight: { label: 'Starlight', dark: '#F4F7FF', light: '#16233F' },
  gilt: { label: 'Gilt', dark: '#F6D58B', light: '#7D5300' },
  aurora: { label: 'Aurora', dark: '#8CF0DC', light: '#0C6B66' },
  rose: { label: 'Rose', dark: '#FFB8CC', light: '#A3194A' },
};

/* ---------- cart (browser storage; the server re-validates and re-prices everything) ---------- */
const Cart = {
  key: 'asterism.cart.v1',
  load() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } },
  save(items) { localStorage.setItem(this.key, JSON.stringify(items)); document.dispatchEvent(new Event('cart:change')); },
  add(item) {
    const items = this.load();
    const same = items.find((i) => i.color === item.color && i.size === item.size && JSON.stringify(i.design) === JSON.stringify(item.design));
    if (same) same.qty = Math.min(10, same.qty + item.qty);
    else items.push({ id: Math.random().toString(36).slice(2, 10), ...item });
    this.save(items);
  },
  remove(id) { this.save(this.load().filter((i) => i.id !== id)); },
  setQty(id, qty) { this.save(this.load().map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(10, qty)) } : i))); },
  clear() { this.save([]); },
  count() { return this.load().reduce((n, i) => n + i.qty, 0); },
};

/* ---------- designs ---------- */
function designParams(design, colorId, extra = {}) {
  const p = new URLSearchParams({ name: design.name || 'Your Name', variant: design.variant || 0, palette: design.palette || 'starlight', labels: design.labels ? '1' : '0', color: colorId, ...extra });
  if (design.date) p.set('date', design.date);
  if (design.place) p.set('place', design.place);
  if (design.message) p.set('message', design.message);
  return p;
}

async function fetchDesign(design, colorId, extra = {}, signal) {
  const res = await fetch('/api/design.svg?' + designParams(design, colorId, extra), { signal });
  if (!res.ok) {
    let msg = 'Could not draw that design.';
    try { msg = (await res.json()).error || msg; } catch { /* keep default */ }
    const e = new Error(msg); e.userMessage = msg; throw e;
  }
  return res.text();
}

/* ---------- shirt mockup ---------- */
let mockId = 0;
function shirtSvg(color, designSvg, { cls = 'shirt', label = 'T-shirt preview' } = {}) {
  const id = 'm' + ++mockId;
  const dark = color.tone === 'dark';
  const shade = dark ? 0.5 : 0.22;
  const body = 'M215 48C240 112 360 112 385 48L482 78C514 92 542 134 574 207L497 252C490 244 481 238 473 234L480 592Q300 606 120 592L127 234C119 238 110 244 103 252L26 207C58 134 86 92 118 78Z';
  const art = designSvg
    ? designSvg.replace(/^<svg [^>]*>/, '<svg x="159.5" y="112" width="281" height="347" viewBox="0 0 4680 5790" overflow="hidden">')
    : '';
  const heather = color.heather
    ? `<filter id="${id}h" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 -.1"/></filter>`
    : '';
  return `<svg class="${cls}" viewBox="0 0 600 640" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">
<defs>
<clipPath id="${id}c"><path d="${body}"/></clipPath>
<linearGradient id="${id}s" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="${shade}"/><stop offset=".2" stop-color="#000" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${shade}"/></linearGradient>
<linearGradient id="${id}v" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${dark ? 0.07 : 0.0}"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${dark ? 0.35 : 0.14}"/></linearGradient>
<radialGradient id="${id}f" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#fff" stop-opacity="${dark ? 0.06 : 0.35}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="${id}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
${heather}
</defs>
<ellipse cx="300" cy="610" rx="190" ry="14" fill="#000" opacity=".35" filter="url(#${id}b)"/>
<path d="${body}" fill="${color.hex}"/>
<g clip-path="url(#${id}c)">
  ${color.heather ? `<rect width="600" height="640" filter="url(#${id}h)" opacity=".35"/>` : ''}
  <rect width="600" height="640" fill="url(#${id}f)"/>
  <rect width="600" height="640" fill="url(#${id}s)"/>
  <rect width="600" height="640" fill="url(#${id}v)"/>
  <g fill="none" stroke="#000" stroke-opacity="${dark ? 0.35 : 0.1}" stroke-width="2">
    <path d="M127 234C137 170 128 118 118 78M473 234C463 170 472 118 482 78"/>
    <path d="M103 252C140 262 160 270 190 262M497 252C460 262 440 270 410 262" stroke-opacity="${dark ? 0.2 : 0.07}"/>
  </g>
  <g fill="none" stroke="#fff" stroke-opacity="${dark ? 0.045 : 0.5}" stroke-width="14" stroke-linecap="round" filter="url(#${id}b)">
    <path d="M200 300C230 340 250 420 232 560M400 310C372 350 360 430 380 560M150 130C170 160 190 200 188 230"/>
  </g>
  <path d="M215 48C245 20 355 20 385 48C360 112 240 112 215 48Z" fill="#000" fill-opacity="${dark ? 0.45 : 0.22}"/>
</g>
<path d="M215 48C240 112 360 112 385 48" fill="none" stroke="${dark ? '#fff' : '#000'}" stroke-opacity="${dark ? 0.1 : 0.12}" stroke-width="9"/>
<path d="M215 48C240 112 360 112 385 48" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.5" transform="translate(0 5)"/>
${art}
</svg>`;
}

/* ---------- header, cart drawer, toast ---------- */
function headerHtml(active) {
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site"><div class="wrap">
  <a class="logo" href="/" aria-label="Asterism home"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0Q13.6 9.4 24 12Q13.6 14.6 12 24Q10.4 14.6 0 12Q10.4 9.4 12 0Z"/></svg>Asterism</a>
  <nav class="main" aria-label="Main"><a href="/#studio">Design yours</a><a href="/#how">How it works</a><a href="/#gallery">Gallery</a><a href="/#faq">FAQ</a></nav>
  <button class="cart-btn" id="cartBtn" aria-haspopup="dialog">Cart <b id="cartCount" data-n="0">0</b></button>
</div></header>
<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" aria-label="Cart" aria-hidden="true">
  <header><h3>Your cart</h3><button class="x" id="drawerClose" aria-label="Close cart">&times;</button></header>
  <div class="body" id="drawerBody"></div>
  <footer id="drawerFoot"></footer>
</aside>
<div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
}

async function renderDrawer() {
  const cfg = await getConfig();
  const items = Cart.load();
  $('#cartCount').textContent = Cart.count();
  $('#cartCount').dataset.n = Cart.count();
  const body = $('#drawerBody');
  if (!items.length) {
    body.innerHTML = '<p class="muted" style="padding:30px 0">Your cart is empty. Name a constellation and add it here.</p>';
    $('#drawerFoot').innerHTML = '<a class="btn ghost block" href="/#studio">Design a shirt</a>';
    return;
  }
  body.innerHTML = items.map((i) => {
    const c = cfg.colors.find((x) => x.id === i.color);
    return `<div class="line" data-id="${i.id}"><div class="thumb">${shirtSvg(c, '', { label: '' })}</div>
      <div><div class="t">${esc(i.design.name)}</div><div class="m">${esc(c.label)} · ${i.size.toUpperCase()}</div>
      <div class="acts"><div class="qty"><button data-a="dec" aria-label="Fewer">&minus;</button><span>${i.qty}</span><button data-a="inc" aria-label="More">+</button></div><button class="link" data-a="rm">Remove</button></div></div>
      <div>${money(cfg.price * i.qty)}</div></div>`;
  }).join('');
  $('#drawerFoot').innerHTML = `<div class="sumrow"><span>Subtotal</span><b>${money(items.reduce((n, i) => n + i.qty * cfg.price, 0))}</b></div><p class="muted" style="font-size:14px">Shipping calculated at checkout.</p><a class="btn block" href="/checkout.html">Checkout</a>`;
  // Fill thumbnails with the real artwork.
  items.forEach(async (i) => {
    const c = cfg.colors.find((x) => x.id === i.color);
    try {
      const svg = await fetchDesign(i.design, i.color, { idp: 'd' + i.id });
      const el = $(`.line[data-id="${i.id}"] .thumb`);
      if (el) el.innerHTML = shirtSvg(c, svg, { label: `${i.design.name} shirt` });
    } catch { /* thumbnail is cosmetic */ }
  });
}

function openDrawer(on = true) {
  $('#drawer').classList.toggle('on', on);
  $('#scrim').classList.toggle('on', on);
  $('#drawer').setAttribute('aria-hidden', String(!on));
  if (on) renderDrawer();
}

function initChrome(active) {
  document.body.insertAdjacentHTML('afterbegin', headerHtml(active));
  $('#cartBtn').onclick = () => openDrawer(true);
  $('#drawerClose').onclick = $('#scrim').onclick = () => openDrawer(false);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openDrawer(false); });
  $('#drawerBody').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const id = b.closest('.line').dataset.id;
    const item = Cart.load().find((i) => i.id === id); if (!item) return;
    if (b.dataset.a === 'rm') Cart.remove(id);
    else Cart.setQty(id, item.qty + (b.dataset.a === 'inc' ? 1 : -1));
  });
  document.addEventListener('cart:change', renderDrawer);
  renderDrawer();
}

const footerHtml = `<footer><div class="wrap"><div><div class="logo" style="margin-bottom:8px"><svg viewBox="0 0 24 24" aria-hidden="true" style="width:18px;height:18px;fill:var(--gold)"><path d="M12 0Q13.6 9.4 24 12Q13.6 14.6 12 24Q10.4 14.6 0 12Q10.4 9.4 12 0Z"/></svg>Asterism</div>Every shirt is printed once, for one person.<br>Direct-to-garment printing by Prodigi.</div>
<div><a href="/policies.html#shipping">Shipping</a><a href="/policies.html#returns">Returns</a><a href="/policies.html#privacy">Privacy</a><a href="/policies.html#terms">Terms</a></div></div></footer>`;
