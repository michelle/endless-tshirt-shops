// AstroThread Studio Client

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('customizeForm');
  const mockupImg = document.getElementById('mockupImg');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const artworkLink = document.getElementById('artworkLink');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const citySelect = document.getElementById('citySelect');
  const customCoordsRow = document.getElementById('customCoordsRow');

  let updateTimer = null;
  let currentToken = '';

  function getCurrentDesign() {
    const formData = new FormData(form);
    const inscription = formData.get('inscription') || 'UNDER THIS SKY';
    const date = formData.get('date') || '2024-10-14';
    const time = formData.get('time') || '21:45';
    const theme = formData.get('theme') || 'gold';
    const garment = formData.get('garment') || 'black';
    const size = formData.get('size') || 'l';

    let lat = 37.7749;
    let lon = -122.4194;
    let locationName = 'SAN FRANCISCO, CA';

    if (citySelect.value === 'custom') {
      lat = parseFloat(document.getElementById('customLat').value) || 0;
      lon = parseFloat(document.getElementById('customLon').value) || 0;
      locationName = document.getElementById('customLocationName').value || 'CUSTOM COORDINATES';
    } else {
      const selectedOption = citySelect.options[citySelect.selectedIndex];
      lat = parseFloat(selectedOption.getAttribute('data-lat')) || 37.7749;
      lon = parseFloat(selectedOption.getAttribute('data-lon')) || -122.4194;
      locationName = selectedOption.value;
    }

    return {
      inscription: inscription.toUpperCase(),
      date,
      time,
      lat,
      lon,
      locationName,
      theme,
      garment,
      size,
    };
  }

  function encodeDesignToToken(design) {
    const json = JSON.stringify(design);
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  function updatePreview() {
    const design = getCurrentDesign();
    currentToken = encodeDesignToToken(design);

    loadingOverlay.classList.add('active');

    const params = new URLSearchParams({
      token: currentToken,
      w: '800',
      h: '960',
      t: Date.now(),
    });

    const newSrc = `/api/mockup?${params.toString()}`;
    const preloader = new Image();
    preloader.onload = () => {
      mockupImg.src = newSrc;
      loadingOverlay.classList.remove('active');
    };
    preloader.onerror = () => {
      loadingOverlay.classList.remove('active');
    };
    preloader.src = newSrc;

    artworkLink.href = `/api/preview?token=${encodeURIComponent(currentToken)}&w=1200`;
  }

  function scheduleUpdate() {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(updatePreview, 350);
  }

  // Handle City change
  citySelect.addEventListener('change', () => {
    if (citySelect.value === 'custom') {
      customCoordsRow.style.display = 'grid';
    } else {
      customCoordsRow.style.display = 'none';
    }
    scheduleUpdate();
  });

  // Inputs change
  form.querySelectorAll('input, select').forEach((input) => {
    input.addEventListener('input', scheduleUpdate);
    input.addEventListener('change', scheduleUpdate);
  });

  // Radio pill active class styling
  document.querySelectorAll('.theme-pill, .garment-pill, .size-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const group = pill.parentElement;
      group.querySelectorAll('label').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const radio = pill.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        scheduleUpdate();
      }
    });
  });

  // Inscription quick tags
  document.querySelectorAll('.tag-btn').forEach((tag) => {
    tag.addEventListener('click', () => {
      const input = document.getElementById('inscriptionInput');
      input.value = tag.getAttribute('data-text');
      scheduleUpdate();
    });
  });

  // Historic Moments preset clicks
  document.querySelectorAll('.moment-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.getElementById('inscriptionInput').value = card.getAttribute('data-inscription');
      document.getElementById('dateInput').value = card.getAttribute('data-date');
      document.getElementById('timeInput').value = card.getAttribute('data-time');

      const cityName = card.getAttribute('data-city');
      const lat = card.getAttribute('data-lat');
      const lon = card.getAttribute('data-lon');
      const theme = card.getAttribute('data-theme');
      const garment = card.getAttribute('data-garment');

      // Select city or custom
      let matched = false;
      for (const opt of citySelect.options) {
        if (opt.value.includes(cityName) || opt.text.includes(cityName)) {
          citySelect.value = opt.value;
          customCoordsRow.style.display = 'none';
          matched = true;
          break;
        }
      }
      if (!matched) {
        citySelect.value = 'custom';
        customCoordsRow.style.display = 'grid';
        document.getElementById('customLocationName').value = cityName;
        document.getElementById('customLat').value = lat;
        document.getElementById('customLon').value = lon;
      }

      // Set theme radio
      const themeRadio = form.querySelector(`input[name="theme"][value="${theme}"]`);
      if (themeRadio) {
        themeRadio.checked = true;
        document.querySelectorAll('.theme-pill').forEach((p) => p.classList.remove('active'));
        themeRadio.parentElement.classList.add('active');
      }

      // Set garment radio
      const garmentRadio = form.querySelector(`input[name="garment"][value="${garment}"]`);
      if (garmentRadio) {
        garmentRadio.checked = true;
        document.querySelectorAll('.garment-pill').forEach((p) => p.classList.remove('active'));
        garmentRadio.parentElement.classList.add('active');
      }

      updatePreview();

      // Scroll to studio
      document.getElementById('studio').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Checkout submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const originalBtnHtml = checkoutBtn.innerHTML;
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = '<span>Creating Secure Checkout…</span><div class="spinner" style="width:18px;height:18px;border-width:2px;"></div>';

    try {
      const design = getCurrentDesign();
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to initiate checkout');
      }

      // Redirect customer to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      alert(`Checkout Error: ${err.message}`);
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = originalBtnHtml;
    }
  });

  // Initial render
  updatePreview();
});
