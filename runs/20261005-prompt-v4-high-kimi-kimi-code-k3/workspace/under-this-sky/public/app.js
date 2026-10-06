import { renderDesignSVG } from './starmap.js';

const $ = (id) => document.getElementById(id);
const state = {
  catalog: null,
  iso: null,          // resolved UTC instant for the chosen local time/place
  lat: 38.7223, lon: -9.1393, place: 'Lisbon, Portugal',
  color: 'black', size: 'm',
};
const COLOR_THEME = { black: 'dark', 'navy blue': 'dark', white: 'light' };
const SHIRT_FILL = { black: '#16161a', 'navy blue': '#1f2a44', white: '#f2f2ef' };

const catalog = await (await fetch('catalog.json')).json();
state.catalog = catalog;

// ---------- hero art: tonight's sky over Greenwich ----------
(function hero() {
  const svg = renderDesignSVG(
    { iso: new Date().toISOString(), lat: 51.4769, lon: -0.0005, title: '', subtitle: '', place: '', theme: 'dark' },
    catalog, { width: 1200, height: 1200 }
  );
  // crop to just the chart circle via viewBox override
  const cropped = svg.replace('width="1200" height="1200" viewBox="0 0 1200 1200"', 'viewBox="120 40 960 960" preserveAspectRatio="xMidYMid slice"');
  $('hero-sky').innerHTML = cropped;
})();

// ---------- live preview ----------
let resolveTimer = null;
async function resolveInstant() {
  const d = $('date').value, t = $('time').value || '12:00';
  if (!d) return;
  // instant approximation for responsiveness; corrected by server below
  state.iso = new Date(`${d}T${t}:00Z`).toISOString();
  renderPreview();
  try {
    const r = await fetch('/api/resolve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: state.lat, lon: state.lon, d, t }),
    });
    if (r.ok) {
      const { iso } = await r.json();
      if (iso !== state.iso) { state.iso = iso; renderPreview(); }
    }
  } catch { /* preview stays approximate */ }
}

function renderPreview() {
  if (!state.iso) return;
  const svg = renderDesignSVG({
    iso: state.iso,
    lat: state.lat, lon: state.lon,
    title: $('title').value.trim(),
    subtitle: $('subtitle').value.trim(),
    place: state.place,
    theme: COLOR_THEME[state.color],
  }, catalog, { width: 4680, height: 5790 });
  $('design-slot').innerHTML = svg;
}

function refreshShirtColor() {
  $('shirt-body').setAttribute('fill', SHIRT_FILL[state.color]);
  $('shirt-body').setAttribute('stroke', state.color === 'white' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.14)');
}

const debounce = (fn, ms) => { clearTimeout(resolveTimer); resolveTimer = setTimeout(fn, ms); };
for (const id of ['title', 'subtitle', 'date', 'time']) {
  $(id).addEventListener('input', () => debounce(resolveInstant, 250));
}

// ---------- place autocomplete (OpenStreetMap Nominatim) ----------
let searchTimer = null;
$('place').addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = $('place').value.trim();
  if (q.length < 3) { $('place-results').hidden = true; return; }
  searchTimer = setTimeout(async () => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`);
      const hits = await r.json();
      const box = $('place-results');
      box.innerHTML = '';
      for (const h of hits) {
        const a = h.address || {};
        const city = a.city || a.town || a.village || a.municipality || a.county || h.name;
        const label = [city, a.country].filter(Boolean).join(', ');
        const div = document.createElement('div');
        div.textContent = label;
        div.onclick = () => {
          state.lat = parseFloat(h.lat); state.lon = parseFloat(h.lon);
          state.place = label.slice(0, 44);
          $('place').value = label;
          box.hidden = true;
          resolveInstant();
        };
        box.appendChild(div);
      }
      box.hidden = hits.length === 0;
    } catch { /* ignore */ }
  }, 450);
});
document.addEventListener('click', (e) => {
  if (e.target.id !== 'place') $('place-results').hidden = true;
});

// ---------- color & size ----------
$('colors').addEventListener('click', (e) => {
  const b = e.target.closest('[data-color]');
  if (!b) return;
  state.color = b.dataset.color;
  document.querySelectorAll('#colors .swatch').forEach((s) => s.classList.toggle('selected', s === b));
  refreshShirtColor();
  renderPreview();
});
$('sizes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-size]');
  if (!b) return;
  state.size = b.dataset.size;
  document.querySelectorAll('#sizes button').forEach((s) => s.classList.toggle('selected', s === b));
});

// ---------- checkout ----------
$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('form-error');
  err.hidden = true;
  if (!state.place || !$('title').value.trim() || !$('date').value) {
    err.textContent = 'Please fill in your moment, place, and date.';
    err.hidden = false;
    return;
  }
  const buy = $('buy');
  buy.disabled = true;
  buy.textContent = 'Taking you to checkout…';
  try {
    const r = await fetch('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: $('title').value.trim(),
        subtitle: $('subtitle').value.trim(),
        place: state.place, lat: state.lat, lon: state.lon,
        date: $('date').value, time: $('time').value || '12:00',
        color: state.color, size: state.size,
      }),
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'checkout failed');
    window.location.href = json.url;
  } catch (e2) {
    err.textContent = `Something went wrong: ${e2.message}. Please try again.`;
    err.hidden = false;
    buy.disabled = false;
    buy.textContent = 'Buy my sky';
  }
});

// ---------- init ----------
$('place').value = state.place;
refreshShirtColor();
resolveInstant();
