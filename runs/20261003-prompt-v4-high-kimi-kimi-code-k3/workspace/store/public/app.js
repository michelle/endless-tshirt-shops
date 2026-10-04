const state = {
  place: 'Paris, France',
  lat: 48.8566,
  lon: 2.3522,
  size: 'm',
  color: 'black',
};

const $ = (id) => document.getElementById(id);
const previewImg = $('previewImg');
const stage = $('shirtStage');

const SHIRT_BG = { black: '#191919', 'navy blue': '#1d2b4f', charcoal: '#3b4149' };

// Approximate local civil time -> UTC using a longitude-based zone (±15° per hour).
function whenISO() {
  const date = $('date').value;
  const time = $('time').value;
  if (!date) return null;
  const offsetH = Math.round(state.lon / 15);
  const [hh, mm] = time.split(':').map(Number);
  const utc = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), hh - offsetH, mm));
  return utc.toISOString();
}

let debounce;
function refreshPreview() {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    const when = whenISO();
    if (!when) return;
    const q = new URLSearchParams({
      when,
      lat: state.lat,
      lon: state.lon,
      place: state.place,
      caption: $('caption').value.trim(),
      color: state.color,
    });
    previewImg.src = `/api/preview?${q}`;
    stage.style.background = SHIRT_BG[state.color];
    $('shirtSizeLabel').textContent = `${state.color} · ${state.size.toUpperCase()}`;
  }, 250);
}

// --- place autocomplete ---
const placeInput = $('place');
const suggBox = $('suggestions');
placeInput.value = state.place;

placeInput.addEventListener('input', () => {
  const q = placeInput.value.trim();
  state.place = q;
  if (q.length < 2) { suggBox.classList.remove('open'); return; }
  clearTimeout(placeInput._t);
  placeInput._t = setTimeout(async () => {
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const { results } = await r.json();
      suggBox.innerHTML = '';
      for (const p of results) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = p.label;
        b.onclick = () => {
          state.place = p.label;
          state.lat = p.lat;
          state.lon = p.lon;
          placeInput.value = p.label;
          suggBox.classList.remove('open');
          refreshPreview();
        };
        suggBox.appendChild(b);
      }
      suggBox.classList.toggle('open', results.length > 0);
    } catch { /* ignore */ }
  }, 300);
});
document.addEventListener('click', (e) => {
  if (!suggBox.contains(e.target) && e.target !== placeInput) suggBox.classList.remove('open');
});

// --- controls ---
$('date').addEventListener('change', refreshPreview);
$('time').addEventListener('change', refreshPreview);
$('caption').addEventListener('input', refreshPreview);

$('sizeRow').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.size = b.dataset.size;
  for (const el of $('sizeRow').children) el.classList.toggle('selected', el === b);
  refreshPreview();
});

$('colorRow').addEventListener('click', (e) => {
  const b = e.target.closest('.swatch');
  if (!b) return;
  state.color = b.dataset.color;
  for (const el of $('colorRow').children) el.classList.toggle('selected', el === b);
  refreshPreview();
});

// --- checkout ---
$('buyBtn').addEventListener('click', async () => {
  const btn = $('buyBtn');
  const note = $('buyNote');
  const when = whenISO();
  if (!when) { note.textContent = 'Pick a date first.'; return; }
  if (!state.place || !isFinite(state.lat)) { note.textContent = 'Pick a place from the suggestions.'; return; }
  btn.disabled = true;
  note.textContent = 'Taking you to secure checkout…';
  try {
    const r = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        when,
        lat: state.lat,
        lon: state.lon,
        place: state.place,
        caption: $('caption').value.trim(),
        size: state.size,
        color: state.color,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'checkout failed');
    window.location.href = data.url;
  } catch (e) {
    note.textContent = `Something went wrong: ${e.message}`;
    btn.disabled = false;
  }
});

refreshPreview();
