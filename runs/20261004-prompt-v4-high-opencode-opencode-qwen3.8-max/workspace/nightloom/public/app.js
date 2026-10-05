/* NightLoom storefront logic */
'use strict';

const $ = (sel) => document.querySelector(sel);

const state = {
  config: null,
  design: {
    title: 'THE NIGHT WE MET',
    subtitle: 'and the stars knew it',
    date: '2019-06-14',
    time: '21:41',
    lat: 40.7128,
    lon: -74.006,
    placeName: 'NEW YORK',
    countryName: 'UNITED STATES',
    palette: 'midnight',
    constellations: true,
  },
  product: { color: 'black', size: 'm', qty: 1 },
};

const PALETTE_META = {
  midnight: { label: 'Midnight Navy', css: 'radial-gradient(circle at 50% 40%, #0a1030, #1a2c5e)', hint: 'any tee' },
  obsidian: { label: 'Obsidian', css: 'radial-gradient(circle at 50% 40%, #010208, #0e1526)', hint: 'any tee' },
  dusk: { label: 'Dusk Plum', css: 'radial-gradient(circle at 50% 40%, #190d30, #452663)', hint: 'any tee' },
  ivory: { label: 'Ivory Negative', css: 'radial-gradient(circle at 50% 40%, #f2ede2, #d9d2c2)', hint: 'light tees' },
};

function fmtMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

/* ---------- preview ---------- */

let previewTimer = null;
let previewSeq = 0;

function previewParams() {
  const d = state.design;
  const p = new URLSearchParams({
    title: d.title || '',
    subtitle: d.subtitle || '',
    date: d.date,
    time: d.time,
    lat: String(d.lat),
    lon: String(d.lon),
    placeName: d.placeName || '',
    countryName: d.countryName || '',
    palette: d.palette,
    constellations: String(d.constellations),
  });
  return p.toString();
}

function refreshPreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    const url = `/api/preview?${previewParams()}`;
    const seq = ++previewSeq;
    const img = new Image();
    img.onload = () => {
      if (seq !== previewSeq) return;
      $('#teeDesign').setAttribute('href', url);
      $('#heroDesign').src = url;
      $('#zoomLink').href = url;
    };
    img.src = url;
    refreshSkyInfo();
    refreshSummary();
  }, 320);
}

let skyInfoTimer = null;
function refreshSkyInfo() {
  clearTimeout(skyInfoTimer);
  skyInfoTimer = setTimeout(async () => {
    const d = state.design;
    try {
      const r = await fetch(`/api/sky-info?date=${d.date}&time=${d.time}&lat=${d.lat}&lon=${d.lon}`);
      if (!r.ok) return;
      const info = await r.json();
      const moonIcons = { 'New Moon': '🌑', 'Waxing Crescent': '🌒', 'First Quarter': '🌓', 'Waxing Gibbous': '🌔', 'Full Moon': '🌕', 'Waning Gibbous': '🌖', 'Last Quarter': '🌗', 'Waning Crescent': '🌘' };
      const moonIcon = info.moon.visible ? (moonIcons[info.moon.phase] || '🌙') : '🌑';
      $('#skyTz').innerHTML = `Computed for <b>${info.localTime}</b> local (${info.tz}) · <b>${info.utcISO.replace('T', ' ').slice(0, 16)} UTC</b>`;
      $('#skyMoon').innerHTML = `${moonIcon} <b>${info.moon.phase}</b> (${Math.round(info.moon.fraction * 100)}% illuminated)${info.moon.visible ? ', above your horizon' : ', below the horizon'} · <b>${info.starCount.toLocaleString()}</b> stars in view`;
      const planets = info.planets.length ? info.planets.map(p => p.name).join(' · ') : 'none above the horizon';
      $('#skyPlanets').innerHTML = `Planets visible: <b>${planets}</b>`;
      const cons = info.constellations.length ? info.constellations.slice(0, 6).join(', ') + (info.constellations.length > 6 ? '…' : '') : '—';
      $('#skyCons').innerHTML = `Constellations: <b>${cons}</b>${info.daylight ? ' · ☀︎ daytime moment — the sun appears on your map' : ''}`;
    } catch { /* ignore */ }
  }, 420);
}

function refreshSummary() {
  const c = state.config;
  if (!c) return;
  const unit = c.pricing.unitAmount * state.product.qty;
  const total = unit + c.pricing.shippingAmount;
  $('#sumShirt').textContent = `Signature tee (${state.product.size.toUpperCase()}, ${colorLabel(state.product.color)}) × ${state.product.qty}`;
  $('#sumShirtPrice').textContent = fmtMoney(unit);
  $('#sumShip').textContent = fmtMoney(c.pricing.shippingAmount);
  $('#sumTotal').textContent = fmtMoney(total);
}

function colorLabel(id) {
  const c = (state.config && state.config.product.colors || []).find(x => x.id === id);
  return c ? c.label : id;
}

/* ---------- form building ---------- */

function buildCities() {
  const sel = $('#fCity');
  sel.innerHTML = '';
  const optCustom = document.createElement('option');
  optCustom.value = '__custom__';
  optCustom.textContent = 'Somewhere else…';
  sel.appendChild(optCustom);
  const group = document.createElement('optgroup');
  group.label = 'Popular places';
  for (const c of state.config.cities) {
    const o = document.createElement('option');
    o.value = `${c.lat},${c.lon}`;
    o.textContent = `${c.name}, ${c.country}`;
    if (c.name === 'New York') o.selected = true;
    group.appendChild(o);
  }
  sel.appendChild(group);
  sel.addEventListener('change', () => {
    if (sel.value === '__custom__') {
      $('#customPlace').hidden = false;
      return;
    }
    $('#customPlace').hidden = true;
    const [lat, lon] = sel.value.split(',').map(Number);
    const opt = sel.options[sel.selectedIndex];
    state.design.lat = lat;
    state.design.lon = lon;
    const label = opt.textContent.split(',')[0];
    const country = opt.textContent.split(', ').slice(1).join(', ');
    state.design.placeName = label.toUpperCase();
    state.design.countryName = country.toUpperCase();
    $('#fLat').value = lat;
    $('#fLon').value = lon;
    $('#fPlace').value = state.design.placeName;
    refreshPreview();
  });
}

function buildPalettes() {
  const wrap = $('#palettes');
  wrap.innerHTML = '';
  for (const id of state.config.palettes) {
    const meta = PALETTE_META[id] || { label: id, css: '#333', hint: '' };
    const label = document.createElement('label');
    label.className = 'pal';
    label.innerHTML = `
      <input type="radio" name="palette" value="${id}" ${id === state.design.palette ? 'checked' : ''}>
      <span class="disc" style="background:${meta.css}"></span>
      <span class="pal-name">${meta.label}</span>
      <span class="pal-hint">best on ${meta.hint}</span>`;
    label.querySelector('input').addEventListener('change', () => {
      state.design.palette = id;
      refreshPreview();
    });
    wrap.appendChild(label);
  }
}

function buildColors() {
  const wrap = $('#colors');
  wrap.innerHTML = '';
  for (const c of state.config.product.colors) {
    const label = document.createElement('label');
    label.className = 'swatch';
    label.style.background = c.hex;
    label.title = c.label;
    label.setAttribute('aria-label', c.label);
    label.innerHTML = `<input type="radio" name="color" value="${c.id}" ${c.id === state.product.color ? 'checked' : ''}>`;
    label.querySelector('input').addEventListener('change', () => {
      state.product.color = c.id;
      $('#teeBody').setAttribute('fill', c.hex);
      refreshSummary();
    });
    wrap.appendChild(label);
  }
  $('#teeBody').setAttribute('fill', (state.config.product.colors.find(c => c.id === state.product.color) || { hex: '#111' }).hex);
}

function buildSizes() {
  const wrap = $('#sizes');
  wrap.innerHTML = '';
  for (const s of state.config.product.sizes) {
    const label = document.createElement('label');
    label.className = 'size';
    label.innerHTML = `<input type="radio" name="size" value="${s}" ${s === state.product.size ? 'checked' : ''}>${s}`;
    label.querySelector('input').addEventListener('change', () => {
      state.product.size = s;
      refreshSummary();
    });
    wrap.appendChild(label);
  }
}

function buildCountries() {
  const sel = $('#fCountry');
  sel.innerHTML = '';
  const NAMES = { US: 'United States', CA: 'Canada', GB: 'United Kingdom', IE: 'Ireland', DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy', NL: 'Netherlands', BE: 'Belgium', CH: 'Switzerland', AT: 'Austria', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland', CZ: 'Czechia', HU: 'Hungary', PT: 'Portugal', GR: 'Greece', IS: 'Iceland', LU: 'Luxembourg', HR: 'Croatia', SI: 'Slovenia', SK: 'Slovakia', EE: 'Estonia', LV: 'Latvia', LT: 'Lithuania', RO: 'Romania', BG: 'Bulgaria', AU: 'Australia', NZ: 'New Zealand', JP: 'Japan', SG: 'Singapore' };
  for (const code of state.config.countries) {
    const o = document.createElement('option');
    o.value = code;
    o.textContent = NAMES[code] || code;
    if (code === 'US') o.selected = true;
    sel.appendChild(o);
  }
}

/* ---------- wiring ---------- */

function bindInputs() {
  const on = (sel, ev, fn) => $(sel).addEventListener(ev, fn);

  on('#fTitle', 'input', e => { state.design.title = e.target.value; refreshPreview(); });
  on('#fSubtitle', 'input', e => { state.design.subtitle = e.target.value; refreshPreview(); });
  on('#fDate', 'change', e => { state.design.date = e.target.value || state.design.date; refreshPreview(); });
  on('#fTime', 'change', e => { state.design.time = e.target.value || state.design.time; refreshPreview(); });
  on('#fLat', 'change', e => { const v = Number(e.target.value); if (isFinite(v) && v >= -90 && v <= 90) { state.design.lat = v; $('#fCity').value = '__custom__'; $('#customPlace').hidden = false; refreshPreview(); } });
  on('#fLon', 'change', e => { const v = Number(e.target.value); if (isFinite(v) && v >= -180 && v <= 180) { state.design.lon = v; $('#fCity').value = '__custom__'; $('#customPlace').hidden = false; refreshPreview(); } });
  on('#fPlace', 'input', e => { state.design.placeName = e.target.value.toUpperCase(); refreshPreview(); });
  on('#fConst', 'change', e => { state.design.constellations = e.target.checked; refreshPreview(); });

  on('#qtyMinus', 'click', () => { state.product.qty = Math.max(1, state.product.qty - 1); $('#fQty').value = state.product.qty; refreshSummary(); });
  on('#qtyPlus', 'click', () => { state.product.qty = Math.min(5, state.product.qty + 1); $('#fQty').value = state.product.qty; refreshSummary(); });

  on('#geoBtn', 'click', async () => {
    const q = $('#fGeo').value.trim();
    if (!q) return;
    $('#geoMsg').textContent = 'Searching…';
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (!r.ok) { $('#geoMsg').textContent = j.error || 'Not found.'; return; }
      state.design.lat = j.lat;
      state.design.lon = j.lon;
      state.design.placeName = (j.name || q).toUpperCase();
      state.design.countryName = (j.country || '').toUpperCase();
      $('#fLat').value = j.lat;
      $('#fLon').value = j.lon;
      $('#fPlace').value = state.design.placeName;
      $('#geoMsg').textContent = `Found: ${j.name}${j.country ? ', ' + j.country : ''} (${j.lat.toFixed(4)}, ${j.lon.toFixed(4)}) · ${j.timezone}`;
      refreshPreview();
    } catch {
      $('#geoMsg').textContent = 'Search failed — try again or enter coordinates below.';
    }
  });

  for (const chip of document.querySelectorAll('#momentChips .chip')) {
    chip.addEventListener('click', () => {
      $('#fTitle').value = chip.dataset.title;
      $('#fSubtitle').value = chip.dataset.sub || '';
      state.design.title = chip.dataset.title;
      state.design.subtitle = chip.dataset.sub || '';
      refreshPreview();
    });
  }

  $('#orderForm').addEventListener('submit', submitOrder);
}

async function submitOrder(e) {
  e.preventDefault();
  const errBox = $('#formErrors');
  errBox.hidden = true;

  // Sync any fields not in state
  state.design.title = $('#fTitle').value.trim();
  state.design.subtitle = $('#fSubtitle').value.trim();

  const body = {
    design: Object.assign({}, state.design),
    product: Object.assign({}, state.product),
    customer: {
      name: $('#fName').value.trim(),
      email: $('#fEmail').value.trim(),
      phone: $('#fPhone').value.trim(),
      line1: $('#fLine1').value.trim(),
      line2: $('#fLine2').value.trim(),
      city: $('#fCityTown').value.trim(),
      state: $('#fState').value.trim(),
      zip: $('#fZip').value.trim(),
      country: $('#fCountry').value,
    },
  };

  $('#spinner').hidden = false;
  $('#spinText').textContent = 'Preparing your checkout…';
  $('#submitBtn').disabled = true;
  try {
    const r = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) {
      errBox.innerHTML = `<strong>Please fix:</strong><ul>${(j.errors || [j.error || 'Something went wrong.']).map(x => `<li>${x}</li>`).join('')}</ul>`;
      errBox.hidden = false;
      errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    $('#spinText').textContent = j.provider === 'stripe' ? 'Opening secure Stripe checkout…' : 'Opening demo checkout…';
    window.location.href = j.checkoutUrl;
  } catch (err) {
    errBox.innerHTML = `<strong>Network error — please try again.</strong>`;
    errBox.hidden = false;
  } finally {
    $('#submitBtn').disabled = false;
    setTimeout(() => { $('#spinner').hidden = true; }, 400);
  }
}

/* ---------- init ---------- */

(async function init() {
  try {
    const r = await fetch('/api/config');
    state.config = await r.json();
  } catch {
    document.body.innerHTML = '<p style="padding:3rem;text-align:center">Failed to load store configuration. Is the server running?</p>';
    return;
  }
  if (state.config.paymentMode === 'demo') $('#demoRibbon').hidden = false;
  $('#payNote').innerHTML = state.config.paymentMode === 'stripe'
    ? '🔒 Secure card payment via <strong>Stripe</strong>. Your shirt is printed only after payment succeeds.'
    : '⚙︎ <strong>Sandbox mode:</strong> demo checkout — no real charge. Printing runs against the Prodigi sandbox. Add a <code>STRIPE_SECRET_KEY</code> to enable real Stripe Checkout.';

  buildCities();
  buildPalettes();
  buildColors();
  buildSizes();
  buildCountries();
  bindInputs();
  refreshPreview();
})();
