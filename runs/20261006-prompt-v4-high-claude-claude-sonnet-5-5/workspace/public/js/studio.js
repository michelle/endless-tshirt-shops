'use strict';
initChrome('home');
document.body.insertAdjacentHTML('beforeend', footerHtml);
document.body.insertAdjacentHTML('beforeend', `<dialog id="sizeDlg"><h3>Size guide</h3><p class="muted">Approximate flat chest width, Bella+Canvas 3001. Measure a tee you like and compare.</p>
<table><tr><th>Size</th><th>Chest (in)</th><th>Chest (cm)</th></tr>
<tr><td>XS</td><td>16.5</td><td>42</td></tr><tr><td>S</td><td>18</td><td>46</td></tr><tr><td>M</td><td>20</td><td>51</td></tr><tr><td>L</td><td>22</td><td>56</td></tr><tr><td>XL</td><td>24</td><td>61</td></tr><tr><td>2XL</td><td>26</td><td>66</td></tr><tr><td>3XL</td><td>28</td><td>71</td></tr></table>
<form method="dialog" style="margin-top:18px"><button class="btn small">Close</button></form></dialog>`);

(async function () {
  const cfg = await getConfig();
  const state = { name: '', date: '', place: '', message: '', variant: 0, palette: 'starlight', labels: false, color: cfg.colors[0], size: '', qty: 1 };

  // ----- controls -----
  const dots = $('#colorDots');
  dots.innerHTML = cfg.colors.map((c) => `<button type="button" class="dot" data-id="${esc(c.id)}" style="background:${c.hex}" aria-label="${esc(c.label)}" aria-pressed="${c === state.color}" title="${esc(c.label)}"></button>`).join('');
  $('#colorName').textContent = state.color.label;
  dots.onclick = (e) => {
    const b = e.target.closest('.dot'); if (!b) return;
    state.color = cfg.colors.find((c) => c.id === b.dataset.id);
    $$('.dot', dots).forEach((d) => d.setAttribute('aria-pressed', String(d === b)));
    $('#colorName').textContent = state.color.label;
    drawPalettes(); schedule(0);
  };

  const pal = $('#palettes');
  function drawPalettes() {
    pal.innerHTML = Object.entries(PALETTES).map(([k, v]) => `<button type="button" data-k="${k}" aria-pressed="${state.palette === k}"><i style="background:${v[state.color.tone]}"></i>${v.label}</button>`).join('');
  }
  pal.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; state.palette = b.dataset.k; drawPalettes(); schedule(0); };
  drawPalettes();

  const sizes = $('#sizes');
  sizes.innerHTML = cfg.sizes.map((s) => `<button type="button" class="chip" data-s="${s}" aria-pressed="false">${s}</button>`).join('');
  sizes.onclick = (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.size = b.dataset.s; $('#sizeErr').textContent = '';
    $$('.chip', sizes).forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
  };
  $('#sizeGuide').onclick = () => $('#sizeDlg').showModal();

  for (const k of ['name', 'date', 'place', 'message']) {
    $('#' + k).addEventListener('input', (e) => { state[k] = e.target.value; schedule(280); updateButton(); });
  }
  $('#labels').onchange = (e) => { state.labels = e.target.checked; schedule(0); };
  $('#reroll').onclick = () => { state.variant = (state.variant + 1) % 100; $('#skyNo').textContent = `Sky no. ${state.variant + 1}`; drawNext = true; schedule(0); };
  $('#qDec').onclick = () => { state.qty = Math.max(1, state.qty - 1); $('#qVal').textContent = state.qty; price(); };
  $('#qInc').onclick = () => { state.qty = Math.min(cfg.maxQty, state.qty + 1); $('#qVal').textContent = state.qty; price(); };
  const price = () => { $('#priceTxt').textContent = money(cfg.price * state.qty); };
  const updateButton = () => { $('#add').disabled = !state.name.trim(); };

  // ----- live preview -----
  let timer, ctl, seq = 0, drawNext = true;
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(draw, ms); }
  const designNow = () => ({ name: state.name.trim(), date: state.date, place: state.place.trim(), message: state.message.trim(), variant: state.variant, palette: state.palette, labels: state.labels });

  async function draw() {
    if (ctl) ctl.abort();
    ctl = new AbortController();
    const mine = ++seq;
    $('#preview').classList.add('loading');
    ['name', 'date', 'place', 'message'].forEach((k) => { $('#' + k + 'Err').textContent = ''; $('#' + k).removeAttribute('aria-invalid'); });
    const useDraw = drawNext; drawNext = false;
    try {
      const svg = await fetchDesign(designNow(), state.color.id, { anim: 1, draw: useDraw ? 1 : 0, idp: 'st' }, ctl.signal);
      if (mine !== seq) return;
      $('#shirtStage').innerHTML = shirtSvg(state.color, svg, { label: `Constellation shirt for ${state.name || 'you'}` });
    } catch (e) {
      if (e.name === 'AbortError') return;
      const msg = e.userMessage || 'Could not draw that design.';
      const field = ['name', 'date', 'place', 'message'].find((k) => msg.toLowerCase().includes(k === 'message' ? 'message' : k)) || 'name';
      $('#' + field + 'Err').textContent = msg; $('#' + field).setAttribute('aria-invalid', 'true');
    } finally {
      if (mine === seq) $('#preview').classList.remove('loading');
    }
  }

  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.name.trim()) { $('#nameErr').textContent = 'Please enter a name.'; return; }
    if (!state.size) { $('#sizeErr').textContent = 'Please choose a size.'; $('#sizes').scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    if ($('.err[role=alert]:not(:empty)', $('#form'))) return;
    Cart.add({ design: designNow(), color: state.color.id, size: state.size, qty: state.qty });
    toast(`Added the ${state.name.trim()} constellation to your cart`);
    openDrawer(true);
  });

  draw();
  price();

  // ----- hero + gallery samples -----
  const byId = (id) => cfg.colors.find((c) => c.id === id);
  async function sample(el, d, colorId, extra = {}) {
    try {
      const svg = await fetchDesign(d, colorId, extra);
      el.innerHTML = shirtSvg(byId(colorId), svg, { label: `Example shirt: constellation of ${d.name}` });
    } catch { /* decorative */ }
  }
  sample($('#heroShirt'), { name: 'Maya', date: '1991-03-14', place: 'Lisbon', message: 'Always look up', palette: 'starlight', labels: true, variant: 0 }, 'black', { anim: 1, draw: 1, idp: 'hero' });
  const samples = [
    [{ name: 'Isabella Rossi', date: '1994-09-02', place: 'Florence', palette: 'gilt', variant: 2 }, 'navy blue', 'Gilt on navy'],
    [{ name: 'Theodore', date: '1988-07-04', message: 'Born under fireworks', palette: 'aurora', labels: true }, 'natural', 'Aurora ink on natural'],
    [{ name: 'Noor', date: '2019-12-21', place: 'Amman', message: 'Our longest night', palette: 'rose', variant: 4 }, 'maroon', 'Rose on maroon'],
  ];
  $('#galleryGrid').innerHTML = samples.map(([d, c, cap], i) => `<figure><div id="g${i}"></div><figcaption>${esc(d.name)} · ${esc(cap)}</figcaption></figure>`).join('');
  samples.forEach(([d, c], i) => sample($('#g' + i), d, c, { idp: 'g' + i }));
})();
