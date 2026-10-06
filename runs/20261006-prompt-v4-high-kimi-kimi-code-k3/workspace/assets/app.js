(function () {
  var COLORS = {
    black: { label: "Black", ink: "#f2ead8", shirtHex: "#14161a", light: false },
    "navy blue": { label: "Navy", ink: "#f2ead8", shirtHex: "#1c2440", light: false },
    charcoal: { label: "Charcoal", ink: "#f2ead8", shirtHex: "#33373c", light: false },
    white: { label: "White", ink: "#1b2a4a", shirtHex: "#f4f4f2", light: true },
    sand: { label: "Sand", ink: "#1b2a4a", shirtHex: "#d8cdb4", light: true },
  };
  var SIZES = ["s", "m", "l", "xl", "2xl"];

  var state = { color: "black", size: "m", lat: null, lon: null, skydata: null };

  var $ = function (id) { return document.getElementById(id); };

  // ---- color & size pickers ----
  var colorsEl = $("colors");
  Object.keys(COLORS).forEach(function (key) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "swatch" + (key === state.color ? " selected" : "");
    b.style.background = COLORS[key].shirtHex;
    b.title = COLORS[key].label;
    b.addEventListener("click", function () {
      state.color = key;
      colorsEl.querySelectorAll(".swatch").forEach(function (el) { el.classList.remove("selected"); });
      b.classList.add("selected");
      renderPreview();
    });
    colorsEl.appendChild(b);
  });

  var sizesEl = $("sizes");
  SIZES.forEach(function (s) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "size" + (s === state.size ? " selected" : "");
    b.textContent = s.toUpperCase();
    b.addEventListener("click", function () {
      state.size = s;
      sizesEl.querySelectorAll(".size").forEach(function (el) { el.classList.remove("selected"); });
      b.classList.add("selected");
    });
    sizesEl.appendChild(b);
  });

  // ---- live preview ----
  function currentDesign() {
    var date = $("date").value, time = $("time").value || "21:00";
    if (!date) return null;
    var lat = parseFloat($("lat").value), lon = parseFloat($("lon").value);
    if (!isFinite(lat) || !isFinite(lon)) { lat = 40.7128; lon = -74.006; } // preview fallback: NYC
    var offsetHours = Math.max(-12, Math.min(14, Math.round(lon / 15)));
    var instant = new Date(Date.parse(date + "T" + time + ":00Z") - offsetHours * 3600e3);
    if (isNaN(instant.getTime())) return null;
    return {
      date: instant,
      lat: lat,
      lon: lon,
      title: $("title").value,
      subtitle: $("subtitle").value,
      place: $("place").value.split(",")[0],
      ink: COLORS[state.color].ink,
      data: state.skydata,
    };
  }

  function renderPreview() {
    if (!state.skydata) return;
    var d = currentDesign();
    if (!d) return;
    $("shirtBody").setAttribute("fill", COLORS[state.color].shirtHex);
    var overlay = $("artOverlay");
    overlay.classList.toggle("light-shirt", COLORS[state.color].light);
    overlay.innerHTML = window.StarMap.generate(d);
  }

  ["title", "subtitle", "date", "time"].forEach(function (id) {
    $(id).addEventListener("input", renderPreview);
  });

  fetch("/assets/skydata.json").then(function (r) { return r.json(); }).then(function (data) {
    state.skydata = data;
    renderPreview();
  });

  // ---- place autocomplete ----
  var placeTimer = null;
  var resultsBox = $("placeResults");
  $("place").addEventListener("input", function () {
    $("lat").value = ""; $("lon").value = "";
    clearTimeout(placeTimer);
    var q = this.value.trim();
    if (q.length < 2) { resultsBox.classList.remove("open"); renderPreview(); return; }
    placeTimer = setTimeout(function () {
      fetch("/api/geocode?q=" + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          resultsBox.innerHTML = "";
          (data.results || []).forEach(function (p) {
            var div = document.createElement("div");
            div.textContent = p.name;
            div.addEventListener("click", function () {
              $("place").value = p.name;
              $("lat").value = p.lat;
              $("lon").value = p.lon;
              resultsBox.classList.remove("open");
              renderPreview();
            });
            resultsBox.appendChild(div);
          });
          resultsBox.classList.toggle("open", resultsBox.children.length > 0);
        })
        .catch(function () {});
    }, 300);
  });
  document.addEventListener("click", function (e) {
    if (e.target !== resultsBox && !resultsBox.contains(e.target)) resultsBox.classList.remove("open");
  });

  // ---- checkout ----
  $("customizer").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("formError");
    err.textContent = "";
    var lat = parseFloat($("lat").value), lon = parseFloat($("lon").value);
    if (!isFinite(lat) || !isFinite(lon)) {
      err.textContent = "Please pick a place from the suggestions so we know exactly where your sky was.";
      return;
    }
    var btn = $("buyBtn");
    btn.disabled = true;
    btn.textContent = "Preparing checkout…";
    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: $("title").value,
        subtitle: $("subtitle").value,
        date: $("date").value,
        time: $("time").value,
        place: $("place").value.split(",")[0],
        lat: lat,
        lon: lon,
        color: state.color,
        size: state.size,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.url) { window.location = data.url; return; }
        throw new Error(data.error || "Something went wrong");
      })
      .catch(function (ex) {
        err.textContent = ex.message;
        btn.disabled = false;
        btn.textContent = "Buy this shirt";
      });
  });

  if (new URLSearchParams(location.search).get("canceled")) {
    $("formError").textContent = "Checkout canceled — your design is still here whenever you're ready.";
  }
})();
