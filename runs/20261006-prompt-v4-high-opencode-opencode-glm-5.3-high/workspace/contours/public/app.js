// Contours — configurator. The preview is the print file: the same shared
// renderer (design.js) produces both, and terrain data comes from the server.

import { COLORS, SIZES, EXTENTS, COUNTRIES, SHIPPING_METHODS, COLOR_SIZES, colorByKey, extentByKey, unitPriceCents } from './catalog.js';
import { renderDesignSVG } from './design.js';
import { shirtSVG } from './shirt.js';

const $ = (id) => document.getElementById(id);

const state = {
  lat: 45.9763, lng: 7.6586,
  place: 'Zermatt, Switzerland',
  title: 'The Matterhorn',
  extent: 'massif',
  colorKey: 'black',
  sizeKey: 'l',
  qty: 1,
  country: 'US',
  shippingMethod: 'budget',
};

let terrain = null;
let quote = null;
let terrainBusy = false;

// ---------- build controls ----------

function buildControls() {
  // extents
  $('extent-pills').innerHTML = EXTENTS.map((e) =>
    `<button type="button" class="pill" data-extent="${e.key}" aria-pressed="${e.key === state.extent}" title="${e.hint}">${e.label}</button>`
  ).join('');
  $('extent-pills').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-extent]');
    if (!b) return;
    state.extent = b.dataset.extent;
    refreshPills();
    schedulePreview(0);
  });

  // swatches
  $('swatches').innerHTML = COLORS.map((c) =>
    `<button type="button" class="swatch" data-color="${c.key}" aria-pressed="${c.key === state.colorKey}" style="background:${c.hex}" data-label="${c.label}" title="${c.label}"></button>`
  ).join('');
  $('swatches').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-color]');
    if (!b) return;
    state.colorKey = b.dataset.color;
    // keep size valid for the new colour
    if (!COLOR_SIZES[state.colorKey].includes(state.sizeKey)) state.sizeKey = 'l';
    rebuildSizes();
    refreshPills();
    renderPreview();
    scheduleQuote();
  });

  rebuildSizes();

  $('qty').innerHTML = Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  $('qty').value = state.qty;
  $('qty').addEventListener('change', () => { state.qty = Number($('qty').value); scheduleQuote(); });

  $('country').innerHTML = COUNTRIES.map((c) => `<option value="${c.code}">${c.name}</option>`).join('');
  $('country').value = state.country;
  $('country').addEventListener('change', () => { state.country = $('country').value; scheduleQuote(); });

  $('ship-pills').innerHTML = SHIPPING_METHODS.map((m) =>
    `<button type="button" class="pill" data-ship="${m.key}" aria-pressed="${m.key === state.shippingMethod}" title="${m.hint}">${m.label}</button>`
  ).join('');
  $('ship-pills').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ship]');
    if (!b) return;
    state.shippingMethod = b.dataset.ship;
    refreshPills();
    scheduleQuote();
  });

  $('lat').value = state.lat; $('lng').value = state.lng;
  $('lat').addEventListener('change', () => {
    const v = Number($('lat').value);
    if (Number.isFinite(v) && v >= -84 && v <= 84) { state.lat = v; state.place = $('caption').value || 'Custom spot'; schedulePreview(); }
  });
  $('lng').addEventListener('change', () => {
    const v = Number($('lng').value);
    if (Number.isFinite(v) && v >= -180 && v <= 180) { state.lng = v; state.place = $('caption').value || 'Custom spot'; schedulePreview(); }
  });

  $('title').value = state.title;
  $('title').addEventListener('input', () => { state.title = $('title').value; updateCounts(); renderPreview(); });
  $('caption').value = state.place;
  $('caption').addEventListener('input', () => { state.place = $('caption').value; updateCounts(); renderPreview(); });
  updateCounts();

  $('buy').addEventListener('click', buy);
}

function rebuildSizes() {
  const allowed = COLOR_SIZES[state.colorKey];
  $('size').innerHTML = allowed
    .map((k) => { const s = SIZES.find((x) => x.key === k); return `<option value="${k}">${s.label}${s.upchargeCents ? ' (+$' + s.upchargeCents / 100 + ')' : ''}</option>`; })
    .join('');
  if (!allowed.includes(state.sizeKey)) state.sizeKey = allowed.includes('l') ? 'l' : allowed[Math.floor(allowed.length / 2)];
  $('size').value = state.sizeKey;
  const note = SIZES.find((s) => s.key === state.sizeKey).upchargeCents ? '2XL–4XL are +$4.' : '';
  $('size-note').textContent = note;
  $('size').onchange = () => { state.sizeKey = $('size').value; scheduleQuote(); $('size-note').textContent = SIZES.find((s) => s.key === state.sizeKey).upchargeCents ? '2XL–4XL are +$4.' : ''; };
}

function refreshPills() {
  document.querySelectorAll('[data-extent]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.extent === state.extent));
  document.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.color === state.colorKey));
  document.querySelectorAll('[data-ship]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.ship === state.shippingMethod));
}

function updateCounts() {
  $('title-count').textContent = `${state.title.length}/40`;
  $('place-count').textContent = `${state.place.length}/48`;
}

// ---------- place search ----------

let searchTimer = null;
function initSearch() {
  const input = $('place-search');
  const box = $('place-results');
  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = input.value.trim();
    if (q.length < 2) { box.hidden = true; return; }
    searchTimer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/geo?q=${encodeURIComponent(q)}`);
        const { results } = await r.json();
        if (!results.length) { box.innerHTML = '<button type="button" disabled>No matches — you can enter coordinates below.</button>'; box.hidden = false; return; }
        box.innerHTML = results.map((x, i) =>
          `<button type="button" data-i="${i}"><span class="r-name">${x.name}</span> <span class="r-sub">· ${[x.admin1, x.country].filter(Boolean).join(', ')} · ${x.lat.toFixed(2)}, ${x.lng.toFixed(2)}</span></button>`
        ).join('');
        box.hidden = false;
        box.querySelectorAll('button[data-i]').forEach((b) => b.addEventListener('click', () => {
          const x = results[Number(b.dataset.i)];
          state.lat = x.lat; state.lng = x.lng;
          state.place = [x.admin1, x.country].filter(Boolean).join(', ') || x.name;
          state.title = state.title || x.name;
          input.value = '';
          box.hidden = true;
          $('lat').value = x.lat.toFixed(4);
          $('lng').value = x.lng.toFixed(4);
          $('caption').value = state.place;
          $('title').value = state.title;
          updateCounts();
          schedulePreview(0);
        }));
      } catch { box.hidden = true; }
    }, 300);
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) box.hidden = true; });
}

// ---------- preview ----------

let previewToken = 0;
let previewTimer = null;
function schedulePreview(delay = 500) {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => updatePreview(), delay);
}

async function updatePreview() {
  const token = ++previewToken;
  terrainBusy = true;
  updateBuy();
  try {
    const r = await fetch(`/api/contours?lat=${state.lat}&lng=${state.lng}&extent=${state.extent}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'could not load terrain');
    if (token !== previewToken) return;
    terrain = data;
    renderPreview();
  } catch (e) {
    if (token === previewToken) showError(e.message);
  } finally {
    if (token === previewToken) { terrainBusy = false; updateBuy(); }
  }
}

function renderPreview() {
  if (!terrain) return;
  const design = {
    title: state.title, place: state.place, lat: state.lat, lng: state.lng,
    extentKm: terrain.extentKm, colorKey: state.colorKey, sizeKey: state.sizeKey,
  };
  const { svg } = renderDesignSVG(design, terrain, { width: 1240 });
  $('flat-preview').innerHTML = svg;
  const color = colorByKey(state.colorKey);
  $('shirt-preview').innerHTML = shirtSVG({ shirtHex: color.hex, designSVG: svg, width: 1240 });
  const flat = $('flat-preview').querySelector('svg');
  if (flat) flat.style.width = '210px';
}

// ---------- quote / totals ----------

let quoteTimer = null;
function scheduleQuote() {
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(updateQuote, 400);
}

async function updateQuote() {
  quote = null;
  updateBuy();
  const c = colorByKey(state.colorKey);
  const qs = `country=${state.country}&size=${state.sizeKey}&color=${state.colorKey}&qty=${state.qty}&method=${state.shippingMethod}`;
  try {
    const r = await fetch(`/api/quote?${qs}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'quote failed');
    quote = data;
    $('sum-shirt').textContent = `${state.qty} × Contours Tee (${SIZES.find((s) => s.key === state.sizeKey).label}${state.qty > 1 ? 's' : ''}, ${c.label})`;
    $('sum-shirt-amt').textContent = money(data.shirtCents);
    $('sum-ship').textContent = `Shipping · ${data.shippingMethod}${data.carrier ? ' · ' + data.carrier : ''}`;
    $('sum-ship-amt').textContent = money(data.shippingCents);
    $('sum-total').textContent = money(data.totalCents);
    $('ship-note').textContent = `Live quote — produced by the lab closest to you (${data.carrier || 'carrier to be confirmed'}).`;
    hideError();
  } catch (e) {
    $('sum-ship-amt').textContent = '—';
    $('sum-total').textContent = '—';
    $('ship-note').textContent = '';
    showError(e.message);
  }
  updateBuy();
}

function money(cents) { return '$' + (cents / 100).toFixed(2).replace(/\.00$/, '.00'); }

function updateBuy() {
  const ok = !!terrain && !terrain.flat && !!quote && !terrainBusy;
  $('buy').disabled = !ok;
}

function showError(msg) { $('error').textContent = msg; $('error').hidden = false; }
function hideError() { $('error').hidden = true; }

// ---------- checkout ----------

async function buy() {
  if ($('buy').disabled) return;
  hideError();
  $('buy').disabled = true;
  $('buy').textContent = 'Starting checkout…';
  try {
    const r = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: state.title, place: state.place, lat: state.lat, lng: state.lng,
        extent: state.extent, colorKey: state.colorKey, sizeKey: state.sizeKey,
        qty: state.qty, country: state.country, shippingMethod: state.shippingMethod,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'checkout failed');
    window.location.href = data.url;
  } catch (e) {
    showError(e.message);
    $('buy').disabled = false;
    $('buy').textContent = 'Continue to payment';
  }
}

// ---------- boot ----------

buildControls();
initSearch();
schedulePreview(0);
scheduleQuote();
