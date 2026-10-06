import {
  COUNTRIES, LIMITS, LINE_COLORS, SHIRT_COLORS, SIZES, lineColor, shirtColor, unitPrice, validateDesign, validateOrder,
} from './catalog.js';
import { renderSVG } from './design.js';
import { shirtMockup } from './mockup.js';
import { PRESETS } from './presets.js';

const $ = (sel, root = document) => root.querySelector(sel);
const money = (cents) => `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;
const clone = (o) => JSON.parse(JSON.stringify(o));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SAVE_KEY = 'lifeline:v1';
const saved = (() => {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
})();

const state = saved?.design
  ? saved
  : { design: clone(PRESETS[0].design), shirt: PRESETS[0].shirt, items: { m: 1 }, country: guessCountry() };
let view = 'shirt';
let shipping = { key: '', options: null, error: null, loading: false };

function guessCountry() {
  const region = (navigator.language || 'en-US').split('-')[1]?.toUpperCase();
  return COUNTRIES.some(([c]) => c === region) ? region : 'US';
}

// ── Hero ─────────────────────────────────────────────────────────────────────
$('#heroShirts').innerHTML = [PRESETS[1], PRESETS[2], PRESETS[0]]
  .map((p) => shirtMockup(validateDesign(p.design).design, p.shirt))
  .join('');

// ── Presets ──────────────────────────────────────────────────────────────────
$('#presets').innerHTML = PRESETS.map((p) => `<button type="button" data-preset="${p.id}">${p.label}</button>`).join('');
$('#presets').addEventListener('click', (e) => {
  const p = PRESETS.find((x) => x.id === e.target.dataset.preset);
  if (!p) return;
  state.design = clone(p.design);
  state.shirt = p.shirt;
  syncAll();
});

// ── Line fields ──────────────────────────────────────────────────────────────
for (const key of ['letter', 'name', 'tagline', 'next']) {
  $(`#${key}`).addEventListener('input', (e) => {
    state.design[key] = key === 'letter' ? e.target.value.toUpperCase() : e.target.value;
    update();
  });
}

function swatchButtons(colors, current, attr) {
  return colors
    .map((c) => `<button type="button" class="swatch" style="background:${c.hex}" title="${c.name}" aria-label="${c.name}" aria-pressed="${c.id === current}" ${attr}="${c.id}"></button>`)
    .join('');
}

$('#lineColors').addEventListener('click', (e) => {
  const id = e.target.dataset.line;
  if (!id) return;
  state.design.color = id;
  renderLineColors();
  update();
});
function renderLineColors() {
  $('#lineColors').innerHTML = swatchButtons(LINE_COLORS, state.design.color, 'data-line');
}

// ── Stops ────────────────────────────────────────────────────────────────────
function renderStops() {
  const stops = state.design.stops;
  $('#stops').style.setProperty('--line-c', lineColor(state.design.color)?.hex);
  $('#stops').innerHTML = stops
    .map((s, i) => `
    <li class="stop" data-i="${i}">
      <div class="stop-main">
        <input data-k="name" data-field="stops.${i}.name" maxlength="${LIMITS.stopName}" placeholder="Stop name (e.g. Toledo)" value="${esc(s.name)}" aria-label="Stop ${i + 1} name">
        <input data-k="note" data-field="stops.${i}.note" maxlength="${LIMITS.stopNote}" placeholder="Note (e.g. Born · 1991)" value="${esc(s.note)}" aria-label="Stop ${i + 1} note">
        <div class="stop-tools">
          <button type="button" class="icon ${s.transfer ? 'on' : ''}" data-act="transfer" title="Transfer: someone joined your line here" aria-label="Toggle transfer">⇄</button>
          <button type="button" class="icon" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
          <button type="button" class="icon" data-act="down" ${i === stops.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
          <button type="button" class="icon" data-act="remove" ${stops.length <= LIMITS.minStops ? 'disabled' : ''} aria-label="Remove stop">✕</button>
        </div>
      </div>
      ${s.transfer ? `
      <div class="transfer" data-field="stops.${i}.transfer">
        Transfer to the
        <input data-k="tletter" maxlength="2" value="${esc(s.transfer.letter)}" aria-label="Transfer line letter">
        line
        <span class="swatches">${swatchButtons(LINE_COLORS, s.transfer.color, 'data-tcolor')}</span>
      </div>` : ''}
    </li>`)
    .join('');
  $('#stopCount').textContent = `${stops.length} / ${LIMITS.maxStops}`;
  $('#addStop').disabled = stops.length >= LIMITS.maxStops;
}

$('#stops').addEventListener('input', (e) => {
  const li = e.target.closest('.stop');
  const stop = state.design.stops[li.dataset.i];
  const k = e.target.dataset.k;
  if (k === 'tletter') stop.transfer.letter = e.target.value.toUpperCase();
  else stop[k] = e.target.value;
  update();
});

$('#stops').addEventListener('click', (e) => {
  const li = e.target.closest('.stop');
  if (!li) return;
  const i = Number(li.dataset.i);
  const stops = state.design.stops;
  if (e.target.dataset.tcolor) {
    stops[i].transfer.color = e.target.dataset.tcolor;
  } else {
    const act = e.target.dataset.act;
    if (!act) return;
    if (act === 'up' && i > 0) [stops[i - 1], stops[i]] = [stops[i], stops[i - 1]];
    if (act === 'down' && i < stops.length - 1) [stops[i + 1], stops[i]] = [stops[i], stops[i + 1]];
    if (act === 'remove' && stops.length > LIMITS.minStops) stops.splice(i, 1);
    if (act === 'transfer') {
      const used = new Set([state.design.letter, ...stops.map((s) => s.transfer?.letter)]);
      const letter = [...'SABCDEFGQRWZ'].find((l) => !used.has(l)) || 'S';
      const color = ['blue', 'green', 'purple', 'orange'].find((c) => c !== state.design.color);
      stops[i].transfer = stops[i].transfer ? null : { letter, color };
    }
  }
  renderStops();
  update();
});

$('#addStop').addEventListener('click', () => {
  if (state.design.stops.length >= LIMITS.maxStops) return;
  state.design.stops.push({ name: '', note: '', transfer: null });
  renderStops();
  update();
  $(`#stops .stop:last-child input`).focus();
});

// ── Shirt + sizes ────────────────────────────────────────────────────────────
function renderShirt() {
  $('#shirtColors').innerHTML = swatchButtons(SHIRT_COLORS, state.shirt, 'data-shirt');
  $('#shirtName').textContent = shirtColor(state.shirt).name;
}
$('#shirtColors').addEventListener('click', (e) => {
  if (!e.target.dataset.shirt) return;
  state.shirt = e.target.dataset.shirt;
  renderShirt();
  update();
});

function renderSizes() {
  $('#sizes').innerHTML = SIZES.map((s) => {
    const q = state.items[s.id] || 0;
    return `<div class="size ${q ? 'has' : ''}" data-size="${s.id}">
      <b>${s.label}</b><small>${s.surcharge ? `+${money(s.surcharge)}` : ''}</small>
      <div class="qty"><button type="button" data-d="-1" aria-label="Fewer ${s.label}">−</button><output>${q}</output><button type="button" data-d="1" aria-label="More ${s.label}">+</button></div>
    </div>`;
  }).join('');
}
$('#sizes').addEventListener('click', (e) => {
  const d = Number(e.target.dataset.d);
  if (!d) return;
  const size = e.target.closest('.size').dataset.size;
  const total = Object.values(state.items).reduce((a, b) => a + b, 0);
  if (d > 0 && total >= LIMITS.maxShirts) return;
  state.items[size] = Math.max(0, (state.items[size] || 0) + d);
  if (!state.items[size]) delete state.items[size];
  renderSizes();
  update();
});

// ── Country ──────────────────────────────────────────────────────────────────
$('#country').innerHTML = COUNTRIES.map(([c, n]) => `<option value="${c}">${n}</option>`).join('');
$('#country').addEventListener('change', (e) => {
  state.country = e.target.value;
  update();
});

// ── Preview ──────────────────────────────────────────────────────────────────
document.querySelector('.preview-toggle').addEventListener('click', (e) => {
  if (!e.target.dataset.view) return;
  view = e.target.dataset.view;
  for (const b of document.querySelectorAll('.preview-toggle button')) b.classList.toggle('on', b.dataset.view === view);
  renderPreview();
});

function previewDesign() {
  // Show placeholders for empty fields so the layout is visible while typing.
  const d = clone(state.design);
  d.letter ||= '?';
  d.name ||= 'Your Line';
  d.stops = d.stops.map((s, i) => ({ ...s, name: s.name || `Stop ${i + 1}`, transfer: s.transfer?.letter ? s.transfer : null }));
  return validateDesign(d).design;
}

function renderPreview() {
  const shirt = shirtColor(state.shirt);
  const el = $('#preview');
  el.classList.toggle('print', view === 'print');
  el.classList.toggle('dark', view === 'print' && shirt.dark);
  el.innerHTML = view === 'shirt'
    ? shirtMockup(previewDesign(), state.shirt)
    : renderSVG(previewDesign(), { dark: shirt.dark }).replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" ');
  $('#previewCap').textContent = view === 'shirt'
    ? 'Live preview. This is the exact artwork we send to the printer.'
    : `Print file: 4680 × 5790 px (15.6 × 19.3 in at 300 dpi), transparent background, ${shirt.dark ? 'white' : 'black'} type for a ${shirt.name.toLowerCase()} shirt.`;
}

// ── Pricing + shipping ───────────────────────────────────────────────────────
const orderItems = () => Object.entries(state.items).map(([size, qty]) => ({ size, qty }));

let shipTimer;
function requestShipping() {
  const items = orderItems();
  const key = JSON.stringify([state.country, state.shirt, items]);
  if (key === shipping.key) return;
  shipping = { key, options: null, error: null, loading: items.length > 0 };
  clearTimeout(shipTimer);
  if (!items.length) return renderSummary();
  renderSummary();
  shipTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/shipping', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: state.country, shirt: state.shirt, items }),
      });
      const data = await res.json();
      if (shipping.key !== key) return;
      shipping = { key, options: data.options ?? null, error: data.error ?? null, loading: false };
    } catch {
      if (shipping.key === key) shipping = { key, options: null, error: 'Couldn’t load shipping prices.', loading: false };
    }
    renderSummary();
  }, 350);
}

function renderSummary() {
  const items = orderItems();
  const count = items.reduce((n, it) => n + it.qty, 0);
  const subtotal = items.reduce((n, it) => n + it.qty * unitPrice(it.size), 0);
  const rows = items.map((it) => {
    const label = SIZES.find((s) => s.id === it.size).label;
    return `<div class="line"><span>${it.qty} × ${label}</span><span>${money(it.qty * unitPrice(it.size))}</span></div>`;
  });
  let ship = '<span class="muted">Calculating…</span>';
  let total = '—';
  if (!count) ship = '<span class="muted">Choose a size</span>';
  else if (shipping.error) ship = `<span class="muted">${esc(shipping.error)}</span>`;
  else if (shipping.options) {
    const std = shipping.options[0];
    ship = shipping.options.map((o) => `${o.label} ${money(o.amount)}`).join(' · ');
    total = `${money(subtotal + std.amount)}`;
  }
  $('#summary').innerHTML = `
    ${rows.join('') || '<div class="line muted"><span>No shirts selected</span></div>'}
    <div class="line"><span>Shipping</span><span>${ship}</span></div>
    <div class="line total"><span>Total${shipping.options?.length > 1 ? ' (standard)' : ''}</span><span>${total}</span></div>`;
}

// ── Validation display ───────────────────────────────────────────────────────
function showErrors(errors) {
  document.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
  document.querySelectorAll('.err').forEach((el) => el.remove());
  for (const { field, message } of errors) {
    const el = document.querySelector(`[data-field="${field}"]`);
    if (!el) continue;
    el.classList.add('invalid');
    const holder = el.closest('.field, .stop') || el.parentElement;
    if (!holder.querySelector(`.err[data-for="${field}"]`)) {
      holder.insertAdjacentHTML('beforeend', `<div class="err" data-for="${field}">${esc(message)}</div>`);
    }
  }
}

// ── Sync + update ────────────────────────────────────────────────────────────
function syncAll() {
  for (const key of ['letter', 'name', 'tagline', 'next']) $(`#${key}`).value = state.design[key] ?? '';
  $('#country').value = state.country;
  renderLineColors();
  renderStops();
  renderShirt();
  renderSizes();
  update();
}

let raf;
function update() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    renderPreview();
    requestShipping();
    renderSummary();
    $('#stops').style.setProperty('--line-c', lineColor(state.design.color)?.hex);
    if (document.querySelector('.err')) showErrors(validateDesign(state.design).errors);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* private mode */ }
  });
}

// ── Checkout ─────────────────────────────────────────────────────────────────
$('#form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formError = $('#formError');
  formError.textContent = '';
  const dv = validateDesign(state.design);
  showErrors(dv.errors);
  const ov = validateOrder({ shirt: state.shirt, items: orderItems(), country: state.country });
  if (!dv.ok) {
    formError.textContent = 'A few fields need attention before we can print.';
    document.querySelector('.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (!ov.ok) return (formError.textContent = ov.errors.join('. '));

  const btn = $('#checkout');
  btn.disabled = true;
  btn.textContent = 'Opening secure checkout…';
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ design: dv.design, shirt: state.shirt, items: ov.items, country: state.country }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      if (data.fields) showErrors(data.fields);
      throw new Error(data.error || 'Checkout failed');
    }
    location.href = data.url;
  } catch (err) {
    formError.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Checkout securely →';
  }
});

window.addEventListener('pageshow', () => {
  const btn = $('#checkout');
  btn.disabled = false;
  btn.textContent = 'Checkout securely →';
});

syncAll();
