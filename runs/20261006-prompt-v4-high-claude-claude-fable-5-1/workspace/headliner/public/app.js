const $ = (s) => document.querySelector(s);
const catalog = await (await fetch('/api/catalog')).json();

const PRESETS = {
  'Family': {
    tourName: 'The Okonkwo Family', subtitle: 'World Tour', tagline: 'Live and in person', soldOut: true,
    stops: [
      { date: 'JUN 14 2009', place: 'Lagos, NG', venue: 'Where it started' },
      { date: 'SEP 02 2011', place: 'Houston, TX', venue: 'First apartment' },
      { date: 'MAY 20 2014', place: 'Austin, TX', venue: 'The wedding' },
      { date: 'FEB 11 2017', place: 'Denver, CO', venue: 'Amara arrives' },
      { date: 'AUG 30 2019', place: 'Lisbon, PT', venue: 'The big trip' },
      { date: 'DEC 24 2022', place: 'Chicago, IL', venue: "Grandma's house" },
      { date: 'JUL 04 2026', place: 'Portland, OR', venue: 'Home' },
    ],
  },
  'Couple': {
    tourName: 'Sam & Priya', subtitle: 'Anniversary Tour', tagline: 'Ten years, still touring', soldOut: true,
    stops: [
      { date: 'OCT 03 2016', place: 'Brooklyn, NY', venue: 'The bar with no sign' },
      { date: 'FEB 14 2017', place: 'Montauk, NY', venue: 'First trip, car broke down' },
      { date: 'JUN 21 2018', place: 'Lisbon, PT', venue: 'Said it first' },
      { date: 'MAR 09 2019', place: 'Philadelphia, PA', venue: 'Moved in together' },
      { date: 'SEP 12 2021', place: 'Hudson, NY', venue: 'The wedding' },
      { date: 'OCT 03 2026', place: 'Everywhere', venue: 'Ten years' },
    ],
  },
  "Baby's first year": {
    tourName: 'Baby Theo', subtitle: 'Debut Tour', tagline: 'Now appearing nightly', soldOut: false,
    stops: [
      { date: 'JAN 18 2026', place: 'Mount Sinai', venue: 'Opening night, 3:42 AM' },
      { date: 'FEB 2026', place: 'The living room', venue: 'First smile' },
      { date: 'APR 2026', place: 'Prospect Park', venue: 'First picnic' },
      { date: 'JUN 2026', place: 'Cape Cod, MA', venue: 'First beach, hated it' },
      { date: 'AUG 2026', place: 'The kitchen', venue: 'First solid food' },
      { date: 'NOV 2026', place: 'Cleveland, OH', venue: 'Met the cousins' },
      { date: 'JAN 18 2027', place: 'Home', venue: 'One year. Encore.' },
    ],
  },
  'The friend group': {
    tourName: 'The Thursday Night Crew', subtitle: 'Reunion Tour', tagline: 'Back by unpopular demand', soldOut: true,
    stops: [
      { date: '2011', place: 'Ann Arbor, MI', venue: 'Freshman dorm, 4th floor' },
      { date: '2013', place: 'South Padre, TX', venue: 'Never speak of it' },
      { date: '2015', place: 'Chicago, IL', venue: "Dev's apartment era" },
      { date: '2017', place: 'Las Vegas, NV', venue: "Marcus's bachelor party" },
      { date: '2019', place: 'Asheville, NC', venue: 'The cabin trip' },
      { date: '2021', place: 'Zoom', venue: 'The pandemic residency' },
      { date: '2023', place: 'Tulum, MX', venue: 'The 30th birthdays' },
      { date: '2026', place: 'Denver, CO', venue: 'This weekend' },
    ],
  },
  'Farewell tour': {
    tourName: 'Linda Park', subtitle: 'Farewell Tour', tagline: '34 years, one last show', soldOut: true,
    stops: [
      { date: 'AUG 1992', place: 'Sacramento, CA', venue: 'First classroom, room 12' },
      { date: '1998', place: 'Sacramento, CA', venue: 'Teacher of the year' },
      { date: '2004', place: 'Elk Grove, CA', venue: 'Opened the new school' },
      { date: '2011', place: 'Washington, DC', venue: 'The 8th grade trip' },
      { date: '2016', place: 'Elk Grove, CA', venue: 'Became principal' },
      { date: '2020', place: 'Her kitchen', venue: 'The remote year' },
      { date: 'JUN 12 2026', place: 'Elk Grove, CA', venue: 'Last bell' },
    ],
  },
  'Good dog': {
    tourName: 'Biscuit', subtitle: 'Good Boy Tour', tagline: 'No tricks. Just vibes.', soldOut: false,
    stops: [
      { date: 'MAR 2019', place: 'Austin Humane Society', venue: 'Picked us' },
      { date: 'APR 2019', place: 'The couch', venue: 'Declared it his' },
      { date: 'JUL 2020', place: 'Barton Springs', venue: 'Learned to swim, sort of' },
      { date: 'OCT 2022', place: 'Big Bend, TX', venue: 'Saw a javelina' },
      { date: 'DEC 2024', place: 'Grandma\'s kitchen', venue: 'The ham incident' },
      { date: '2026', place: 'Every park', venue: 'Still touring' },
    ],
  },
};

const defaults = { ...structuredClone(PRESETS['Family']), years: '', footer: '', layout: 'classic', shirtColor: 'black', palette: 'bone', size: 'l' };
let state = loadState();
let area = 'front';

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem('headliner.design'));
    if (s && s.stops) return { ...defaults, ...s };
  } catch {}
  return structuredClone(defaults);
}
function persist() { localStorage.setItem('headliner.design', JSON.stringify(state)); }

// ---------- shirt mockup geometry ----------
const TEE_BODY = 'M135,34 L70,58 L6,146 L72,190 L92,164 L92,446 L308,446 L308,164 L328,190 L394,146 L330,58 L265,34';
const COLLAR_FRONT = 'M135,34 C150,80 250,80 265,34';
const COLLAR_BACK = 'M135,34 C150,52 250,52 265,34';
function teePath(front) { return TEE_BODY + ' ' + (front ? 'C250,80 150,80 135,34' : 'C250,52 150,52 135,34') + ' Z'; }
function drawShirt() {
  const hex = catalog.SHIRT_COLORS[state.shirtColor].hex;
  const front = area === 'front';
  $('#tee').setAttribute('d', teePath(front));
  $('#teeClipPath').setAttribute('d', teePath(front));
  $('#teeShade').setAttribute('d', teePath(front));
  $('#collar').setAttribute('d', front ? COLLAR_FRONT : COLLAR_BACK);
  $('#tee').setAttribute('fill', hex);
  // print area: 15.6in on a ~21in-wide body => ~75% of torso width.
  $('#printImg').setAttribute('x', 118); $('#printImg').setAttribute('y', front ? 84 : 72);
  $('#printImg').setAttribute('width', 164); $('#printImg').setAttribute('height', 203);
}

// ---------- preview rendering ----------
let seq = 0, timer;
const urls = { front: null, back: null };
function schedulePreview() { clearTimeout(timer); timer = setTimeout(renderPreview, 300); }
async function renderPreview() {
  const my = ++seq;
  $('#loading').classList.add('on');
  const areas = state.layout === 'classic' ? ['front', 'back'] : ['front'];
  try {
    const blobs = await Promise.all(areas.map((a) =>
      fetch('/api/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ design: state, area: a, width: 820 }) })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('preview failed'))))));
    if (my !== seq) return;
    areas.forEach((a, i) => { if (urls[a]) URL.revokeObjectURL(urls[a]); urls[a] = URL.createObjectURL(blobs[i]); });
    if (state.layout !== 'classic') urls.back = null;
    showArea();
  } catch (e) { console.error(e); }
  finally { if (my === seq) $('#loading').classList.remove('on'); }
}
function showArea() {
  if (state.layout !== 'classic') area = 'front';
  $('.tab[data-area=back]').hidden = state.layout !== 'classic';
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.area === area));
  drawShirt();
  $('#printImg').setAttribute('href', urls[area] || '');
  $('#areaNote').textContent = state.layout === 'classic'
    ? (area === 'front' ? 'Front: left-chest tour logo. Flip to see the back.' : 'Back: the full tour, edge to edge.')
    : 'Front-only: the full tour on the chest.';
}

// ---------- controls ----------
function bindText(id, key) {
  const el = $('#' + id);
  el.value = state[key] || '';
  el.addEventListener('input', () => { state[key] = el.value; persist(); schedulePreview(); });
}
['tourName', 'subtitle', 'years', 'tagline', 'footer'].forEach((k) => bindText(k, k));
$('#soldOut').checked = !!state.soldOut;
$('#soldOut').addEventListener('change', (e) => { state.soldOut = e.target.checked; persist(); schedulePreview(); });

function renderStops() {
  const wrap = $('#stops');
  wrap.innerHTML = '';
  state.stops.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'stop';
    row.innerHTML = `<input maxlength="18" placeholder="JUN 14 2019" value=""><input maxlength="30" placeholder="AUSTIN, TX" value=""><input maxlength="36" placeholder="THE WEDDING" value=""><button class="del" type="button" title="Remove">×</button>`;
    const [d, p, v] = row.querySelectorAll('input');
    d.value = s.date; p.value = s.place; v.value = s.venue;
    d.oninput = () => { s.date = d.value; persist(); schedulePreview(); };
    p.oninput = () => { s.place = p.value; persist(); schedulePreview(); };
    v.oninput = () => { s.venue = v.value; persist(); schedulePreview(); };
    row.querySelector('.del').onclick = () => { state.stops.splice(i, 1); persist(); renderStops(); schedulePreview(); };
    wrap.appendChild(row);
  });
  $('#addStop').disabled = state.stops.length >= catalog.MAX_STOPS;
}
$('#addStop').onclick = () => {
  if (state.stops.length >= catalog.MAX_STOPS) return;
  state.stops.push({ date: '', place: '', venue: '' });
  renderStops();
  $('#stops .stop:last-child input').focus();
};

Object.keys(PRESETS).forEach((name) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'chip'; b.textContent = name;
  b.onclick = () => {
    const p = structuredClone(PRESETS[name]);
    Object.assign(state, p, { years: '' });
    ['tourName', 'subtitle', 'years', 'tagline'].forEach((k) => ($('#' + k).value = state[k] || ''));
    $('#soldOut').checked = !!state.soldOut;
    renderStops(); persist(); schedulePreview();
  };
  $('#presets').appendChild(b);
});

function renderLayouts() {
  const w = $('#layouts'); w.innerHTML = '';
  for (const [k, l] of Object.entries(catalog.LAYOUTS)) {
    const d = document.createElement('div');
    d.className = 'layout' + (state.layout === k ? ' active' : '');
    d.innerHTML = `<span class="p">$${(l.priceCents / 100).toFixed(0)}</span><b>${l.label}</b><span>${k === 'classic' ? 'Chest logo front, full tour on the back. The real deal.' : 'The whole tour on the front.'}</span>`;
    d.onclick = () => { state.layout = k; persist(); renderLayouts(); updatePrice(); schedulePreview(); };
    w.appendChild(d);
  }
}
function hexLum(hex) { const n = parseInt(hex.slice(1), 16); const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function contrast(a, b) { const [x, y] = [hexLum(a), hexLum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function renderSwatches() {
  const sc = $('#shirtColors'); sc.innerHTML = '';
  for (const [k, c] of Object.entries(catalog.SHIRT_COLORS)) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'swatch' + (state.shirtColor === k ? ' active' : ''); b.title = c.label; b.style.background = c.hex;
    b.onclick = () => {
      state.shirtColor = k;
      const pal = catalog.PALETTES[state.palette];
      if (pal.forDark !== c.dark) state.palette = c.dark ? 'bone' : 'ink';
      persist(); renderSwatches(); schedulePreview();
    };
    sc.appendChild(b);
  }
  const pc = $('#palettes'); pc.innerHTML = '';
  const shirtHex = catalog.SHIRT_COLORS[state.shirtColor].hex;
  for (const [k, p] of Object.entries(catalog.PALETTES)) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'swatch ink' + (state.palette === k ? ' active' : ''); b.title = p.label;
    b.style.background = p.ink; b.style.setProperty('--acc', p.accent);
    b.onclick = () => { state.palette = k; persist(); renderSwatches(); schedulePreview(); };
    pc.appendChild(b);
  }
  const pal = catalog.PALETTES[state.palette];
  $('#contrastWarn').hidden = contrast(pal.ink, shirtHex) >= 3;
}
const sizeSel = $('#size');
catalog.SIZES.forEach((s) => { const o = document.createElement('option'); o.value = s; o.textContent = s.toUpperCase(); sizeSel.appendChild(o); });
sizeSel.value = state.size;
sizeSel.onchange = () => { state.size = sizeSel.value; persist(); };

function updatePrice() { $('#price').textContent = '$' + (catalog.LAYOUTS[state.layout].priceCents / 100).toFixed(0); }

document.querySelectorAll('.tab').forEach((t) => (t.onclick = () => { area = t.dataset.area; showArea(); }));

$('#buy').onclick = async () => {
  const btn = $('#buy');
  btn.disabled = true; btn.textContent = 'Taking you to checkout…';
  try {
    const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ design: state }) });
    const j = await r.json();
    if (!r.ok || !j.url) throw new Error(j.error || 'Checkout failed');
    location.href = j.url;
  } catch (e) {
    alert(e.message); btn.disabled = false; btn.textContent = 'Buy this shirt';
  }
};

// Returning from a cancelled checkout: restore that exact design.
const restoreId = new URLSearchParams(location.search).get('design');
if (restoreId) {
  try {
    const rec = await (await fetch('/api/designs/' + restoreId)).json();
    if (rec?.design) { state = { ...defaults, ...rec.design }; persist(); ['tourName', 'subtitle', 'years', 'tagline', 'footer'].forEach((k) => ($('#' + k).value = state[k] || '')); $('#soldOut').checked = !!state.soldOut; sizeSel.value = state.size; }
  } catch {}
  history.replaceState(null, '', '/#design');
}

renderStops(); renderLayouts(); renderSwatches(); updatePrice(); drawShirt(); renderPreview();
