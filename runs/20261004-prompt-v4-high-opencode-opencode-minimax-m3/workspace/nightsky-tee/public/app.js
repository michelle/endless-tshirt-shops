// NightSky Tee – client-side editor.
//
// 1. Live preview of the star map from form state (debounced).
// 2. City autocomplete.
// 3. Checkout flow -> redirect to Stripe Checkout.
// 4. Pre-fills the form with a default memorable date so the page
//    is interesting on first load.

(() => {
  const $ = (id) => document.getElementById(id);
  const form    = $("form");
  const buyBtn  = $("buy");
  const preview = $("preview-img");
  const spinner = $("preview-spinner");
  const whereIn = $("where");
  const results = $("where-results");

  // ---------- preset defaults -----------------------------------------------
  const favMoments = [
    { title: "The Night We Met", sub: "First sight of you", lat: 41.9028, lon: 12.4964, city: "Rome, Italy" },
    { title: "Orion Over New York", sub: "Christmas Eve 2023", lat: 40.7128, lon: -74.0060, city: "New York, US" },
    { title: "Our Hometown Sky", sub: "Where it all began", lat: 51.5074, lon: -0.1278, city: "London, UK" },
    { title: "Sydney Sunrise", sub: "First morning here", lat: -33.8688, lon: 151.2093, city: "Sydney, AU" },
    { title: "Midsummer in Tokyo", sub: "The lanterns", lat: 35.6762, lon: 139.6503, city: "Tokyo, JP" },
    { title: "Above Reykjavík", sub: "The aurora was loud", lat: 64.1466, lon: -21.9426, city: "Reykjavík, IS" },
    { title: "Cape Town Milky Way", sub: "You beside me", lat: -33.9249, lon: 18.4241, city: "Cape Town, ZA" },
    { title: "Mountain Wedding Night", sub: "Married under Vega", lat: 46.5197, lon: 6.6323, city: "Lausanne, CH" },
  ];

  let currentLat = 41.9028, currentLon = 12.4964;

  function presetFormValues() {
    const i = Math.floor(Math.random() * favMoments.length);
    const f = favMoments[i];
    $("title").value = f.title;
    $("subtitle").value = f.sub;
    whereIn.value = f.city;
    currentLat = f.lat;
    currentLon = f.lon;
    const now = new Date();
    const date = new Date(now.getTime() - Math.random() * 1000 * 60 * 60 * 24 * 365 * 5);
    $("date").value = date.toISOString().slice(0, 10);
    $("time").value = `${String(date.getUTCHours()).padStart(2,"0")}:${String(date.getUTCMinutes()).padStart(2,"0")}`;
    $("name").value = "";
    $("email").value = "";
    $("line1").value = "";
    $("city").value = "";
    $("state").value = "";
    $("zip").value = "";
    $("country").value = "US";
  }
  presetFormValues();

  // ---------- city autocomplete --------------------------------------------
  let suggestTimer = null;
  whereIn.addEventListener("input", () => {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(runSuggest, 150);
  });
  function runSuggest() {
    const q = whereIn.value.trim();
    if (!q) {
      results.hidden = true;
      return;
    }
    fetch("/api/cities?q=" + encodeURIComponent(q))
      .then(r => r.json())
      .then(list => {
        if (!list.length) { results.hidden = true; return; }
        results.innerHTML = list.map(c =>
          `<div class="result" data-lat="${c.lat}" data-lon="${c.lon}">${c.name}</div>`
        ).join("");
        results.hidden = false;
        results.querySelectorAll(".result").forEach(el => {
          el.addEventListener("mousedown", (e) => {
            e.preventDefault();
            whereIn.value = el.textContent;
            currentLat = parseFloat(el.dataset.lat);
            currentLon = parseFloat(el.dataset.lon);
            results.hidden = true;
            triggerPreview();
          });
        });
      });
  }
  document.addEventListener("click", (e) => {
    if (!results.contains(e.target) && e.target !== whereIn) {
      results.hidden = true;
    }
  });

  // ---------- live preview --------------------------------------------------
  let previewTimer = null;
  let lastToken = 0;
  function triggerPreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(loadPreview, 220);
  }
  function loadPreview() {
    const token = ++lastToken;
    const formData = snapshot();
    if (!formData.date || !formData.lat || !formData.lon) return;
    spinner.hidden = false;
    preview.classList.add("loading");
    fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date:         formData.date,
        lat:          formData.lat,
        lon:          formData.lon,
        whereLabel:   whereIn.value || "Your Moment in the Sky",
        messageTitle: formData.title || "",
        messageSub:   formData.sub || "",
        shirtColor:   formData.color
      })
    })
    .then(r => r.json())
    .then(j => {
      if (token !== lastToken) return; // stale
      preview.src = j.url + `?v=${Date.now()}`;
      preview.onload = () => {
        spinner.hidden = true;
        preview.classList.remove("loading");
      };
    })
    .catch(() => { spinner.hidden = true; preview.classList.remove("loading"); });
  }
  function snapshot() {
    const d = $("date").value;
    const t = $("time").value || "22:00";
    const [hh, mm] = t.split(":");
    const isoDate = d ? `${d}T${hh.padStart(2,"0")}:${mm.padStart(2,"0")}:00Z` : null;
    return {
      title: $("title").value,
      sub:   $("subtitle").value,
      date:  isoDate,
      lat:   currentLat,
      lon:   currentLon,
      color: (form.querySelector('input[name="color"]:checked') || {}).value || "black"
    };
  }

  // Trigger preview on any field change.
  form.addEventListener("input", (e) => {
    if (e.target === whereIn) return;                // suggestions handler
    triggerPreview();
  });
  form.addEventListener("change", (e) => {
    if (e.target === whereIn) return;
    triggerPreview();
  });

  $("randomize").addEventListener("click", () => {
    presetFormValues();
    triggerPreview();
  });

  // initial render
  setTimeout(loadPreview, 400);

  // ---------- submit -> Stripe Checkout -----------------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (buyBtn.disabled) return;
    const s = snapshot();
    if (!s.date) return;
    buyBtn.disabled = true;
    buyBtn.textContent = "Preparing checkout…";

    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date:         s.date,
          lat:          s.lat,
          lon:          s.lon,
          whereLabel:   whereIn.value || "Your Moment in the Sky",
          messageTitle: $("title").value,
          messageSub:   $("subtitle").value,
          shirtColor:   s.color,
          shirtSize:    $("size").value,
          shipping: {
            name:    $("name").value,
            email:   $("email").value,
            line1:   $("line1").value,
            line2:   "",
            city:    $("city").value,
            state:   $("state").value,
            zip:     $("zip").value,
            country: $("country").value
          }
        })
      });
      const j = await r.json();
      if (!r.ok) {
        alert(j.error || "Checkout failed");
        buyBtn.disabled = false;
        buyBtn.textContent = "Buy & print — $44.99";
        return;
      }
      // Redirect browser to Stripe Checkout
      window.location.href = j.sessionUrl;
    } catch (e) {
      alert("Network error: " + e.message);
      buyBtn.disabled = false;
      buyBtn.textContent = "Buy & print — $44.99";
    }
  });
})();
