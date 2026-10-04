import { PRESETS, LINE_COLORS, GARMENTS, SIZES, LIMITS, normalizeDesign, contrast } from './design.js';
import { shirtSVG } from './mockup.js';

const UNIT = 38;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clone = (o) => JSON.parse(JSON.stringify(o));
const form = $('#controls');
const F = form.elements;

const SAVE_KEY = 'lifeline-design-v1';
const blankDuo = { stopsB: [{ n: '', d: '' }], hub: { n: '', d: '' }, stopsShared: [], bulletB: 'B', colorB: 'sky' };

let state = load() || { design: { ...clone(blankDuo), ...clone(PRESETS.life) }, garment: 'black', sizes: { M: 1 } };
let view = 'shirt';
let futureText = state.design.future || 'Next stop: ???';

function load() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}
const save = () => localStorage.setItem(SAVE_KEY, JSON.stringify(state));

// ---------- hero ----------
const heroSamples = [
  ['life', 'black'],
  ['love', 'natural'],
  ['crawl', 'heather'],
];
function renderHero() {
  $('#heroShirts').innerHTML = heroSamples
    .map(([p, g]) => `<button type="button" data-preset="${p}" data-garment="${g}" aria-label="Start from this design">${shirtSVG(normalizeDesign(PRESETS[p]), g)}</button>`)
    .join('');
}
$('#heroShirts').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  applyPreset(b.dataset.preset, b.dataset.garment);
  $('#design').scrollIntoView();
});

// ---------- form building ----------
function stopRow(list, i, stop, count, max) {
  return `<div class="stop-row" data-list="${list}" data-i="${i}">
    <input data-k="n" maxlength="${LIMITS.name}" placeholder="Stop name" value="${attr(stop.n)}" aria-label="Stop ${i + 1} name">
    <input data-k="d" maxlength="${LIMITS.note}" placeholder="Note (optional)" value="${attr(stop.d)}" aria-label="Stop ${i + 1} note">
    <span class="tools">
      <button type="button" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
      <button type="button" data-act="down" ${i === count - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
      <button type="button" data-act="del" aria-label="Remove stop">✕</button>
    </span>
  </div>`;
}
const attr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function maxFor(list) {
  const d = state.design;
  if (list === 'stopsShared') return LIMITS.shared[1];
  return d.mode === 'solo' ? LIMITS.solo[1] : LIMITS.branch[1];
}

function buildStops() {
  const d = state.design;
  $$('.stops').forEach((el) => {
    const list = el.dataset.list;
    const visible = el.closest('fieldset').classList.contains(d.mode === 'solo' ? 'solo-only' : 'duo-only');
    if (!visible) {
      el.innerHTML = '';
      return;
    }
    const stops = d[list] || [];
    const max = maxFor(list);
    el.innerHTML =
      stops.map((s, i) => stopRow(list, i, s, stops.length, max)).join('') +
      (stops.length < max ? `<button type="button" class="add" data-add="${list}">+ Add stop</button>` : '');
  });
}

function buildSwatches() {
  $$('.swatches').forEach((el) => {
    const key = el.dataset.color;
    el.innerHTML = Object.entries(LINE_COLORS)
      .map(([k, c]) => `<button type="button" data-k="${k}" title="${c.label}" aria-label="${c.label}" style="background:${c.hex}" class="${state.design[key] === k ? 'on' : ''}"></button>`)
      .join('');
  });
  $('#garments').innerHTML = Object.entries(GARMENTS)
    .map(([k, g]) => `<button type="button" data-g="${k}" title="${g.label}" aria-label="${g.label}" style="background:${g.hex}" class="${state.garment === k ? 'on' : ''}"></button>`)
    .join('');
  $('#garmentName').textContent = GARMENTS[state.garment].label;
  const ba = $('[name=bullet]');
  const bb = $('[name=bulletB]');
  ba.style.background = LINE_COLORS[state.design.colorA].hex;
  ba.style.setProperty('color', LINE_COLORS[state.design.colorA].text, 'important');
  bb.style.background = LINE_COLORS[state.design.colorB || 'sky'].hex;
  bb.style.setProperty('color', LINE_COLORS[state.design.colorB || 'sky'].text, 'important');
}

function buildSizes() {
  $('#sizes').innerHTML = SIZES.map((s) => {
    const n = state.sizes[s] || 0;
    return `<div class="size ${n ? 'on' : ''}" data-size="${s}"><b>${s}</b><button type="button" data-d="-1" aria-label="Fewer ${s}">−</button><span>${n}</span><button type="button" data-d="1" aria-label="More ${s}">+</button></div>`;
  }).join('');
  const qty = Object.values(state.sizes).reduce((a, b) => a + b, 0);
  $('#qtyLabel').textContent = `${qty} shirt${qty === 1 ? '' : 's'}`;
  $('#subtotal').textContent = `$${(qty * UNIT).toFixed(2)}`;
}

function syncFields() {
  const d = state.design;
  form.className = `controls ${d.mode}`;
  F.title.value = d.title || '';
  F.subtitle.value = d.subtitle || '';
  F.bullet.value = d.bullet || '';
  F.bulletB.value = d.bulletB || '';
  F.hubN.value = d.hub?.n || '';
  F.hubD.value = d.hub?.d || '';
  F.futureOn.checked = !!d.future;
  F.future.value = d.future || futureText;
  F.future.disabled = !d.future;
  $('#lineALegend').textContent = d.mode === 'duo' ? 'Line colours & badges' : 'Line colour & badge';
  $$('#mode button').forEach((b) => b.classList.toggle('on', b.dataset.mode === d.mode));
  $$('#shape button').forEach((b) => b.classList.toggle('on', b.dataset.shape === (d.shape || 'winding')));
}

function rebuild() {
  syncFields();
  buildStops();
  buildSwatches();
  buildSizes();
  update();
}

// ---------- preview ----------
let raf = 0;
function update() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    save();
    const err = $('#error');
    let design;
    try {
      design = normalizeDesign(state.design);
      err.hidden = true;
      $('#checkout').disabled = false;
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
      $('#checkout').disabled = true;
    }
    $('#preview').innerHTML = shirtSVG(design, state.garment, { flat: view === 'flat', zoom: view === 'zoom' });
    const g = GARMENTS[state.garment];
    const weak = [state.design.colorA, state.design.mode === 'duo' ? state.design.colorB : null]
      .filter(Boolean)
      .filter((k) => contrast(LINE_COLORS[k].hex, g.hex) < 1.6)
      .map((k) => LINE_COLORS[k].label);
    const w = $('#contrastWarn');
    w.hidden = !weak.length;
    if (weak.length) w.textContent = `Heads up: the ${weak.join(' & ')} line won't stand out much on a ${g.label.toLowerCase()} shirt. Try another line colour or shirt.`;
  });
}

// ---------- events ----------
function applyPreset(name, garment) {
  state.design = { ...clone(blankDuo), ...clone(PRESETS[name]) };
  if (garment) state.garment = garment;
  if (state.design.future) futureText = state.design.future;
  rebuild();
}

$('#presets').addEventListener('click', (e) => {
  const b = e.target.closest('[data-preset]');
  if (b) applyPreset(b.dataset.preset);
});

$('#mode').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b || b.dataset.mode === state.design.mode) return;
  const d = state.design;
  if (b.dataset.mode === 'duo') {
    // Keep the user's work: first stops become line A, last becomes the interchange onward.
    const stops = d.stopsA.filter((s) => s.n);
    d.mode = 'duo';
    d.stopsA = stops.slice(0, Math.min(3, Math.max(1, stops.length - 2)));
    d.stopsB = d.stopsB?.some((s) => s.n) ? d.stopsB : [{ n: 'Their hometown', d: '' }];
    d.hub = d.hub?.n ? d.hub : stops[d.stopsA.length] || { n: 'Where we met', d: '' };
    d.stopsShared = d.stopsShared?.length ? d.stopsShared : stops.slice(d.stopsA.length + 1, d.stopsA.length + 6);
  } else {
    d.mode = 'solo';
    d.stopsA = [...d.stopsA, d.hub, ...(d.stopsShared || [])].filter((s) => s?.n).slice(0, LIMITS.solo[1]);
    while (d.stopsA.length < LIMITS.solo[0]) d.stopsA.push({ n: '', d: '' });
  }
  rebuild();
});

$('#shape').addEventListener('click', (e) => {
  const b = e.target.closest('[data-shape]');
  if (!b) return;
  state.design.shape = b.dataset.shape;
  syncFields();
  update();
});

$$('.preview-card .seg button').forEach((b) =>
  b.addEventListener('click', () => {
    view = b.dataset.view;
    $$('.preview-card .seg button').forEach((x) => x.classList.toggle('on', x === b));
    update();
  }),
);

form.addEventListener('input', (e) => {
  const t = e.target;
  const d = state.design;
  const row = t.closest('.stop-row[data-list]');
  if (row) {
    d[row.dataset.list][+row.dataset.i][t.dataset.k] = t.value;
  } else if (t.name === 'hubN' || t.name === 'hubD') {
    d.hub = { ...d.hub, [t.name === 'hubN' ? 'n' : 'd']: t.value };
  } else if (t.name === 'futureOn') {
    d.future = t.checked ? F.future.value || futureText : '';
    F.future.disabled = !t.checked;
  } else if (t.name === 'future') {
    futureText = t.value;
    d.future = t.value;
  } else if (['title', 'subtitle', 'bullet', 'bulletB'].includes(t.name)) {
    d[t.name] = t.value;
  }
  update();
});

form.addEventListener('click', (e) => {
  const d = state.design;
  const sw = e.target.closest('.swatches button');
  if (sw) {
    d[sw.parentElement.dataset.color] = sw.dataset.k;
    buildSwatches();
    return update();
  }
  const gb = e.target.closest('#garments button');
  if (gb) {
    state.garment = gb.dataset.g;
    buildSwatches();
    return update();
  }
  const add = e.target.closest('[data-add]');
  if (add) {
    d[add.dataset.add].push({ n: '', d: '' });
    buildStops();
    $(`.stops[data-list="${add.dataset.add}"] .stop-row:last-of-type input`)?.focus();
    return update();
  }
  const act = e.target.closest('[data-act]');
  if (act) {
    const row = act.closest('.stop-row');
    const list = d[row.dataset.list];
    const i = +row.dataset.i;
    if (act.dataset.act === 'del') list.splice(i, 1);
    if (act.dataset.act === 'up') [list[i - 1], list[i]] = [list[i], list[i - 1]];
    if (act.dataset.act === 'down') [list[i + 1], list[i]] = [list[i], list[i + 1]];
    buildStops();
    return update();
  }
  const sz = e.target.closest('.size button');
  if (sz) {
    const s = sz.closest('.size').dataset.size;
    const total = Object.values(state.sizes).reduce((a, b) => a + b, 0);
    const delta = +sz.dataset.d;
    if (delta > 0 && total >= 20) return;
    state.sizes[s] = Math.max(0, (state.sizes[s] || 0) + delta);
    buildSizes();
    save();
  }
});

$('#checkout').addEventListener('click', async () => {
  const btn = $('#checkout');
  const err = $('#error');
  err.hidden = true;
  const qty = Object.values(state.sizes).reduce((a, b) => a + b, 0);
  if (!qty) {
    err.textContent = 'Pick at least one size.';
    err.hidden = false;
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Opening checkout…';
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ design: state.design, garment: state.garment, sizes: state.sizes }),
    });
    const body = await res.json();
    if (!res.ok || !body.url) throw new Error(body.error || 'Checkout failed.');
    location.href = body.url;
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
    btn.disabled = false;
    btn.textContent = 'Checkout securely →';
  }
});

// Fonts must be ready before measuring/drawing SVG text.
Promise.all(['500', '600', '700'].map((w) => document.fonts.load(`${w} 20px Barlow`)).concat([document.fonts.load('800 20px "Barlow Condensed"'), document.fonts.load('700 20px "Barlow Condensed"')]))
  .catch(() => {})
  .finally(() => {
    renderHero();
    rebuild();
  });
