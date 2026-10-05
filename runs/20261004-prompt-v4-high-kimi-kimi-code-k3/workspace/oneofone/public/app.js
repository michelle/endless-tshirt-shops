/* ONEOFONE storefront */
(function () {
  const state = {
    word: 'AURORA',
    shirt: 'black',
    palette: null,
    size: 'm',
    config: null,
  };

  const $ = (s) => document.querySelector(s);
  const designImg = $('#designImg');
  const loading = $('#previewLoading');
  const mockup = $('#mockup');

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 5000);
  }

  async function init() {
    state.config = await (await fetch('/api/config')).json();

    const cancelled = new URLSearchParams(location.search).get('cancelled');
    if (cancelled) toast('Checkout was cancelled — your design is still here when you are ready.');

    buildSizeSeg();
    buildPaletteSwatches();
    bindWordInput();
    bindShirtSeg();
    updatePreview();
    updatePayNote();

    $('#designBtn').addEventListener('click', () => {
      $('#checkout').hidden = false;
      $('#ckEdition').textContent = editionHint();
      $('#checkout').scrollIntoView({ behavior: 'smooth' });
    });
    $('#orderForm').addEventListener('submit', submitOrder);
  }

  function buildSizeSeg() {
    const seg = $('#sizeSeg');
    seg.innerHTML = '';
    state.config.sizes.forEach((s) => {
      const b = document.createElement('button');
      b.textContent = s.toUpperCase();
      b.dataset.size = s;
      if (s === state.size) b.classList.add('on');
      b.addEventListener('click', () => {
        state.size = s;
        seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      });
      seg.appendChild(b);
    });
  }

  function palettes() {
    return state.config.palettes[state.shirt];
  }

  function buildPaletteSwatches() {
    const list = palettes();
    if (!list.find((p) => p.id === state.palette)) state.palette = list[0].id;
    const wrap = $('#paletteSwatches');
    wrap.innerHTML = '';
    list.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'swatch' + (p.id === state.palette ? ' on' : '');
      b.title = p.name;
      b.setAttribute('aria-label', p.name);
      p.inks.forEach((c) => {
        const i = document.createElement('i');
        i.style.background = c;
        b.appendChild(i);
      });
      b.addEventListener('click', () => {
        state.palette = p.id;
        wrap.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('on', x === b));
        updatePreview();
      });
      wrap.appendChild(b);
    });
  }

  let debounce = null;
  function bindWordInput() {
    const inp = $('#wordInput');
    inp.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.word = inp.value;
        updatePreview();
      }, 350);
    });
  }

  function bindShirtSeg() {
    $('#shirtSeg').querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        state.shirt = b.dataset.shirt;
        $('#shirtSeg').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        mockup.classList.toggle('white', state.shirt === 'white');
        buildPaletteSwatches();
        updatePreview();
      });
    });
    mockup.classList.toggle('white', state.shirt === 'white');
  }

  function editionHint() {
    return $('#editionLine').textContent.replace(/^.*Nº\s*/, '') || '—';
  }

  function updatePreview() {
    const word = state.word.trim();
    if (!word) return;
    loading.classList.add('on');
    const url = `/api/design.svg?word=${encodeURIComponent(word)}&palette=${encodeURIComponent(state.palette)}`;
    const img = new Image();
    img.onload = () => {
      designImg.src = url;
      loading.classList.remove('on');
    };
    img.onerror = () => loading.classList.remove('on');
    img.src = url;
    // edition hint mirrors server caption
    fetch(`/api/design.svg?word=${encodeURIComponent(word)}&palette=${encodeURIComponent(state.palette)}`)
      .then((r) => r.text())
      .then((svg) => {
        const m = svg.match(/EDITION 1 OF 1 — Nº ([0-9A-F-]+)/);
        if (m) $('#editionLine').textContent = `“${word.toUpperCase()}” — edition 1 of 1 · Nº ${m[1]}`;
      })
      .catch(() => {});
  }

  function updatePayNote() {
    const d = state.config.paymentDriver;
    const note = $('#sandboxNote');
    if (d === 'paygate') {
      $('#payAmount').textContent = `$${state.config.priceUsd}.00`;
      note.innerHTML =
        'Sandbox checkout by PayGate (test gateway — no real money moves). ' +
        'Use test Visa <code>4000 0000 0000 0002</code>, any future expiry, any CVV. ' +
        'Only successful payments are sent to print.';
    } else if (d === 'payu') {
      $('#payAmount').textContent = `₹${state.config.priceInr.toLocaleString('en-IN')}`;
      note.innerHTML =
        'Sandbox checkout by PayU (test gateway — no real money moves). ' +
        'Use test card <code>5123 4567 8901 2346</code>, any future expiry, CVV <code>123</code>. ' +
        'Your $34.00 is billed as ₹' + state.config.priceInr.toLocaleString('en-IN') + ' in the sandbox.';
    } else if (d === 'stripe') {
      $('#payAmount').textContent = `$${state.config.priceUsd}.00`;
      note.textContent = 'Secure checkout by Stripe.';
    } else if (d === 'btcpay') {
      $('#payAmount').textContent = `$${state.config.priceUsd}.00`;
      note.textContent = 'Pay by Bitcoin (testnet sandbox).';
    }
  }

  async function submitOrder(e) {
    e.preventDefault();
    const btn = $('#payBtn');
    btn.disabled = true;
    btn.textContent = 'Contacting payment gateway…';
    try {
      const fd = new FormData(e.target);
      const recipient = Object.fromEntries(fd.entries());
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: state.word,
          palette: state.palette,
          shirtColor: state.shirt,
          size: state.size,
          recipient,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'order failed');

      if (json.driver === 'payu' || json.driver === 'paygate') {
        // auto-submit the hosted-gateway form
        const form = $('#payuForm');
        form.action = json.action;
        form.innerHTML = '';
        Object.entries(json.params).forEach(([k, v]) => {
          const i = document.createElement('input');
          i.type = 'hidden';
          i.name = k;
          i.value = v;
          form.appendChild(i);
        });
        form.submit();
        return;
      }
      window.location = json.url;
    } catch (err) {
      toast('Could not start checkout: ' + err.message);
      btn.disabled = false;
      updatePayNote();
      btn.innerHTML = 'Pay <span id="payAmount"></span> →';
      updatePayNote();
    }
  }

  init().catch((e) => toast('Failed to load store: ' + e.message));
})();
