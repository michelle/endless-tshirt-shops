/* Nocturne Supply Co. storefront client */
(() => {
  const $ = (id) => document.getElementById(id);
  const state = {
    config: null,
    color: 'black',
    lat: null,
    lon: null,
    place: '',
    cart: JSON.parse(localStorage.getItem('noc_cart') || '[]'), // [{size,color,qty,design}]
    tab: 'art',
  };

  const money = (cents) => `$${(cents / 100).toFixed(2)}`;

  // starry backdrop
  (() => {
    const c = $('starsBg');
    const ctx = c.getContext('2d');
    const draw = () => {
      c.width = innerWidth; c.height = innerHeight;
      ctx.clearRect(0, 0, c.width, c.height);
      for (let i = 0; i < 160; i++) {
        const x = Math.random() * c.width, y = Math.random() * c.height;
        const r = Math.random() * 1.1 + 0.2;
        ctx.fillStyle = `rgba(245,241,230,${0.12 + Math.random() * 0.5})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
    };
    draw();
    addEventListener('resize', draw);
  })();

  async function boot() {
    const cfg = await (await fetch('/api/config')).json();
    state.config = cfg;
    if (cfg.paymentsMode === 'simulated') {
      const n = $('payNotice');
      n.hidden = false;
      n.textContent = 'Test mode: Stripe keys are not configured on this deployment, so checkout uses a clearly-labelled simulated payment (no card is charged). Set STRIPE_SECRET_KEY & STRIPE_WEBHOOK_SECRET to take real payments.';
    }
    // defaults
    const today = new Date();
    $('date').value = `${today.getFullYear() - 25}-06-21`;
    $('date').max = today.toISOString().slice(0, 10);

    // presets
    cfg.headlinePresets.forEach((h) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = h;
      b.onclick = () => { $('headline').value = h; markPreset(h); refresh(); };
      $('presets').appendChild(b);
    });
    markPreset($('headline').value);

    // swatches
    cfg.colors.forEach((c) => {
      const d = document.createElement('div');
      d.className = 'swatch' + (c.id === state.color ? ' on' : '');
      d.dataset.id = c.id;
      d.innerHTML = `<div class="chip" style="background:${c.hex}"></div><div class="nm">${c.name}</div>`;
      d.onclick = () => {
        state.color = c.id;
        document.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('on', s.dataset.id === c.id));
        refresh();
      };
      $('swatches').appendChild(d);
    });

    // sizes
    cfg.sizes.forEach((s) => {
      const o = document.createElement('option');
      o.value = s; o.textContent = s.toUpperCase();
      if (s === 'm') o.selected = true;
      $('size').appendChild(o);
    });

    ['headline', 'dedication', 'date', 'time', 'place'].forEach((id) => $(id).addEventListener('input', onInput));
    $('geoBtn').onclick = geolocate;
    $('tabArt').onclick = () => setTab('art');
    $('tabTee').onclick = () => setTab('tee');
    $('addBtn').onclick = addToCart;
    $('checkoutBtn').onclick = () => {
      localStorage.setItem('noc_cart', JSON.stringify(state.cart));
      location.href = '/checkout.html';
    };

    renderCart();
    refresh();
  }

  function markPreset(h) {
    document.querySelectorAll('#presets button').forEach((b) => b.classList.toggle('on', b.textContent === h));
  }

  function setTab(t) {
    state.tab = t;
    $('tabArt').classList.toggle('on', t === 'art');
    $('tabTee').classList.toggle('on', t === 'tee');
    paintPreview(lastPreview);
  }

  // ------------------------------------------------------------ location ----
  let searchTimer = null;
  function onInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = $('place').value.trim();
      if (q.length >= 3) searchPlaces(q);
      refresh();
    }, 350);
    refresh();
  }

  async function searchPlaces(q) {
    $('placeStatus').innerHTML = '<span class="spin"></span> searching…';
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`);
      const rows = await res.json();
      const box = $('placeResults');
      box.innerHTML = '';
      if (!rows.length) { $('placeStatus').textContent = 'No match — try another spelling.'; return; }
      rows.forEach((r) => {
        const b = document.createElement('div');
        b.className = 'hint';
        const a = document.createElement('a');
        a.href = '#'; a.textContent = r.display_name.split(',').slice(0, 3).join(', ');
        a.onclick = (e) => {
          e.preventDefault();
          setPlace(parseFloat(r.lat), parseFloat(r.lon), a.textContent);
        };
        b.appendChild(a);
        box.appendChild(b);
      });
      $('placeStatus').textContent = 'Pick a result:';
    } catch (e) {
      $('placeStatus').textContent = 'Search unavailable — using coordinates as place name.';
    }
  }

  function setPlace(lat, lon, label) {
    state.lat = lat; state.lon = lon; state.place = label;
    $('place').value = label;
    $('placeStatus').textContent = `Charting above ${fmtC(lat, lon)}`;
    refresh();
  }

  function fmtC(lat, lon) {
    return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
  }

  function geolocate() {
    if (!navigator.geolocation) { $('placeStatus').textContent = 'Geolocation unsupported.'; return; }
    $('placeStatus').innerHTML = '<span class="spin"></span> locating…';
    navigator.geolocation.getCurrentPosition(
      (p) => setPlace(p.coords.latitude, p.coords.longitude, 'My current location'),
      () => { $('placeStatus').textContent = 'Location denied — search a place instead.'; }
    );
  }

  // ------------------------------------------------------------ preview -----
  let previewTimer = null;
  let lastPreview = null;
  function refresh() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(fetchPreview, 600);
  }

  async function fetchPreview() {
    if (state.lat === null) {
      // sensible default so the page isn't empty: Paris tonight-ish
      setPlaceInitial();
      return;
    }
    const q = new URLSearchParams({
      date: $('date').value, time: $('time').value || '22:00',
      lat: state.lat, lon: state.lon,
      headline: $('headline').value, dedication: $('dedication').value,
      place: state.place, color: state.color,
    });
    const frame = $('previewFrame');
    try {
      const res = await fetch(`/api/preview?${q}`);
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      lastPreview = await res.json();
      paintPreview(lastPreview);
    } catch (e) {
      frame.innerHTML = `<div class="err">${e.message}</div>`;
    }
  }

  function setPlaceInitial() {
    const d = new Date();
    setPlace(48.8566, 2.3522, 'Paris, France');
    $('date').value = '2001-03-14';
    $('time').value = '21:42';
    $('headline').value = 'THE NIGHT YOU WERE BORN';
    markPreset($('headline').value);
  }

  function paintPreview(p) {
    const frame = $('previewFrame');
    if (!p) return;
    if (state.tab === 'art') {
      frame.innerHTML = p.svg;
      const svg = frame.querySelector('svg');
      if (svg) { svg.removeAttribute('width'); svg.removeAttribute('height'); svg.style.width = '100%'; }
    } else {
      frame.innerHTML = p.mockupSvg;
      const svg = frame.querySelector('svg');
      if (svg) { svg.removeAttribute('width'); svg.removeAttribute('height'); svg.style.width = '100%'; }
    }
    const f = p.facts;
    const bits = [];
    if (f.daylight) bits.push(`<span class="daylight">☀ daylight moment — charted as the sky still saw it (sun ${f.sunAltitude.toFixed(0)}° up)</span>`);
    bits.push(`<b>${f.moon.name}</b> (${Math.round(f.moon.fraction * 100)}% lit${f.moon.aboveHorizon ? ', above horizon' : ', below horizon'})`);
    if (f.constellations.length) bits.push(`constellations up: <b>${f.constellations.slice(0, 5).join(', ')}${f.constellations.length > 5 ? '…' : ''}</b>`);
    if (f.brightestStar?.name) bits.push(`brightest star: <b>${f.brightestStar.name}</b>`);
    if (f.planetsUp.length) bits.push(`planets up: <b>${f.planetsUp.map((x) => x.name).join(', ')}</b>`);
    $('facts').innerHTML = bits.join(' · ');
  }

  // ------------------------------------------------------------ cart --------
  function addToCart() {
    if (state.lat === null) { $('designErr').textContent = 'Choose a place first.'; return; }
    $('designErr').textContent = '';
    const design = {
      date: $('date').value,
      time: $('time').value || '22:00',
      lat: state.lat, lon: state.lon,
      place: state.place,
      headline: $('headline').value.trim() || 'THE NIGHT YOU WERE BORN',
      dedication: $('dedication').value.trim() || '',
    };
    const size = $('size').value, color = state.color, qty = parseInt($('qty').value, 10);
    const key = (d) => `${d.date}|${d.time}|${d.lat}|${d.lon}|${d.headline}|${d.dedication}`;
    const existing = state.cart.find((l) => key(l.design) === key(design));
    if (existing) {
      existing.qty = Math.min(5, existing.qty + qty);
    } else {
      // one sky per order: a different moment starts a fresh order
      state.cart = [{ size, color, qty, design }];
    }
    localStorage.setItem('noc_cart', JSON.stringify(state.cart));
    renderCart();
  }

  function renderCart() {
    const wrap = $('cartWrap');
    if (!state.cart.length) { wrap.innerHTML = ''; $('checkoutBtn').style.display = 'none'; return; }
    const unit = state.config ? state.config.pricing.shirtUnit : 3400;
    wrap.innerHTML = state.cart.map((l, i) => {
      const cname = state.config?.colors.find((c) => c.id === l.color)?.name || l.color;
      return `<div class="cartline">
        <div><b>${l.design.headline}</b><br><span class="hint">${l.design.date} ${l.design.time} · ${l.design.place || fmtC(l.design.lat, l.design.lon)}</span></div>
        <div class="hint">${l.size.toUpperCase()}<br>${cname}</div>
        <div class="qty"><input type="number" min="1" max="5" value="${l.qty}" data-i="${i}"></div>
        <div>${money(unit * l.qty)} <a href="#" data-rm="${i}" style="color:var(--muted);font-size:11px;">remove</a></div>
      </div>`;
    }).join('');
    wrap.querySelectorAll('input[type=number]').forEach((inp) => inp.onchange = () => {
      const i = +inp.dataset.i;
      state.cart[i].qty = Math.max(1, Math.min(5, parseInt(inp.value, 10) || 1));
      localStorage.setItem('noc_cart', JSON.stringify(state.cart));
      renderCart();
    });
    wrap.querySelectorAll('[data-rm]').forEach((a) => a.onclick = (e) => {
      e.preventDefault();
      state.cart.splice(+a.dataset.rm, 1);
      localStorage.setItem('noc_cart', JSON.stringify(state.cart));
      renderCart();
    });
    const total = state.cart.reduce((n, l) => n + unit * l.qty, 0);
    $('checkoutBtn').style.display = 'inline-block';
    $('checkoutBtn').textContent = `Continue to checkout — ${money(total)} + shipping`;
  }

  boot();
})();
