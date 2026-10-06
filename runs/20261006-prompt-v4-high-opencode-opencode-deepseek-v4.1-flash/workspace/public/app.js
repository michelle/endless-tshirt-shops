// Echoform storefront behaviour.

const $ = (sel) => document.querySelector(sel);

const state = {
  message: 'Always look up',
  dedication: '',
  theme: 'signal',
  garment: 'black',
  size: 'm',
  variant: 0,
};

let config = null;
let previewTimer = null;
let serialTimer = null;

function qs(extra = {}) {
  const p = new URLSearchParams({
    message: state.message,
    dedication: state.dedication,
    theme: state.theme,
    garment: state.garment,
    size: state.size,
    variant: String(state.variant),
    ...extra,
  });
  return p.toString();
}

function previewUrl() {
  return `/api/preview.png?${qs()}`;
}

function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    $('#studio-mock').src = previewUrl();
    $('#hero-mock').src = previewUrl();
    $('#hero-badge').textContent = `“${state.message.slice(0, 42)}”`;
    clearTimeout(serialTimer);
    serialTimer = setTimeout(updateSerial, 180);
  }, 220);
}

async function updateSerial() {
  try {
    const r = await fetch(`/api/design.json?${qs()}`);
    const d = await r.json();
    $('#preview-serial').textContent = `NO. ${d.serial}`;
  } catch {
    /* ignore */
  }
}

function buildControls() {
  const themes = $('#themes');
  themes.innerHTML = '';
  for (const t of config.themes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (t.id === state.theme ? ' active' : '');
    b.title = t.name;
    b.setAttribute('aria-label', `Ink theme ${t.name}`);
    const grad = `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})`;
    b.innerHTML = `<span class="dot" style="background:${grad}"></span>`;
    b.addEventListener('click', () => {
      state.theme = t.id;
      buildControls();
      schedulePreview();
    });
    themes.appendChild(b);
  }

  const garments = $('#garments');
  garments.innerHTML = '';
  for (const g of config.garments) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'garment-swatch' + (g.id === state.garment ? ' active' : '');
    b.innerHTML = `<span class="chip" style="background:${g.hex}"></span><span>${g.name}</span>`;
    b.addEventListener('click', () => {
      state.garment = g.id;
      // keep ink legible: if the chosen theme would vanish on this garment,
      // fall back to the garment's recommended theme
      const theme = config.themes.find((x) => x.id === state.theme);
      if (theme) {
        const lightInk = ['ivory', 'mono', 'moss', 'signal', 'solar', 'ultra'].includes(state.theme);
        if (!g.dark && lightInk) state.theme = g.defaultTheme;
        if (g.dark && state.theme === 'ink') state.theme = g.defaultTheme;
      }
      buildControls();
      schedulePreview();
    });
    garments.appendChild(b);
  }

  const sizes = $('#sizes');
  sizes.innerHTML = '';
  for (const s of config.sizes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'size' + (s === state.size ? ' active' : '');
    b.textContent = s.toUpperCase();
    b.addEventListener('click', () => {
      state.size = s;
      buildControls();
      schedulePreview();
    });
    sizes.appendChild(b);
  }
}

function buildGallery() {
  const samples = [
    { message: 'Always look up', theme: 'signal', garment: 'black', variant: 0 },
    { message: 'You are my favourite', dedication: 'for Maya', theme: 'ink', garment: 'cream', variant: 2 },
    { message: 'Here comes the sun', theme: 'solar', garment: 'navy', variant: 5 },
    { message: 'Stay curious', theme: 'ink', garment: 'white', variant: 3 },
    { message: 'A long and winding road', theme: 'ivory', garment: 'maroon', variant: 1 },
    { message: 'Everything is going to be okay', theme: 'ultra', garment: 'charcoal', variant: 7 },
  ];
  const grid = $('#gallery-grid');
  grid.innerHTML = '';
  for (const s of samples) {
    const p = new URLSearchParams({ ...s, variant: String(s.variant) }).toString();
    const fig = document.createElement('figure');
    fig.className = 'gallery-item';
    fig.innerHTML = `<img loading="lazy" alt="Soundprint tee: ${s.message}" src="/api/preview.png?${p}">
      <figcaption><b>“${s.message}”</b><br>${s.garment} · ${s.theme}</figcaption>`;
    grid.appendChild(fig);
  }
}

function buildHeroRotation() {
  const samples = [
    { message: 'Always look up', theme: 'signal', garment: 'black', variant: 0 },
    { message: 'Here comes the sun', theme: 'solar', garment: 'navy', variant: 5 },
    { message: 'You are my favourite', theme: 'ivory', garment: 'maroon', variant: 2 },
    { message: 'Stay curious', theme: 'mono', garment: 'charcoal', variant: 3 },
  ];
  let i = 0;
  setInterval(() => {
    i = (i + 1) % samples.length;
    const s = samples[i];
    const p = new URLSearchParams({ ...s, variant: String(s.variant) }).toString();
    const img = $('#hero-mock');
    const next = new Image();
    next.onload = () => {
      img.src = next.src;
      $('#hero-badge').textContent = `“${s.message}”`;
    };
    next.src = `/api/preview.png?${p}`;
  }, 4200);
}

async function buy(e) {
  e.preventDefault();
  const btn = $('#buy');
  const err = $('#error');
  err.hidden = true;
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Starting checkout…';
  try {
    const r = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    const data = await r.json();
    if (!data.ok || !data.url) throw new Error(data.error || 'Checkout failed');
    window.location.href = data.url;
  } catch (ex) {
    err.textContent = ex.message;
    err.hidden = false;
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function init() {
  config = await (await fetch('/api/config')).json();

  $('#hero-price').textContent = `$${(config.price / 100).toFixed(0)}`;
  $('#price').textContent = `$${(config.price / 100).toFixed(2)}`;

  buildControls();
  buildGallery();
  buildHeroRotation();

  const msg = $('#message');
  const ded = $('#dedication');
  msg.addEventListener('input', () => {
    state.message = msg.value;
    $('#count').textContent = `${msg.value.length}/90`;
    schedulePreview();
  });
  ded.addEventListener('input', () => {
    state.dedication = ded.value;
    schedulePreview();
  });
  $('#shuffle').addEventListener('click', () => {
    state.variant = (state.variant + 1) % 24;
    schedulePreview();
  });
  $('#design-form').addEventListener('submit', buy);

  $('#count').textContent = `${state.message.length}/90`;
  updateSerial();
}

init().catch((e) => console.error(e));
