import { renderSVG, SHIRTS, SIZE_LABELS, summarize, moonName } from '/lib/dayprint.js';

const $ = (s) => document.querySelector(s);
const state = { place: null, date: '', unit: 'F', caption: '', shirt: 'black', size: 'l', day: null, cfg: null };
let dayReq = 0;

// ---------- shirt silhouette ----------
// Simple unisex tee in a 400x460 box. Print area (15.6" x 19.3") maps to a 180x222.7 rect at the chest.
const TEE = 'M140 40 C160 30 180 26 200 26 C220 26 240 30 260 40 L330 72 L372 150 L318 176 L300 150 L300 430 Q200 446 100 430 L100 150 L82 176 L28 150 L70 72 Z';
const COLLAR = 'M158 44 Q200 72 242 44';
const PRINT = { x: 110, y: 96, w: 180, h: 180 * 5790 / 4680 };
for (const id of ['tee', 'tee-shade', 'tee-clip-path']) $('#' + id).setAttribute('d', TEE);
$('#collar').setAttribute('d', COLLAR);

function setShirtColour() {
  const s = SHIRTS[state.shirt];
  $('#tee').setAttribute('fill', s.hex);
  $('#collar').setAttribute('stroke', s.dark ? '#fff' : '#000');
  $('#collar').setAttribute('stroke-opacity', s.dark ? '.18' : '.2');
}

function drawDesign() {
  const g = $('#design');
  g.innerHTML = '';
  if (!state.day) return;
  const svg = renderSVG(state.day, { shirt: state.shirt, caption: state.caption });
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  const nested = document.importNode(doc, true);
  nested.setAttribute('x', PRINT.x); nested.setAttribute('y', PRINT.y);
  nested.setAttribute('width', PRINT.w); nested.setAttribute('height', PRINT.h);
  g.appendChild(nested);
}

function drawHero() {
  // A fixed, pre-baked sample so the hero renders instantly without a network call.
  const sample = {
    place: { name: 'Portland', admin1: 'Oregon', country: 'United States', lat: 45.5235, lon: -122.6762 },
    date: '1991-06-14', unit: 'F',
    hourly: {
      temp: [49.3,48.3,47.5,46.9,46.5,46.3,46.9,48.3,49.9,51.9,54,55.3,57.3,59.4,61.1,63.3,64.4,64.4,64.3,63.5,61.1,58.4,55.4,53.8],
      precip: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      cloud: [31,33,52,48,50,55,54,61,60,99,98,100,100,100,99,100,91,62,32,9,13,13,19,16],
      wind: [], code: [1,1,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,2,1,0,0,0,0,0],
    },
    daily: { sunrise: '1991-06-14T05:21', sunset: '1991-06-14T21:00', precipSum: 0, daylightMinutes: 939 },
  };
  $('#hero-art').innerHTML = renderSVG(sample, { shirt: 'black', caption: 'The day you were born', preview: 'solid' });
}

// ---------- facts panel ----------
function facts() {
  const d = state.day, el = $('#facts');
  if (!d) { el.innerHTML = '<p>Pick a place and a date to see its weather take shape.</p>'; return; }
  const u = '°' + d.unit;
  const t = d.hourly.temp.filter((v) => v != null);
  const hi = Math.round(Math.max(...t)), lo = Math.round(Math.min(...t));
  const dl = d.daily.daylightMinutes;
  const nice = new Date(d.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  el.innerHTML = `
    <p class="big">${esc(nice)}</p>
    <p>${esc([d.place.name, d.place.admin1, d.place.country].filter(Boolean).join(', '))}</p>
    <p>High ${hi}${u} · Low ${lo}${u}${dl != null ? ` · ${Math.floor(dl / 60)}h ${String(dl % 60).padStart(2, '0')}m of daylight` : ''}</p>
    <p class="dim">${esc(summarize(d).replace(/^High.*?\. /, ''))} ${d.moon ? '· ' + esc(moonName(d.moon.phase).toLowerCase()) : ''}</p>`;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- data ----------
async function loadDay() {
  if (!state.place || !state.date) { state.day = null; drawDesign(); facts(); updateBuy(); return; }
  const id = ++dayReq;
  $('#loading').hidden = false;
  setStatus('');
  const p = state.place;
  const qs = new URLSearchParams({ lat: p.lat, lon: p.lon, date: state.date, unit: state.unit, name: p.name, admin1: p.admin1 || '', country: p.country || '', cc: p.countryCode || '' });
  try {
    const r = await fetch('/api/day?' + qs);
    const j = await r.json();
    if (id !== dayReq) return;
    if (!r.ok) throw new Error(j.error || 'Could not load that day');
    state.day = j;
  } catch (e) {
    if (id !== dayReq) return;
    state.day = null;
    setStatus(e.message);
  } finally {
    if (id === dayReq) $('#loading').hidden = true;
  }
  drawDesign(); facts(); updateBuy();
}

function setStatus(msg, ok = false) { const s = $('#status'); s.textContent = msg; s.className = 'status' + (ok ? ' ok' : ''); }
function updateBuy() { $('#buy').disabled = !(state.day && state.cfg?.payments_configured); }

// ---------- place search ----------
let searchTimer = null, suggestions = [], activeIdx = -1;
$('#place').addEventListener('input', (e) => {
  const q = e.target.value.trim();
  state.place = null; $('#place-picked').textContent = '';
  clearTimeout(searchTimer);
  if (q.length < 2) return hideSuggest();
  searchTimer = setTimeout(async () => {
    try {
      const r = await fetch('/api/geocode?q=' + encodeURIComponent(q));
      const j = await r.json();
      suggestions = j.results || [];
      showSuggest();
    } catch { hideSuggest(); }
  }, 280);
});
$('#place').addEventListener('keydown', (e) => {
  const ul = $('#suggest');
  if (ul.hidden) return;
  if (e.key === 'ArrowDown') { activeIdx = Math.min(suggestions.length - 1, activeIdx + 1); paintActive(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { activeIdx = Math.max(0, activeIdx - 1); paintActive(); e.preventDefault(); }
  else if (e.key === 'Enter' && activeIdx >= 0) { pick(suggestions[activeIdx]); e.preventDefault(); }
  else if (e.key === 'Escape') hideSuggest();
});
document.addEventListener('click', (e) => { if (!e.target.closest('.field')) hideSuggest(); });
function showSuggest() {
  const ul = $('#suggest');
  activeIdx = -1;
  if (!suggestions.length) { ul.innerHTML = '<li><small>No places found — try the nearest larger town.</small></li>'; ul.hidden = false; return; }
  ul.innerHTML = suggestions.map((p, i) => `<li data-i="${i}">${esc(p.name)}<small>${esc([p.admin1, p.country].filter(Boolean).join(', '))} · ${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}</small></li>`).join('');
  ul.querySelectorAll('li[data-i]').forEach((li) => li.addEventListener('click', () => pick(suggestions[Number(li.dataset.i)])));
  ul.hidden = false;
}
function paintActive() { $('#suggest').querySelectorAll('li').forEach((li, i) => li.classList.toggle('active', i === activeIdx)); }
function hideSuggest() { $('#suggest').hidden = true; }
function pick(p) {
  state.place = p;
  $('#place').value = p.name;
  $('#place-picked').textContent = `${[p.admin1, p.country].filter(Boolean).join(', ')} · ${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`;
  if (p.countryCode && !unitTouched) setUnit(['US', 'LR', 'MM'].includes(p.countryCode) ? 'F' : 'C', false);
  hideSuggest();
  loadDay();
}

// ---------- other controls ----------
let unitTouched = false;
function setUnit(u, touched = true) {
  state.unit = u; if (touched) unitTouched = true;
  document.querySelectorAll('[data-unit]').forEach((b) => b.classList.toggle('on', b.dataset.unit === u));
}
document.querySelectorAll('[data-unit]').forEach((b) => b.addEventListener('click', () => { setUnit(b.dataset.unit); loadDay(); }));

$('#date').addEventListener('change', (e) => { state.date = e.target.value; loadDay(); });
$('#caption').addEventListener('input', (e) => { state.caption = e.target.value; $('#caption-count').textContent = e.target.value.length; drawDesign(); });

function buildSwatches() {
  const el = $('#swatches');
  el.innerHTML = '';
  for (const [key, s] of Object.entries(SHIRTS)) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'swatch' + (key === state.shirt ? ' on' : ''); b.title = s.label; b.style.background = s.hex; b.setAttribute('aria-label', s.label);
    b.addEventListener('click', () => { state.shirt = key; buildSwatches(); buildSizes(); setShirtColour(); drawDesign(); });
    el.appendChild(b);
  }
}
function buildSizes() {
  const el = $('#sizes');
  el.innerHTML = '';
  const avail = SHIRTS[state.shirt].sizes;
  if (!avail.includes(state.size)) state.size = avail.includes('l') ? 'l' : avail[0];
  for (const sz of ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl']) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = SIZE_LABELS[sz]; b.className = sz === state.size ? 'on' : '';
    b.disabled = !avail.includes(sz);
    b.addEventListener('click', () => { state.size = sz; buildSizes(); });
    el.appendChild(b);
  }
}

// ---------- checkout ----------
$('#form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.day) return setStatus('Pick a place and a date first.');
  const btn = $('#buy');
  btn.disabled = true; btn.textContent = 'Opening checkout…';
  setStatus('');
  const spec = { place: state.place, date: state.date, unit: state.unit, shirt: state.shirt, size: state.size, caption: state.caption };
  try {
    const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spec, quantity: 1 }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Checkout failed');
    window.location.href = j.url;
  } catch (err) {
    setStatus(err.message);
    btn.disabled = false; btn.textContent = 'Buy this shirt';
  }
});

// ---------- boot ----------
(async function boot() {
  drawHero();
  buildSwatches(); buildSizes(); setShirtColour();
  try {
    state.cfg = await (await fetch('/api/config')).json();
    $('#price').textContent = '$' + (state.cfg.price_cents / 100).toFixed(0);
    $('#shipping').textContent = '$' + (state.cfg.shipping_cents / 100).toFixed(2);
    $('#date').min = state.cfg.min_date; $('#date').max = state.cfg.max_date;
    if (!state.cfg.payments_configured) setStatus('Checkout is not configured on this deployment yet.');
    if (state.cfg.stripe_mode === 'test' || state.cfg.print_env === 'sandbox') {
      const b = $('#env-badge'); b.hidden = false;
      b.textContent = `Demo mode: Stripe ${state.cfg.stripe_mode} payments · Prodigi ${state.cfg.print_env} — no real charge, no real shirt. Use card 4242 4242 4242 4242.`;
    }
  } catch { setStatus('Could not load store configuration.'); }

  // Resume a design after a cancelled checkout (?resume=<spec>) or start with a sample.
  const resume = new URLSearchParams(location.search).get('resume');
  if (resume) {
    try {
      const spec = JSON.parse(atob(resume.replace(/-/g, '+').replace(/_/g, '/')));
      state.place = spec.place; state.date = spec.date; state.unit = spec.unit; state.caption = spec.caption || ''; state.shirt = spec.shirt; state.size = spec.size; unitTouched = true;
      $('#place').value = spec.place.name; $('#place-picked').textContent = [spec.place.admin1, spec.place.country].filter(Boolean).join(', ');
      $('#date').value = spec.date; $('#caption').value = state.caption; $('#caption-count').textContent = state.caption.length;
      setUnit(spec.unit, true); buildSwatches(); buildSizes(); setShirtColour();
      history.replaceState(null, '', '/#build');
      loadDay();
      return;
    } catch { /* fall through */ }
  }
  // Default sample so the mockup is never empty
  state.place = { name: 'Portland', admin1: 'Oregon', country: 'United States', countryCode: 'US', lat: 45.52345, lon: -122.67621 };
  state.date = '1991-06-14'; state.caption = 'The day you were born';
  $('#place').value = 'Portland'; $('#place-picked').textContent = 'Oregon, United States · 45.52, -122.68';
  $('#date').value = state.date; $('#caption').value = state.caption; $('#caption-count').textContent = state.caption.length;
  loadDay();
})();
