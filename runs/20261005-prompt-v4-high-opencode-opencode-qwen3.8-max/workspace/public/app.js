/* Heliogram storefront app */
import { buildDesignSVG, SHIRTS, SIZES } from '/lib/design.mjs';
import { buildMockupSVG } from '/lib/mockup.mjs';

const $ = (s) => document.querySelector(s);
const state = {
  place: null,            // { city, admin1, country, lat, lon }
  markers: [],            // [{ md, label }]
  dedication: '',
  shirt: 'black',
  size: 'm',
  qty: 1,
  config: null,
};

const SAMPLES = [
  { city: 'Paris', admin1: 'Île-de-France', country: 'France', lat: 48.8566, lon: 2.3522, dedication: 'for Marie', markers: [{ md: '06-14', label: 'BORN' }], shirt: 'black' },
  { city: 'Reykjavík', admin1: '', country: 'Iceland', lat: 64.1466, lon: -21.9426, dedication: '', markers: [{ md: '12-21', label: 'HOME' }], shirt: 'navy' },
  { city: 'Ushuaia', admin1: 'Tierra del Fuego', country: 'Argentina', lat: -54.8019, lon: -68.303, dedication: 'the end of the world', markers: [], shirt: 'cream' },
  { city: 'Kyoto', admin1: 'Kansai', country: 'Japan', lat: 35.0116, lon: 135.7681, dedication: '', markers: [{ md: '04-08', label: 'SAKURA' }], shirt: 'white' },
];

let renderTimer = null;

async function init() {
  const cfg = await fetch('/api/config').then((r) => r.json());
  state.config = cfg;

  // swatches
  $('#swatches').innerHTML = Object.entries(cfg.shirts).map(([k, v]) =>
    `<button type="button" class="swatch" data-shirt="${k}" style="background:${v.hex}" aria-pressed="${k === state.shirt}" title="${v.label}"></button>`).join('')
    + `<div class="swatch-label" id="swatchLabel" style="width:100%"></div>`;
  $('#swatches').addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (!b) return;
    state.shirt = b.dataset.shirt;
    [...$('#swatches').querySelectorAll('.swatch')].forEach((s) => s.setAttribute('aria-pressed', String(s === b)));
    renderSoon();
  });

  // sizes
  $('#sizes').innerHTML = cfg.sizes.map((s) =>
    `<button type="button" data-size="${s}" aria-pressed="${s === state.size}">${s}</button>`).join('');
  $('#sizes').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.size = b.dataset.size;
    [...$('#sizes').querySelectorAll('button')].forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderSoon();
  });

  // samples
  $('#samples').innerHTML = SAMPLES.map((s, i) => `<button type="button" data-i="${i}">${s.city} sample</button>`).join('');
  $('#samples').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const s = SAMPLES[+b.dataset.i];
    state.place = { city: s.city, admin1: s.admin1, country: s.country, lat: s.lat, lon: s.lon };
    state.dedication = s.dedication;
    state.markers = s.markers.map((m) => ({ ...m }));
    state.shirt = s.shirt;
    syncInputs();
    renderSoon();
  });

  // markers UI
  renderMarkerRows();

  // geocoder
  $('#q').addEventListener('input', onSearch);
  $('#q').addEventListener('focus', () => { if ($('#results').children.length) $('#results').classList.add('open'); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.geo')) $('#results').classList.remove('open'); });

  $('#dedication').addEventListener('input', (e) => { state.dedication = e.target.value; renderSoon(); });

  $('#panel').addEventListener('submit', onBuy);

  syncInputs();
  renderSoon(0);
  updatePrice();
}

function syncInputs() {
  $('#dedication').value = state.dedication;
  $('#lat').value = state.place?.lat ?? '';
  $('#lon').value = state.place?.lon ?? '';
  $('#city').value = state.place?.city ?? '';
  $('#admin1').value = state.place?.admin1 ?? '';
  $('#country').value = state.place?.country ?? '';
  $('#placeLine').textContent = state.place
    ? `${state.place.city}${state.place.admin1 ? ', ' + state.place.admin1 : ''}${state.place.country ? ' · ' + state.place.country : ''} — ${state.place.lat.toFixed(3)}°, ${state.place.lon.toFixed(3)}°`
    : 'Choose a place to begin.';
  [...$('#swatches').querySelectorAll('.swatch')].forEach((s) => s.setAttribute('aria-pressed', String(s.dataset.shirt === state.shirt)));
  [...$('#sizes').querySelectorAll('button')].forEach((s) => s.setAttribute('aria-pressed', String(s.dataset.size === state.size)));
  renderMarkerRows();
}

function renderMarkerRows() {
  const host = $('#markers');
  host.innerHTML = state.markers.map((m, i) => `
    <div class="marker-row">
      <input type="date" data-i="${i}" data-f="md" value="${m.md || ''}" min="01-01" max="12-31" aria-label="Date ${i + 1}">
      <input type="text" data-i="${i}" data-f="label" maxlength="14" value="${m.label || ''}" placeholder="label — BORN, MET, ARRIVED…" aria-label="Label ${i + 1}">
      <button type="button" class="rm" data-i="${i}" title="remove">✕</button>
    </div>`).join('')
    + (state.markers.length < 3 ? `<button type="button" class="add-marker" id="addMarker">+ add a date</button>` : '');
  host.querySelectorAll('input').forEach((inp) => inp.addEventListener('input', (e) => {
    const i = +e.target.dataset.i, f = e.target.dataset.f;
    let v = e.target.value;
    if (f === 'md' && v) v = v.slice(5) || v; // yyyy-mm-dd → mm-dd for month-day anniversaries
    if (f === 'md' && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) v = e.target.value.slice(5);
    state.markers[i][f] = f === 'label' ? v.toUpperCase() : v;
    renderSoon();
  }));
  host.querySelectorAll('.rm').forEach((b) => b.addEventListener('click', () => {
    state.markers.splice(+b.dataset.i, 1);
    renderMarkerRows();
    renderSoon();
  }));
  const add = $('#addMarker');
  if (add) add.addEventListener('click', () => {
    state.markers.push({ md: '', label: '' });
    renderMarkerRows();
  });
}

let searchTimer = null;
function onSearch(e) {
  const q = e.target.value.trim();
  clearTimeout(searchTimer);
  if (q.length < 2) { $('#results').classList.remove('open'); return; }
  searchTimer = setTimeout(async () => {
    try {
      const { results } = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`).then((r) => r.json());
      $('#results').innerHTML = results.map((r, i) =>
        `<button type="button" data-i="${i}">${r.city}${r.admin1 ? ', ' + r.admin1 : ''} · ${r.country}</button>`).join('');
      $('#results').classList.add('open');
      $('#results').dataset.payload = JSON.stringify(results);
      $('#results').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        const r = JSON.parse($('#results').dataset.payload)[+b.dataset.i];
        state.place = { city: r.city, admin1: r.admin1, country: r.country, lat: r.lat, lon: r.lon };
        $('#results').classList.remove('open');
        $('#q').value = r.city;
        syncInputs();
        renderSoon(0);
      }));
    } catch { /* network hiccup; leave closed */ }
  }, 260);
}

function specOf() {
  return {
    lat: state.place?.lat ?? 48.8566,
    lon: state.place?.lon ?? 2.3522,
    city: state.place?.city ?? 'PARIS',
    admin1: state.place?.admin1 ?? '',
    country: state.place?.country ?? '',
    dedication: state.dedication,
    markers: state.markers.filter((m) => /^\d{2}-\d{2}$/.test(m.md || '')),
    shirt: state.shirt,
    size: state.size,
    qty: state.qty,
  };
}

function renderSoon(delay = 60) {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, delay);
}

function render() {
  const spec = specOf();
  const variant = SHIRTS[spec.shirt].variant;
  const p = { ...spec, variant };
  try {
    $('#mock').innerHTML = buildMockupSVG(p);
  } catch (e) {
    $('#stageNote').textContent = `preview error: ${e.message}`;
    return;
  }
  $('#swatchLabel').textContent = `${SHIRTS[spec.shirt].label} · Bella+Canvas 3001 · unisex ${spec.size.toUpperCase()} · print 30.5 × 37.8 cm`;
  $('#stageNote').textContent = state.place
    ? `${spec.city.toUpperCase()} · SOLAR YEAR DIAL · ${variant === 'dark' ? 'night-ground print' : 'navy medallion print'}`
    : 'sample dial — search your place above';
  updatePrice();
  $('#buyBtn').disabled = !state.place;
}

function updatePrice() {
  const cfg = state.config;
  if (!cfg) return;
  const money = (c) => `$${(c / 100).toFixed(2)}`;
  $('#price').innerHTML = `<b>${money(cfg.priceCents * state.qty)}</b> + ${money(cfg.shippingCents)} shipping · total <b>${money(cfg.priceCents * state.qty + cfg.shippingCents)}</b>`;
}

async function onBuy(e) {
  e.preventDefault();
  if (!state.place) return;
  const btn = $('#buyBtn');
  btn.disabled = true;
  btn.textContent = 'Opening secure checkout…';
  try {
    const r = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(specOf()),
    });
    const j = await r.json();
    if (!r.ok || !j.url) throw new Error(j.error || 'checkout failed');
    window.location.href = j.url;
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Buy this shirt';
    $('#stageNote').textContent = `checkout error: ${err.message}`;
  }
}

init();
