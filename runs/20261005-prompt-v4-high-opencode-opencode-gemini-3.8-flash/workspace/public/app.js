'use strict';

const COLORS = [
  { id: 'black', name: 'Black', hex: '#111111', tone: 'dark' },
  { id: 'navy blue', name: 'Navy Blue', hex: '#1f2a44', tone: 'dark' },
  { id: 'dark heather grey', name: 'Dark Heather Grey', hex: '#3b3f45', tone: 'dark' },
  { id: 'maroon', name: 'Maroon', hex: '#4a1f28', tone: 'dark' },
  { id: 'military green', name: 'Military Green', hex: '#3d4a34', tone: 'dark' },
  { id: 'royal blue', name: 'Royal Blue', hex: '#1f3d8a', tone: 'dark' },
  { id: 'athletic grey heather', name: 'Athletic Grey Heather', hex: '#b8bcc0', tone: 'light' },
  { id: 'white', name: 'White', hex: '#f4f4f0', tone: 'light' },
  { id: 'cream', name: 'Cream', hex: '#efe7d4', tone: 'light' },
];
const SIZES = [
  { id: 'xs', name: 'XS', add: 0 }, { id: 's', name: 'S', add: 0 },
  { id: 'm', name: 'M', add: 0 }, { id: 'l', name: 'L', add: 0 },
  { id: 'xl', name: 'XL', add: 0 }, { id: '2xl', name: '2XL', add: 200 },
  { id: '3xl', name: '3XL', add: 300 }, { id: '4xl', name: '4XL', add: 500 },
];
const BASE = 3600, SHIP = 600;

const $ = (id) => document.getElementById(id);
const state = {
  color: 'black',
  size: 'm',
  place: { name: 'Lisbon, Portugal', lat: 38.72, lon: -9.14, tz: 'Europe/Lisbon' },
  previewUrl: null,
};

function money(c) { return '$' + (c / 100).toFixed(2); }

function tzOffsetMinutes(dateStr, timeStr, tz) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    const guess = Date.UTC(y, m - 1, d, hh, mm);
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const p = {};
    for (const part of dtf.formatToParts(new Date(guess))) p[part.type] = part.value;
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((asUTC - guess) / 60000);
  } catch {
    return Math.round(-new Date().getTimezoneOffset());
  }
}

function currentSpec() {
  return {
    caption: $('caption').value.trim(),
    names: $('names').value.trim(),
    date: $('date').value,
    time: $('time').value,
    place: state.place.name,
    lat: state.place.lat,
    lon: state.place.lon,
    offsetMinutes: tzOffsetMinutes($('date').value, $('time').value, state.place.tz),
    color: state.color,
    size: state.size,
  };
}

let previewTimer = null;
let previewAbort = null;
function schedulePreview() {
  updatePrice();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 320);
}

async function renderPreview() {
  const spec = currentSpec();
  if (!spec.caption || !spec.date || !spec.time || !state.place) return;
  const img = $('preview');
  $('preview-loading').style.display = 'flex';
  try {
    if (previewAbort) previewAbort.abort();
    previewAbort = new AbortController();
    const res = await fetch('/api/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...spec, width: 760 }),
      signal: previewAbort.signal,
    });
    if (!res.ok) throw new Error('preview failed');
    const blob = await res.blob();
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = URL.createObjectURL(blob);
    img.src = state.previewUrl;
  } catch (e) {
    if (e.name !== 'AbortError') console.error(e);
  } finally {
    $('preview-loading').style.display = 'none';
  }
}

function updatePrice() {
  const size = SIZES.find((s) => s.id === state.size) || SIZES[2];
  const total = BASE + size.add + SHIP;
  $('price').innerHTML = `${money(total)}<small>incl. ${money(SHIP)} shipping · ${size.name}</small>`;
}

function buildColors() {
  const wrap = $('colors');
  wrap.innerHTML = '';
  COLORS.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (c.id === state.color ? ' active' : '');
    b.style.background = c.hex;
    b.dataset.tone = c.tone;
    b.title = c.name;
    b.setAttribute('aria-label', c.name);
    b.addEventListener('click', () => {
      state.color = c.id;
      [...wrap.children].forEach((el) => el.classList.remove('active'));
      b.classList.add('active');
      schedulePreview();
    });
    wrap.appendChild(b);
  });
}

function buildSizes() {
  const sel = $('size');
  sel.innerHTML = '';
  SIZES.forEach((s) => {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.name + (s.add ? ` (+${money(s.add)})` : '');
    if (s.id === state.size) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => {
    state.size = sel.value;
    updatePrice();
  });
}

// --- Geocoding via Open-Meteo (no API key) ---
let geoAbort = null;
function wirePlace() {
  const input = $('place');
  const results = $('place-results');
  let t = null;
  input.addEventListener('input', () => {
    state.place = null;
    $('place-status').textContent = 'Choose a place from the list.';
    clearTimeout(t);
    const q = input.value.trim();
    if (q.length < 2) { results.hidden = true; return; }
    t = setTimeout(() => lookup(q), 280);
  });
  input.addEventListener('focus', () => { if (results.children.length) results.hidden = false; });
  document.addEventListener('click', (e) => {
    if (!results.contains(e.target) && e.target !== input) results.hidden = true;
  });

  async function lookup(q) {
    try {
      if (geoAbort) geoAbort.abort();
      geoAbort = new AbortController();
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
        { signal: geoAbort.signal }
      );
      const d = await r.json();
      results.innerHTML = '';
      if (!d.results || !d.results.length) { results.hidden = true; return; }
      d.results.forEach((p) => {
        const label = [p.name, p.admin1, p.country].filter(Boolean).join(', ');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = `${p.name} <small>${[p.admin1, p.country].filter(Boolean).join(', ')}</small>`;
        btn.addEventListener('click', () => {
          state.place = { name: label, lat: p.latitude, lon: p.longitude, tz: p.timezone || 'UTC' };
          input.value = label;
          results.hidden = true;
          $('place-status').textContent =
            `${Math.abs(p.latitude).toFixed(2)}° ${p.latitude >= 0 ? 'N' : 'S'}, ` +
            `${Math.abs(p.longitude).toFixed(2)}° ${p.longitude >= 0 ? 'E' : 'W'} · ${p.timezone || ''}`;
          schedulePreview();
        });
        results.appendChild(btn);
      });
      results.hidden = false;
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  }
}

function wireForm() {
  ['caption', 'names', 'date', 'time'].forEach((id) => $(id).addEventListener('input', schedulePreview));
  $('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('error');
    err.hidden = true;
    if (!state.place) { showError('Please choose your place from the suggestions list.'); return; }
    const spec = currentSpec();
    if (!spec.caption) { showError('Please add a caption.'); return; }
    if (!spec.date || !spec.time) { showError('Please choose a date and time.'); return; }
    const btn = $('checkout');
    btn.disabled = true;
    btn.textContent = 'Starting secure checkout…';
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spec),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed.');
      window.location.href = data.url;
    } catch (e2) {
      btn.disabled = false;
      btn.textContent = 'Checkout securely →';
      showError(e2.message || 'Something went wrong. Please try again.');
    }
  });

  const sandboxBtn = $('sandbox-btn');
  const sandboxResult = $('sandbox-result');
  if (sandboxBtn) {
    sandboxBtn.addEventListener('click', async () => {
      const err = $('error');
      err.hidden = true;
      sandboxResult.hidden = true;
      if (!state.place) { showError('Please choose your place from the suggestions list.'); return; }
      const spec = currentSpec();
      if (!spec.caption) { showError('Please add a caption.'); return; }
      if (!spec.date || !spec.time) { showError('Please choose a date and time.'); return; }

      sandboxBtn.disabled = true;
      sandboxBtn.textContent = '⚡ Running Stripe payment & Prodigi fulfillment…';
      try {
        const res = await fetch('/api/sandbox-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(spec),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Sandbox order failed');

        sandboxResult.hidden = false;
        sandboxResult.innerHTML = `
          <h3 style="margin-top:0; color:#38ef7d;">✓ Verified Paid &amp; Sent to Print</h3>
          <p style="margin:6px 0; font-size:14px;"><strong>Stripe Payment:</strong> <code>${data.stripePaymentIntentId}</code> (paid)</p>
          <p style="margin:6px 0; font-size:14px;"><strong>Prodigi Order:</strong> <code>${data.prodigiOrderId || '—'}</code> (${data.stage || 'InProgress'})</p>
          <p style="margin:6px 0; font-size:14px;"><strong>Variant:</strong> ${data.color} · ${String(data.size).toUpperCase()}</p>
          <p style="margin:10px 0 0 0; font-size:13px;">
            <a href="${data.designUrl}" target="_blank" rel="noopener" style="color:#e7c879; text-decoration:underline;">View Print Asset (300 DPI PNG) →</a>
            &nbsp;·&nbsp;
            <a href="/api/track?id=${data.prodigiOrderId}" target="_blank" rel="noopener" style="color:#9fb4d8; text-decoration:underline;">Track Order Status →</a>
          </p>
        `;
      } catch (e) {
        showError(e.message || 'Sandbox order failed.');
      } finally {
        sandboxBtn.disabled = false;
        sandboxBtn.textContent = '⚡ 1-Click Sandbox Test Order (Instant Stripe + Prodigi)';
      }
    });
  }

  function showError(msg) { err.textContent = msg; err.hidden = false; err.scrollIntoView({ block: 'center' }); }
}

function init() {
  buildColors();
  buildSizes();
  wirePlace();
  wireForm();
  $('place-status').textContent = '38.72° N, 9.14° W · Europe/Lisbon';
  updatePrice();
  renderPreview();
  if (new URLSearchParams(location.search).get('canceled')) {
    const err = $('error');
    err.textContent = 'Checkout was cancelled — your design is still here whenever you are ready.';
    err.hidden = false;
  }
}

document.addEventListener('DOMContentLoaded', init);
