const state = {
  color: "black",
  size: "m",
  place: "Paris",
  lat: 48.8566,
  lon: 2.3522,
  timezone: "Europe/Paris",
  countryCode: "FR",
  catalog: null,
  quote: null,
};

const $ = (id) => document.getElementById(id);
const examples = [
  { title: "The night we met", city: "Paris", date: "2019-06-21", time: "22:30", dedication: "For the hour the city went quiet.", lat: 48.8566, lon: 2.3522, timezone: "Europe/Paris", admin: "Île-de-France", country: "France" },
  { title: "First light, Lisbon", city: "Lisbon", date: "2022-06-01", time: "23:40", dedication: "The river kept the lights.", lat: 38.7223, lon: -9.1393, timezone: "Europe/Lisbon", admin: "Lisbon", country: "Portugal" },
  { title: "Kyoto, after rain", city: "Kyoto", date: "2016-04-03", time: "21:00", dedication: "For the street that smelled of rain.", lat: 35.0116, lon: 135.7681, timezone: "Asia/Tokyo", admin: "Kyoto", country: "Japan" },
  { title: "A birth in Reykjavík", city: "Reykjavík", date: "2014-12-21", time: "23:11", dedication: "You arrived under a low sky.", lat: 64.1466, lon: -21.9426, timezone: "Atlantic/Reykjavik", admin: "", country: "Iceland" },
];

function money(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function showError(message) {
  const el = $("error");
  if (!message) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = message;
}

async function loadCatalog() {
  const res = await fetch("/api/catalog");
  state.catalog = await res.json();
  const colors = $("colors");
  for (const color of state.catalog.colors) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.setAttribute("aria-pressed", String(color.id === state.color));
    btn.innerHTML = `<i style="background:${color.hex}"></i>${color.name}`;
    btn.addEventListener("click", () => {
      state.color = color.id;
      for (const node of colors.querySelectorAll(".swatch")) node.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-pressed", "true");
      paintShirt();
      schedulePreview();
      scheduleQuote();
    });
    colors.appendChild(btn);
  }
  const sizes = $("sizes");
  for (const size of state.catalog.sizes) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "size";
    btn.textContent = size.name;
    btn.title = size.note;
    btn.setAttribute("aria-pressed", String(size.id === state.size));
    btn.addEventListener("click", () => {
      state.size = size.id;
      for (const node of sizes.querySelectorAll(".size")) node.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-pressed", "true");
      scheduleQuote();
    });
    sizes.appendChild(btn);
  }
  const country = $("country");
  for (const [code, name] of state.catalog.countries) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = name;
    country.appendChild(opt);
  }
  country.value = "US";
  const regionSelect = $("region-select");
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "State";
  regionSelect.appendChild(blank);
  for (const code of state.catalog.states) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code;
    regionSelect.appendChild(opt);
  }
  syncCountryFields();
}

function paintShirt() {
  const color = state.catalog.colors.find((item) => item.id === state.color);
  $("shirt-body").setAttribute("fill", color.hex);
  $("stage-color").textContent = color.name;
  const neck = $("shirt-neck");
  neck.setAttribute("stroke", color.ink === "light" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)");
}

function payload() {
  return {
    title: $("title").value,
    place: state.place,
    dedication: $("dedication").value,
    date: $("date").value,
    time: $("time").value,
    timezone: state.timezone,
    lat: state.lat,
    lon: state.lon,
    color: state.color,
    size: state.size,
    copies: Number($("copies").value || 1),
    shipName: $("shipName").value,
    email: $("email").value,
    phone: $("phone").value,
    line1: $("line1").value,
    line2: $("line2").value,
    city: $("ship-city").value,
    region: regionValue(),
    postal: $("postal").value,
    country: $("country").value,
  };
}

function regionValue() {
  return $("country").value === "US" ? $("region-select").value : $("region").value;
}

function syncCountryFields() {
  const us = $("country").value === "US";
  $("region-label").textContent = us ? "State" : "State / county";
  $("postal-label").textContent = us ? "ZIP" : "Postal code";
  $("region").hidden = us;
  $("region-select").hidden = !us;
  if (us) $("region-select").required = true;
}

let previewTimer;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(refreshPreview, 280);
}

async function refreshPreview() {
  const img = $("print");
  img.classList.add("loading");
  try {
    const res = await fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload(), width: 1000 }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showError(data.error || "The plate could not be drawn.");
      return;
    }
    const blob = await res.blob();
    if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
    const url = URL.createObjectURL(blob);
    img.src = url;
    img.dataset.url = url;
    img.classList.remove("loading");
    showError("");
  } catch {
    showError("The preview could not be reached.");
  }
}

let quoteTimer;
function scheduleQuote() {
  $("pay").disabled = true;
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(refreshQuote, 320);
}

async function refreshQuote() {
  const body = payload();
  if (!body.country) return;
  try {
    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      state.quote = null;
      $("price-shirt").textContent = "—";
      $("price-ship").textContent = "—";
      $("price-total").textContent = "—";
      $("pay").disabled = true;
      showError(data.error || "Shipping could not be quoted.");
      return;
    }
    state.quote = data;
    $("price-shirt").textContent = money(data.shirtCents);
    $("price-ship").textContent = money(data.shippingCents);
    $("price-total").textContent = money(data.totalCents);
    $("pay").disabled = false;
    showError("");
  } catch {
    $("pay").disabled = true;
    showError("Shipping quote failed.");
  }
}

function setPlace(place) {
  state.place = place.name || place.city;
  state.lat = place.lat;
  state.lon = place.lon;
  state.timezone = place.timezone;
  const bits = [place.name || place.city, place.admin, place.country].filter(Boolean);
  const ns = place.lat >= 0 ? "N" : "S";
  const ew = place.lon >= 0 ? "E" : "W";
  $("place-label").textContent = `${bits.join(", ")} · ${Math.abs(place.lat).toFixed(2)}° ${ns}, ${Math.abs(place.lon).toFixed(2)}° ${ew}`;
  $("city-search").value = place.name || place.city;
  schedulePreview();
}

let searchTimer;
$("city-search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  const q = $("city-search").value.trim();
  searchTimer = setTimeout(() => searchCities(q), 220);
});

async function searchCities(q) {
  const box = $("results");
  if (q.length < 2) {
    box.hidden = true;
    return;
  }
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  box.innerHTML = "";
  if (!data.results?.length) {
    box.hidden = true;
    return;
  }
  for (const place of data.results) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = `${place.name} <small>${[place.admin, place.country].filter(Boolean).join(", ")}</small>`;
    btn.addEventListener("click", () => {
      setPlace(place);
      box.hidden = true;
    });
    box.appendChild(btn);
  }
  box.hidden = false;
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".city-box")) $("results").hidden = true;
});

for (const example of examples) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chip";
  btn.textContent = example.title;
  btn.addEventListener("click", () => {
    $("title").value = example.title;
    $("date").value = example.date;
    $("time").value = example.time;
    $("dedication").value = example.dedication;
    setPlace(example);
  });
  $("examples").appendChild(btn);
}

for (const id of ["title", "date", "time", "dedication"]) {
  $(id).addEventListener("input", schedulePreview);
}
$("copies").addEventListener("input", scheduleQuote);
$("country").addEventListener("change", () => {
  syncCountryFields();
  scheduleQuote();
});

$("order").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("pay");
  button.disabled = true;
  button.textContent = "Opening checkout…";
  showError("");
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      showError(data.error || "Checkout could not be started.");
      button.disabled = false;
      button.textContent = "Pay and send to print";
      return;
    }
    window.location = data.url;
  } catch {
    showError("Checkout could not be reached.");
    button.disabled = false;
    button.textContent = "Pay and send to print";
  }
});

if (new URLSearchParams(location.search).get("canceled")) {
  showError("Payment was canceled. The plate was not sent to print.");
}

loadCatalog().then(() => {
  paintShirt();
  schedulePreview();
  scheduleQuote();
});
