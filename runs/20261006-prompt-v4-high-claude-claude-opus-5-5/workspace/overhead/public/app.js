import { parse } from './vendor/opentype.mjs';
import { renderSVG, INKS, SHIRTS, CANVAS, CENTER, LIMITS, unsupportedChars } from './shared/render.js';
import { shirtSVG, ART } from './shared/mockup.js';

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'overhead-design-v1';

const defaults = {
  lat: 40.6501, lon: -73.9496, tz: 'America/New_York', placeName: 'Brooklyn, New York, United States',
  date: '2021-08-12', time: '22:30',
  headline: 'Under this sky', place: '', dateLine: '', coords: '',
  dirty: { place: false, dateLine: false, coords: false },
  color: 'black', ink: 'starlight', lines: true, names: false, planets: true, ecliptic: false,
  size: 'l', qty: 1, country: 'US', view: 'shirt', autoPlace: 'Brooklyn, New York',
};

let state = { ...defaults, ...safeLoad() };
state.dirty = { ...defaults.dirty, ...(state.dirty || {}) };
let fonts;
let config = { priceCents: 3400, countries: { US: 'United States' }, testMode: false };

function safeLoad() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}

// ---------- time helpers ----------
function tzOffsetMs(utcMs, tz) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(utcMs));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - utcMs;
}
function localToUtc(date, time, tz) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let tzName = tz;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { tzName = 'UTC'; }
  let utc = guess - tzOffsetMs(guess, tzName);
  utc = guess - tzOffsetMs(utc, tzName); // second pass handles DST edges
  return utc;
}
function autoDateLine() {
  if (!state.date) return '';
  const [y, m, d] = state.date.split('-').map(Number);
  const dateStr = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
  if (!state.time) return dateStr;
  const [hh, mm] = state.time.split(':').map(Number);
  return `${dateStr} · ${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
}
const autoCoords = () => `${Math.abs(state.lat).toFixed(4)}° ${state.lat >= 0 ? 'N' : 'S'} · ${Math.abs(state.lon).toFixed(4)}° ${state.lon >= 0 ? 'E' : 'W'}`;
const auto = { place: () => state.autoPlace || '', dateLine: autoDateLine, coords: autoCoords };

function design() {
  return {
    lat: state.lat, lon: state.lon, t: localToUtc(state.date, state.time, state.tz),
    headline: state.headline, place: state.place, dateLine: state.dateLine, coords: state.coords,
    ink: state.ink, lines: state.lines, names: state.names, planets: state.planets, ecliptic: state.ecliptic,
  };
}

// ---------- rendering ----------
let raf = 0;
function schedule() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(draw);
}

function draw() {
  if (!fonts) return;
  for (const k of ['place', 'dateLine', 'coords']) if (!state.dirty[k]) state[k] = auto[k]();
  syncInputs();
  const shirt = SHIRTS[state.color];
  const d = design();
  if (!Number.isFinite(d.t)) return;
  const stage = $('stage');
  stage.classList.toggle('print', state.view === 'print');
  let sky;
  if (state.view === 'shirt') {
    const r = renderSVG(d, fonts, { crop: true, x: ART.x, y: ART.y, width: ART.w, height: ART.h, idPrefix: 'pv' });
    sky = r.sky;
    stage.innerHTML = shirtSVG(shirt.hex, r.svg, shirt.tone);
  } else if (state.view === 'print') {
    const r = renderSVG(d, fonts, { width: '100%', height: '100%', idPrefix: 'pf' });
    sky = r.sky;
    stage.innerHTML = `${r.svg}<div class="print-meta">Print file · ${CANVAS.w}×${CANVAS.h}px · 300 DPI · transparent PNG</div>`;
  } else {
    const s = 1100;
    const r = renderSVG(d, fonts, { viewBox: `${CENTER.x - s / 2} ${CENTER.y - s / 2} ${s} ${s}`, width: '100%', height: '100%', background: shirt.hex, idPrefix: 'cu' });
    sky = r.sky;
    stage.innerHTML = `${r.svg}<div class="print-meta">Actual size ≈ 3.7 in across. Every line and star is sized to print cleanly.</div>`;
  }
  facts(sky);
  save();
}

function moonPhaseName(deg) {
  const names = ['New Moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full Moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  return names[Math.round(deg / 45) % 8];
}

function facts(sky) {
  const planets = sky.planets.map((p) => p[0]);
  const moon = sky.moonInfo;
  const bits = [`<strong>${sky.stars.length.toLocaleString()}</strong> stars overhead`];
  bits.push(planets.length ? `<strong>${planets.join(', ')}</strong> visible` : 'no bright planets up');
  bits.push(`${moonPhaseName(moon.phaseDeg)} (${Math.round(moon.fraction * 100)}% lit)${moon.up ? '' : ', below the horizon'}`);
  let html = bits.join(' · ') + '.';
  if (sky.sunAlt > -6) html += ` <br>☀︎ The Sun was ${sky.sunAlt > 0 ? 'up' : 'just setting/rising'} at this moment. These are the stars hidden behind the daylight.`;
  $('sky-facts').innerHTML = html;
}

// ---------- form wiring ----------
const textIds = ['headline', 'place', 'dateLine', 'coords'];

function syncInputs() {
  for (const id of textIds) if (document.activeElement !== $(id)) $(id).value = state[id];
  for (const k of ['place', 'dateLine', 'coords']) document.querySelector(`[data-reset="${k}"]`).hidden = !state.dirty[k];
  for (const id of ['lines', 'names', 'planets', 'ecliptic']) $(id).checked = state[id];
  $('place-chosen').textContent = `${state.placeName} · ${state.lat.toFixed(3)}, ${state.lon.toFixed(3)} · ${state.tz}`;
  for (const id of textIds) {
    const c = document.querySelector(`.count[data-for="${id}"]`);
    if (c) c.textContent = `${state[id].length}/${LIMITS[id]}`;
  }
  const bad = [];
  for (const id of textIds) {
    const chars = unsupportedChars(state[id], id === 'headline' ? fonts.serif : fonts.sans);
    if (chars.length) bad.push(`${chars.join(' ')} (in ${id === 'dateLine' ? 'date line' : id})`);
  }
  $('text-warning').textContent = bad.length ? `These characters can't be printed in our typefaces: ${bad.join('; ')}` : '';
}

function swatches() {
  const shirtBox = $('shirt-swatches');
  shirtBox.innerHTML = Object.entries(SHIRTS).map(([k, s]) => `<button type="button" class="swatch${k === state.color ? ' active' : ''}" data-color="${k}" aria-pressed="${k === state.color}"><span class="dot" style="background:${s.hex}"></span>${s.label}</button>`).join('');
  const tone = SHIRTS[state.color].tone;
  if (INKS[state.ink].for !== tone) state.ink = tone === 'dark' ? 'starlight' : 'ink';
  $('ink-swatches').innerHTML = Object.entries(INKS).filter(([, i]) => i.for === tone).map(([k, i]) => `<button type="button" class="swatch${k === state.ink ? ' active' : ''}" data-ink="${k}" aria-pressed="${k === state.ink}"><span class="dot ink" style="background:linear-gradient(135deg, ${i.star} 50%, ${i.line} 50%)"></span>${i.label}</button>`).join('');
  const sizes = SHIRTS[state.color].sizes;
  if (!sizes.includes(state.size)) state.size = sizes.includes('l') ? 'l' : sizes[0];
  $('size').innerHTML = sizes.map((s) => `<option value="${s}"${s === state.size ? ' selected' : ''}>${s.toUpperCase()}</option>`).join('');
}

const money = (c) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100);
let quoteSeq = 0;
async function updateQuote() {
  const seq = ++quoteSeq;
  $('sum-tee').textContent = `${money(config.priceCents)} × ${state.qty}`;
  $('sum-ship').textContent = '…';
  $('sum-total').textContent = '…';
  try {
    const r = await fetch(`/api/quote?country=${state.country}&qty=${state.qty}`).then((r) => r.json());
    if (seq !== quoteSeq) return;
    if (r.error) throw new Error(r.error);
    $('sum-ship').textContent = money(r.shippingCents);
    $('sum-total').textContent = money(r.totalCents);
    $('checkout').textContent = `Checkout · ${money(r.totalCents)}`;
  } catch {
    if (seq !== quoteSeq) return;
    $('sum-ship').textContent = 'calculated at checkout';
    $('sum-total').textContent = '—';
  }
}

function bind() {
  for (const id of textIds) {
    $(id).addEventListener('input', (e) => {
      state[id] = e.target.value;
      if (id in state.dirty) state.dirty[id] = true;
      schedule();
    });
  }
  document.querySelectorAll('[data-reset]').forEach((b) => b.addEventListener('click', () => {
    state.dirty[b.dataset.reset] = false;
    schedule();
  }));
  $('headline-chips').addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) { state.headline = e.target.textContent; $('headline').value = state.headline; schedule(); }
  });
  $('date').addEventListener('change', (e) => { if (e.target.value) { state.date = e.target.value; schedule(); } });
  $('time').addEventListener('change', (e) => { if (e.target.value) { state.time = e.target.value; schedule(); } });
  for (const id of ['lat', 'lon']) $(id).addEventListener('change', (e) => {
    const v = Number(e.target.value);
    const lim = id === 'lat' ? 90 : 180;
    if (Number.isFinite(v) && Math.abs(v) <= lim) { state[id] = v; state.placeName = 'Custom coordinates'; schedule(); }
  });
  $('tz').addEventListener('change', (e) => {
    try { new Intl.DateTimeFormat('en-US', { timeZone: e.target.value }); state.tz = e.target.value; schedule(); } catch { e.target.value = state.tz; }
  });
  for (const id of ['lines', 'names', 'planets', 'ecliptic']) $(id).addEventListener('change', (e) => { state[id] = e.target.checked; schedule(); });
  $('shirt-swatches').addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]');
    if (b) { state.color = b.dataset.color; swatches(); schedule(); }
  });
  $('ink-swatches').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ink]');
    if (b) { state.ink = b.dataset.ink; swatches(); schedule(); }
  });
  $('size').addEventListener('change', (e) => { state.size = e.target.value; save(); });
  $('qty').addEventListener('change', (e) => {
    state.qty = Math.min(config.maxQty || 10, Math.max(1, Math.trunc(Number(e.target.value) || 1)));
    e.target.value = state.qty;
    save();
    updateQuote();
  });
  $('country').addEventListener('change', (e) => { state.country = e.target.value; save(); updateQuote(); });
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    state.view = t.dataset.view;
    document.querySelectorAll('.tab').forEach((x) => { x.classList.toggle('active', x === t); x.setAttribute('aria-selected', x === t); });
    schedule();
  }));
  bindPlaceSearch();
  $('design-form').addEventListener('submit', checkout);
}

function bindPlaceSearch() {
  const input = $('place-q');
  const list = $('place-results');
  let timer;
  let results = [];
  let active = -1;
  const close = () => { list.hidden = true; active = -1; };
  const choose = (r) => {
    state.lat = r.lat; state.lon = r.lon; state.tz = r.tz;
    state.placeName = [r.name, r.region, r.country].filter(Boolean).join(', ');
    const useRegion = ['US', 'CA', 'AU'].includes(r.countryCode) && r.region && r.region !== r.name;
    state.autoPlace = useRegion ? `${r.name}, ${r.region}` : [r.name, r.country].filter(Boolean).join(', ');
    state.dirty.place = false; state.dirty.coords = false;
    $('lat').value = r.lat; $('lon').value = r.lon; $('tz').value = r.tz;
    input.value = '';
    close();
    schedule();
  };
  const renderList = () => {
    list.innerHTML = results.map((r, i) => `<li role="option" data-i="${i}" aria-selected="${i === active}">${esc(r.name)}<small>${esc([r.region, r.country].filter(Boolean).join(', '))}</small></li>`).join('') || '<li aria-disabled="true">No matches</li>';
    list.hidden = false;
  };
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) return close();
    timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`).then((r) => r.json());
        if (input.value.trim() !== q) return;
        results = r.results || [];
        active = results.length ? 0 : -1;
        renderList();
      } catch { close(); }
    }, 220);
  });
  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown') { active = Math.min(results.length - 1, active + 1); renderList(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); renderList(); e.preventDefault(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) choose(results[active]); }
    else if (e.key === 'Escape') close();
  });
  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li[data-i]');
    if (li) { e.preventDefault(); choose(results[Number(li.dataset.i)]); }
  });
  input.addEventListener('blur', () => setTimeout(close, 150));
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function checkout(e) {
  e.preventDefault();
  const btn = $('checkout');
  const err = $('checkout-error');
  err.textContent = '';
  if ($('text-warning').textContent) { err.textContent = 'Please fix the highlighted text first.'; return; }
  if (!state.date || !state.time) { err.textContent = 'Please choose a date and time.'; return; }
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = 'Opening secure checkout…';
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ design: design(), color: state.color, size: state.size, qty: state.qty, country: state.country }),
    });
    const r = await res.json();
    if (!res.ok || !r.url) throw new Error(r.error || 'Checkout failed');
    location.href = r.url;
  } catch (ex) {
    err.textContent = ex.message;
    btn.disabled = false;
    btn.textContent = label;
  }
}

async function loadFont(url) {
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  return parse(buf);
}

async function init() {
  $('date').value = state.date;
  $('time').value = state.time;
  $('lat').value = state.lat;
  $('lon').value = state.lon;
  $('tz').value = state.tz;
  $('qty').value = state.qty;
  document.querySelectorAll('.tab').forEach((x) => { x.classList.toggle('active', x.dataset.view === state.view); x.setAttribute('aria-selected', x.dataset.view === state.view); });
  swatches();
  bind();
  const [serif, sans, sansMedium, cfg] = await Promise.all([
    loadFont('/fonts/cormorant-600.ttf'), loadFont('/fonts/jost-400.ttf'), loadFont('/fonts/jost-500.ttf'),
    fetch('/api/config').then((r) => r.json()).catch(() => null),
  ]);
  fonts = { serif, sans, sansMedium };
  if (cfg) config = cfg;
  $('test-banner').hidden = !config.testMode;
  $('country').innerHTML = Object.entries(config.countries).map(([k, v]) => `<option value="${k}"${k === state.country ? ' selected' : ''}>${v}</option>`).join('');
  if (new URLSearchParams(location.search).has('cancelled')) $('checkout-error').textContent = 'Checkout cancelled. Your design is saved right here.';
  draw();
  updateQuote();
}

init();
