// Starloom studio: live preview of the exact print, city geocoding, checkout.
import { renderDesign, PRINT } from "/src/render.js";
import { wallTimeToUtc } from "/src/astro.js";

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- state ----
const state = {
  color: "black",
  size: "l",
  place: "Paris, France",
  lat: 48.8566,
  lon: 2.3522,
  tz: "Europe/Paris",
  title: "The Night We Met",
  message: "forever begins here",
  showLines: true,
};

let CONFIG = null;
let STARDATA = null;

// ------------------------------------------------------------ background ---
(function bgStars() {
  const c = $("bgstars");
  const ctx = c.getContext("2d");
  function draw() {
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(233,228,212,0.55)";
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 170; i++) {
      const x = rand() * c.width;
      const y = rand() * c.height;
      const r = rand() * rand() * 1.6 * dpr + 0.3;
      ctx.globalAlpha = 0.25 + rand() * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  draw();
  addEventListener("resize", draw);
})();

// ------------------------------------------------------------- mockup ------
const SHIRT_COLORS = {
  black: ["#26262a", "#191a1d", "#101114"],
  "navy blue": ["#27334f", "#1d2740", "#141b2d"],
  white: ["#faf8f2", "#efece4", "#e2ded4"],
};

// Draws the shirt + the actual design, positioned like the real print area.
function drawMockup() {
  const canvas = $("mockup");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const [light, mid, dark] = SHIRT_COLORS[state.color] || SHIRT_COLORS.black;

  // tee silhouette
  const body = new Path2D();
  body.moveTo(320, 132); // left shoulder top (collar side)
  body.bezierCurveTo(255, 140, 190, 168, 120, 208); // to left sleeve top
  body.lineTo(42, 342); // sleeve outer
  body.bezierCurveTo(30, 366, 40, 392, 64, 396); // sleeve cuff
  body.lineTo(196, 366);
  body.bezierCurveTo(186, 470, 182, 700, 196, 940); // left side
  body.quadraticCurveTo(400, 968, 604, 940); // hem
  body.bezierCurveTo(618, 700, 614, 470, 604, 366); // right side
  body.lineTo(736, 396);
  body.bezierCurveTo(760, 392, 770, 366, 758, 342); // right sleeve cuff
  body.lineTo(680, 208);
  body.bezierCurveTo(610, 168, 545, 140, 480, 132); // right shoulder
  body.quadraticCurveTo(400, 210, 320, 132); // collar dip
  body.closePath();

  ctx.save();
  ctx.fillStyle = mid;
  ctx.fill(body);
  // fabric shading
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, light);
  g.addColorStop(0.5, mid);
  g.addColorStop(1, dark);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = g;
  ctx.fill(body);
  ctx.globalAlpha = 1;
  ctx.clip(body);

  // collar
  ctx.beginPath();
  ctx.ellipse(400, 148, 92, 40, 0, Math.PI, 2 * Math.PI);
  ctx.fillStyle = state.color === "white" ? "#ddd8cc" : "#0c0d10";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(400, 148, 92, 40, 0, Math.PI, 2 * Math.PI);
  ctx.lineWidth = 10;
  ctx.strokeStyle = light;
  ctx.stroke();
  // seams
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 3;
  ctx.strokeStyle = dark;
  ctx.beginPath(); ctx.ellipse(400, 150, 104, 46, 0, Math.PI, 2 * Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(196, 370); ctx.lineTo(196, 935); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(604, 370); ctx.lineTo(604, 935); ctx.stroke();
  ctx.globalAlpha = 1;

  // ---- the design: same renderDesign() as the print file ----
  const DW = 470; // design width on the mockup (print area ≈ 15.6" on a ~20.5" chest)
  const DH = (DW * PRINT.h) / PRINT.w;
  const off = document.createElement("canvas");
  off.width = Math.round(DW * 2);
  off.height = Math.round(DH * 2);
  renderDesign(off.getContext("2d"), {
    width: off.width, height: off.height,
    color: state.color, title: state.title, message: state.message,
    place: state.place, dateStr: $("date").value, timeStr: $("time").value,
    tz: state.tz, lat: state.lat, lon: state.lon, showLines: state.showLines,
    stardata: STARDATA,
  });
  ctx.drawImage(off, 400 - DW / 2, 205, DW, DH);

  ctx.restore();

  const when = $("date").value && $("time").value
    ? `${$("date").value} ${$("time").value} (${state.tz})`
    : "";
  $("previewHint").textContent = state.place
    ? `the sky above ${state.place} · ${when} · what you see is what gets printed`
    : "choose a place to chart its sky";
}

const debounced = (fn, ms = 180) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};
const redraw = debounced(() => {
  try {
    drawMockup();
  } catch (err) {
    $("previewHint").textContent = "couldn't chart that moment — check date/time/place";
    console.error(err);
  }
}, 150);

// ------------------------------------------------------------- config ------
async function boot() {
  const [configRes, starsRes, linesRes, countriesRes] = await Promise.all([
    fetch("/api/config").then((r) => r.json()),
    fetch("/data/stars.json").then((r) => r.json()),
    fetch("/data/lines.json").then((r) => r.json()),
    fetch("/api/countries").then((r) => r.json()),
  ]);
  CONFIG = configRes;
  STARDATA = { stars: starsRes, lines: linesRes };

  // defaults: tonight, here-ish
  const now = new Date();
  $("date").value = now.toISOString().slice(0, 10);
  $("time").value = now.toISOString().slice(11, 16);

  // swatches
  const sw = $("colorSwatches");
  for (const c of CONFIG.product.colors) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch" + (c.id === state.color ? " active" : "");
    b.style.background = c.swatch;
    b.title = c.label;
    b.innerHTML = `<span>${c.label}</span>`;
    b.onclick = () => {
      state.color = c.id;
      sw.querySelectorAll(".swatch").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      redraw();
    };
    sw.appendChild(b);
  }

  // sizes
  const sizes = $("sizeSelect");
  for (const s of CONFIG.product.sizes) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s.toUpperCase();
    if (s === state.size) opt.selected = true;
    sizes.appendChild(opt);
  }
  sizes.onchange = () => (state.size = sizes.value);

  // countries
  const cs = $("countrySelect");
  for (const c of countriesRes) {
    const opt = document.createElement("option");
    opt.value = c.code;
    opt.textContent = c.name;
    cs.appendChild(opt);
  }
  cs.value = "US";

  // timezone datalist
  $("tzList").innerHTML = [
    "UTC", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York",
    "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
    "Africa/Cairo", "Africa/Lagos", "Asia/Dubai", "Asia/Kolkata", "Asia/Bangkok",
    "Asia/Shanghai", "Asia/Tokyo", "Asia/Seoul", "Australia/Sydney", "Pacific/Auckland",
  ].map((z) => `<option value="${z}">`).join("");

  // inputs
  $("date").oninput = $("time").oninput = redraw;
  $("titleInput").oninput = (e) => {
    state.title = e.target.value;
    $("titleCount").textContent = `${e.target.value.length}/30`;
    redraw();
  };
  $("titleCount").textContent = `${state.title.length}/30`;
  $("msgInput").oninput = (e) => {
    state.message = e.target.value;
    $("msgCount").textContent = `${e.target.value.length}/42`;
    redraw();
  };
  $("msgCount").textContent = `${state.message.length}/42`;
  $("linesToggle").onchange = (e) => {
    state.showLines = e.target.checked;
    redraw();
  };
  $("nowBtn").onclick = () => {
    const now2 = new Date();
    $("date").value = now2.toISOString().slice(0, 10);
    $("time").value = now2.toISOString().slice(11, 16);
    redraw();
  };

  // manual coordinates
  $("manualToggle").onclick = () => {
    const box = $("manualBox");
    box.hidden = !box.hidden;
    if (!box.hidden) {
      $("selectedPlace").hidden = true;
      $("cityInput").value = "";
    }
  };
  const manualApply = () => {
    const lat = parseFloat($("latInput").value);
    const lon = parseFloat($("lonInput").value);
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      state.lat = lat;
      state.lon = lon;
      state.place = $("placeInput").value || "Somewhere on Earth";
      state.tz = $("tzInput").value || "UTC";
      redraw();
    } else {
      $("previewHint").textContent = "latitude/longitude out of range";
    }
  };
  ["latInput", "lonInput", "placeInput", "tzInput"].forEach((id) => ($(id).oninput = debounced(manualApply, 400)));

  // test-mode badge on payment assurance
  if (CONFIG.payment?.testMode) {
    document.querySelectorAll(".assurance").forEach((el) => {
      el.insertAdjacentHTML(
        "afterbegin",
        `<span class="badge" style="margin-right:8px">sandbox checkout</span>`
      );
    });
  }

  drawMockup();
}

// ------------------------------------------------------------- geocoding ----
const CITY_TZ = {};
$("cityInput").oninput = debounced(async (e) => {
  const q = e.target.value.trim();
  const box = $("cityResults");
  if (q.length < 2) {
    box.hidden = true;
    return;
  }
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`
    );
    const data = await res.json();
    const results = data.results || [];
    if (!results.length) {
      box.innerHTML = `<div class="none">No matches — try a bigger town nearby, or enter coordinates manually.</div>`;
      box.hidden = false;
      return;
    }
    box.innerHTML = "";
    for (const r of results) {
      const b = document.createElement("button");
      b.type = "button";
      const region = [r.admin1, r.country].filter(Boolean).join(", ");
      b.innerHTML = `<div>${r.name}</div><div class="meta">${region} · ${r.latitude.toFixed(3)}°, ${r.longitude.toFixed(3)}°</div>`;
      b.onclick = () => {
        state.lat = r.latitude;
        state.lon = r.longitude;
        state.tz = r.timezone || "UTC";
        state.place = [r.name, r.country].filter(Boolean).join(", ");
        $("selectedPlace").innerHTML = `<b>${state.place}</b> — charted from ${r.latitude.toFixed(4)}°, ${r.longitude.toFixed(4)}° · timezone ${state.tz}`;
        $("selectedPlace").hidden = false;
        $("cityResults").hidden = true;
        $("cityInput").value = state.place;
        $("manualBox").hidden = true;
        redraw();
      };
      box.appendChild(b);
    }
    box.hidden = false;
  } catch {
    box.innerHTML = `<div class="none">Couldn't reach the geocoder — you can enter coordinates manually instead.</div>`;
    box.hidden = false;
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".searchwrap")) $("cityResults").hidden = true;
});

// ------------------------------------------------------------- checkout ----
$("checkoutBtn").onclick = () => {
  if (!state.place || !$("date").value || !$("time").value) {
    $("previewHint").textContent = "pick a moment and a place first";
    return;
  }
  const fmt = (v) => `$${v.toFixed(2)}`;
  $("checkoutSummary").innerHTML = `
    <div class="rows">
      <div><span>Star-map tee · ${state.color} · ${state.size.toUpperCase()}</span></div>
      <div><span>${state.place} — ${$("date").value} ${$("time").value}</span></div>
      <div><span>Tee</span><span>${fmt(CONFIG.retail.item)}</span></div>
      <div><span>Shipping</span><span>${fmt(CONFIG.retail.shipping)}</span></div>
      <div class="tot"><span>Total</span><span>${fmt(CONFIG.retail.item + CONFIG.retail.shipping)}</span></div>
    </div>`;
  $("checkoutModal").hidden = false;
};
$("closeCheckout").onclick = () => ($("checkoutModal").hidden = true);

$("checkoutForm").onsubmit = async (e) => {
  e.preventDefault();
  const err = $("checkoutErr");
  err.textContent = "";
  const btn = $("placeOrderBtn");
  btn.disabled = true;
  btn.textContent = "Reserving your sky…";
  const f = new FormData(e.target);
  const recipient = Object.fromEntries(f.entries());
  try {
    // sanity: design must render (server renders it again, authoritative)
    wallTimeToUtc($("date").value, $("time").value, state.tz);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        design: {
          ...state,
          dateStr: $("date").value,
          timeStr: $("time").value,
        },
        product: { color: state.color, size: state.size },
        recipient,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Checkout failed.");
    location.href = data.payment.url;
  } catch (e2) {
    err.textContent = e2.message;
    btn.disabled = false;
    btn.textContent = "Place order — $49.00";
  }
};

boot().catch((err) => {
  $("previewHint").textContent = "failed to load studio data — reload?";
  console.error(err);
});
