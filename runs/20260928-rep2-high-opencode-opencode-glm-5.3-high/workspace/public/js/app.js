// Nightshift studio — the designer. Everything renders from the live sky:
// the preview and the paid-for print file are the same code at different
// sizes, so what you approve is exactly what ships.

import { renderSky } from './starmap.js';

const $ = (id) => document.getElementById(id);

const state = {
  lat: null,
  lng: null,
  timezone: null,
  placeLabel: null,
  wallDate: null,
  wallTime: null,
  title: 'The night we met',
  theme: 'aurora',
  color: 'white',
  size: 'm',
  quantity: 1,
  showMoon: true,
  showLines: true,
  country: 'US',
};

let catalog = null;

// ---------- catalog ------------------------------------------------------
async function loadCatalog() {
  const response = await fetch('/api/catalog');
  if (!response.ok) throw new Error('catalog unavailable');
  catalog = await response.json();
  // Style swatches.
  for (const theme of catalog.themes) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch theme';
    swatch.dataset.id = theme.id;
    swatch.title = theme.label;
    swatch.style.background = `linear-gradient(150deg, ${theme.disc.zenith}, ${theme.disc.horizon} 70%, ${theme.star.halo})`;
    swatch.setAttribute('aria-label', theme.label);
    swatch.onclick = () => {
      state.theme = theme.id;
      refresh();
    };
    $('themeSwatches').appendChild(swatch);
  }
  for (const color of catalog.colors) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch color';
    swatch.dataset.id = color.id;
    swatch.title = color.label;
    swatch.style.background = color.proof;
    swatch.setAttribute('aria-label', color.label);
    swatch.onclick = () => {
      state.color = color.id;
      refresh();
    };
    $('colorSwatches').appendChild(swatch);
  }
  for (const size of catalog.sizes) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'size';
    button.dataset.id = size.id;
    button.textContent = size.label;
    button.onclick = () => {
      state.size = size.id;
      refresh();
    };
    $('sizeButtons').appendChild(button);
  }
  const quantity = $('quantity');
  for (let n = 1; n <= catalog.quantityLimit; n++) {
    quantity.add(new Option(String(n), String(n)));
  }
  quantity.onchange = () => {
    state.quantity = Number(quantity.value);
    refresh();
  };
  const country = $('shipCountry');
  for (const code of catalog.countries) {
    const option = new Option(code, code, false, code === 'US');
    option.dataset.label = codeName(code);
    country.add(option);
  }
  country.onchange = () => {
    state.country = country.value;
    refresh();
  };
  // Group labels for the select.
  groupCountries(country);
}

function codeName(code) {
  try {
    const region = new Intl.DisplayNames(['en'], { type: 'region' });
    return region.of(code) || code;
  } catch {
    return code;
  }
}

function groupCountries(select) {
  const groups = {};
  for (const option of [...select.options]) {
    const letter = option.dataset.label[0].toUpperCase();
    (groups[letter] ||= []).push(option);
  }
  select.textContent = '';
  for (const letter of Object.keys(groups).sort()) {
    const group = document.createElement('optgroup');
    group.label = letter;
    for (const option of groups[letter]) group.appendChild(option);
    select.appendChild(group);
  }
  select.value = 'US';
}

// ---------- geocoding ----------------------------------------------------
let searchTimer = null;
$('placeSearch').addEventListener('input', () => {
  clearTimeout(searchTimer);
  const query = $('placeSearch').value.trim();
  if (query.length < 2) {
    $('placeResults').classList.add('hidden');
    return;
  }
  searchTimer = setTimeout(() => searchPlaces(query), 350);
});

async function searchPlaces(query) {
  const results = $('placeResults');
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`,
    );
    const data = await response.json();
    results.textContent = '';
    if (!data.results?.length) {
      results.innerHTML = '<li class="none">No places found — try a bigger town nearby, or enter coordinates manually.</li>';
      results.classList.remove('hidden');
      return;
    }
    for (const place of data.results) {
      const label = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
      const li = document.createElement('li');
      li.textContent = `${label} · ${place.timezone}`;
      li.onclick = () => {
        state.lat = place.latitude;
        state.lng = place.longitude;
        state.timezone = place.timezone;
        state.placeLabel = [place.name, place.admin1].filter(Boolean).join(', ');
        $('placeSearch').value = label;
        results.classList.add('hidden');
        refresh();
      };
      results.appendChild(li);
    }
    results.classList.remove('hidden');
  } catch {
    results.innerHTML = '<li class="none">Place search is offline — enter coordinates manually below.</li>';
    results.classList.remove('hidden');
  }
}
document.addEventListener('click', (event) => {
  if (!event.target.closest('.search')) $('placeResults').classList.add('hidden');
});

// Manual coordinates.
function wireManual() {
  const apply = () => {
    const lat = parseFloat($('latInput').value);
    const lng = parseFloat($('lngInput').value);
    const label = $('manualLabel').value.trim();
    if (Number.isFinite(lat) && Number.isFinite(lng) && label) {
      state.lat = lat;
      state.lng = lng;
      state.placeLabel = label;
      state.timezone = guessZone(lat, lng) || 'UTC';
      refresh();
    }
  };
  $('latInput').onchange = apply;
  $('lngInput').onchange = apply;
  $('manualLabel').onchange = apply;
}

// Rough timezone band by longitude — only a fallback for manual entry.
function guessZone(lat, lng) {
  const hours = Math.round(lng / 15);
  const names = {
    '-8': 'America/Los_Angeles', '-7': 'America/Denver', '-6': 'America/Chicago',
    '-5': 'America/New_York', '-3': 'America/Sao_Paulo', '0': 'Europe/London',
    '1': 'Europe/Paris', '2': 'Europe/Athens', '3': 'Europe/Moscow', '4': 'Asia/Dubai',
    '5': 'Asia/Karachi', '5.5': 'Asia/Kolkata', '8': 'Asia/Shanghai', '9': 'Asia/Tokyo',
    '10': 'Australia/Sydney', '12': 'Pacific/Auckland',
  };
  return names[String(hours)] || 'UTC';
}

// ---------- inputs ------------------------------------------------------
function wireInputs() {
  const now = new Date();
  $('date').value = now.toISOString().slice(0, 10);
  $('time').value = '22:00';
  state.wallDate = $('date').value;
  state.wallTime = $('time').value;
  $('date').onchange = () => {
    state.wallDate = $('date').value;
    refresh();
  };
  $('time').onchange = () => {
    state.wallTime = $('time').value;
    refresh();
  };
  $('title').oninput = () => {
    state.title = $('title').value.trim() || 'The night we met';
    refresh();
  };
  $('showMoon').onchange = () => {
    state.showMoon = $('showMoon').checked;
    refresh();
  };
  $('showLines').onchange = () => {
    state.showLines = $('showLines').checked;
    refresh();
  };
  $('toShipping').onclick = () => {
    if (!state.placeLabel) {
      showError('placeError', 'Choose a place first — the sky has to know where to stand.');
      $('placeSearch').focus();
      $('placeSearch').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    $('shippingPanel').classList.remove('hidden');
    $('shippingPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $('shippingPanel').addEventListener('submit', (event) => {
    event.preventDefault();
    pay();
  });
}

// ---------- rendering ----------------------------------------------------
const previewCanvas = $('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');

function spec() {
  return {
    lat: state.lat,
    lng: state.lng,
    wallISO: `${state.wallDate}T${state.wallTime}`,
    timezone: state.timezone || 'UTC',
    title: state.title,
    placeLabel: state.placeLabel || 'Somewhere on Earth',
    theme: state.theme,
    showMoon: state.showMoon,
    showLines: state.showLines,
  };
}

let lastSky = null;

function refresh() {
  if (!catalog) return;
  const theme = catalog.themes.find((t) => t.id === state.theme);
  const color = catalog.colors.find((c) => c.id === state.color);
  const size = catalog.sizes.find((s) => s.id === state.size);

  for (const el of document.querySelectorAll('.swatch.theme')) el.classList.toggle('selected', el.dataset.id === state.theme);
  for (const el of document.querySelectorAll('.swatch.color')) el.classList.toggle('selected', el.dataset.id === state.color);
  for (const el of document.querySelectorAll('.size')) el.classList.toggle('selected', el.dataset.id === state.size);

  $('garmentFrame').style.background = color.proof;
  const dark = color.ink === 'light';
  $('garmentFrame').classList.toggle('dark', dark);
  $('garmentCaption').textContent = `${color.label} Bella + Canvas 3001 · front print, 12 × 16″`;

  const canSky = state.placeLabel !== null || state.lat !== null;
  if (canSky) {
    lastSky = renderSky(previewCtx, previewCanvas.width, previewCanvas.height, spec(), theme, color.ink);
    $('skyStats').textContent = skyStatsLine(lastSky);
    $('timezoneHint').textContent = `Times are local — ${state.timezone}, ${formattedOffset()}.`;
    $('placeHint').textContent = `${state.placeLabel} · ${Math.abs(state.lat).toFixed(3)}° ${state.lat >= 0 ? 'N' : 'S'}, ${Math.abs(state.lng).toFixed(3)}° ${state.lng >= 0 ? 'E' : 'W'}`;
  } else {
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    $('skyStats').textContent = 'Choose a place to raise the sky.';
  }

  // Prices, straight from the server's catalog.
  const qty = state.quantity;
  const shipping = catalog.shipping.find((s) => s.countries?.includes(state.country)) || catalog.shipping[catalog.shipping.length - 1];
  const subtotal = (size.cents * qty) / 100;
  $('priceLine').textContent = `Tee ${money(size.cents)}${qty > 1 ? ` × ${qty} — ${money(size.cents * qty)}` : ''}`;
  $('shippingLine').textContent = `${shipping.id === 'us' ? 'US' : 'International'} shipping ${money(shipping.cents)}`;
  $('totalLine').textContent = `Total ${money(size.cents * qty + shipping.cents)}`;
}

function money(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formattedOffset() {
  const minutes = lastSky?.offsetMinutes ?? 0;
  const sign = minutes < 0 ? '−' : '+';
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

function skyStatsLine(sky) {
  const parts = [`${sky.visibleStars.toLocaleString()} stars`];
  if (state.showMoon) {
    parts.push(
      sky.moonUp
        ? `the Moon was a ${sky.moonPhase} (${Math.round(sky.moonIllum * 100)}% lit)`
        : 'the Moon was below the horizon',
    );
  }
  parts.push('every one placed for that exact instant');
  return parts.join(' · ');
}

// ---------- checkout -----------------------------------------------------
async function pay() {
  hideError('checkoutError');
  const button = $('payButton');
  const address = readAddress();
  if (!address) return;

  if (!state.placeLabel || state.lat === null) {
    showError('placeError', 'Choose a place first — the sky has to know where to stand.');
    return;
  }

  button.disabled = true;
  button.textContent = 'Drawing your print file…';
  try {
    // 1. Render the print at full size (the same renderer as the preview).
    await fontsReady();
    const printBlob = await renderPrintBlob();
    if (printBlob.size > 4 * 1024 * 1024) {
      throw new Error('The print file came out too large to upload — please try again.');
    }

    // 2. Store the print; the server issues the URL it will trust later.
    button.textContent = 'Storing your print…';
    const uploadResponse = await fetch('/api/print-upload', {
      method: 'POST',
      headers: { 'content-type': 'image/png' },
      body: printBlob,
    });
    const upload = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(upload.error || 'could not store the print file');

    // 3. Open Stripe Checkout — the server prices the order itself.
    button.textContent = 'Opening checkout…';
    const checkoutResponse = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        design: spec(),
        garment: { color: state.color, size: state.size, quantity: state.quantity },
        address,
        print: upload.url,
      }),
    });
    const checkout = await checkoutResponse.json();
    if (!checkoutResponse.ok) throw new Error(checkout.error || 'could not start checkout');
    window.location.href = checkout.url;
  } catch (error) {
    showError('checkoutError', error.message || 'Something went wrong — please try again.');
    button.disabled = false;
    button.textContent = 'Pay with card';
  }
}

function readAddress() {
  const fields = {
    name: $('shipName').value.trim(),
    email: $('shipEmail').value.trim(),
    line1: $('shipLine1').value.trim(),
    line2: $('shipLine2').value.trim(),
    city: $('shipCity').value.trim(),
    state: $('shipState').value.trim(),
    zip: $('shipZip').value.trim(),
    country: $('shipCountry').value,
  };
  const missing = {
    name: 'your name',
    email: 'your email',
    line1: 'an address line',
    city: 'a city',
    zip: 'a postal code',
  };
  for (const [key, label] of Object.entries(missing)) {
    if (!fields[key]) {
      showError('checkoutError', `Please add ${label}.`);
      return null;
    }
  }
  return fields;
}

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('600 168px "Cormorant Garamond"'),
      document.fonts.load('500 58px Inter'),
    ]);
    await document.fonts.ready;
  } catch {
    // Fallback serif is acceptable; never block checkout on fonts.
  }
}

async function renderPrintBlob() {
  const canvas = document.createElement('canvas');
  canvas.width = catalog.print.width;   // 3600 px = 12" at 300 DPI
  canvas.height = catalog.print.height;  // 4800 px = 16" at 300 DPI
  const ctx = canvas.getContext('2d');
  const theme = catalog.themes.find((t) => t.id === state.theme);
  const color = catalog.colors.find((c) => c.id === state.color);
  renderSky(ctx, canvas.width, canvas.height, spec(), theme, color.ink);
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('could not encode the print file'))), 'image/png');
  });
}

// ---------- errors ------------------------------------------------------
function showError(id, message) {
  const el = $(id);
  el.textContent = message;
  el.classList.remove('hidden');
}
function hideError(id) {
  $(id).classList.add('hidden');
}

// ---------- boot ---------------------------------------------------------
async function boot() {
  if (new URLSearchParams(location.search).get('cancelled')) {
    $('cancelledNotice').classList.remove('hidden');
  }
  try {
    await loadCatalog();
  } catch {
    showError('checkoutError', 'The store catalog failed to load — reload the page.');
    return;
  }
  wireInputs();
  wireManual();
  refresh();
  // Re-render once web fonts have actually landed.
  document.fonts.ready.then(refresh).catch(() => {});
}
boot();
