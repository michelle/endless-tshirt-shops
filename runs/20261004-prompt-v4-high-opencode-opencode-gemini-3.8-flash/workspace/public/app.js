// public/app.js
// Client-side controller for Celestia Starmap Studio

document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements
  const inputTitle = document.getElementById("inputTitle");
  const inputSub = document.getElementById("inputSub");
  const citySelect = document.getElementById("citySelect");
  const inputWhere = document.getElementById("inputWhere");
  const inputDate = document.getElementById("inputDate");
  const inputTime = document.getElementById("inputTime");
  const svgContainer = document.getElementById("svgContainer");
  const shirtMockup = document.getElementById("shirtMockup");
  const inspectPrintBtn = document.getElementById("inspectPrintBtn");
  const stripeCheckoutBtn = document.getElementById("stripeCheckoutBtn");
  const instantTestBtn = document.getElementById("instantTestBtn");
  const checkoutStatus = document.getElementById("checkoutStatus");

  let currentLat = 40.7128;
  let currentLon = -74.0060;
  let currentColor = "black";
  let currentSize = "l";
  let debounceTimer = null;
  let currentOrderId = null;

  // 1. Fetch cities from server
  try {
    const res = await fetch("/api/cities");
    if (res.ok) {
      const cities = await res.json();
      citySelect.innerHTML = "";
      cities.forEach(c => {
        const opt = document.createElement("option");
        opt.value = JSON.stringify({ lat: c.lat, lon: c.lon, name: c.name });
        opt.textContent = c.name;
        if (c.name.includes("New York")) opt.selected = true;
        citySelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Failed to load cities:", err);
  }

  // 2. City change handler
  citySelect.addEventListener("change", (e) => {
    try {
      const selected = JSON.parse(e.target.value);
      currentLat = selected.lat;
      currentLon = selected.lon;
      inputWhere.value = selected.name;
      triggerPreview();
    } catch (err) {}
  });

  // 3. Color picker
  document.querySelectorAll(".color-option").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".color-option").forEach(c => c.classList.remove("active"));
      el.classList.add("active");
      currentColor = el.getAttribute("data-color");
      shirtMockup.setAttribute("data-color", currentColor);
      triggerPreview();
    });
  });

  // 4. Size picker
  document.querySelectorAll(".size-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentSize = btn.getAttribute("data-size");
    });
  });

  // 5. Input change listeners
  [inputTitle, inputSub, inputWhere, inputDate, inputTime].forEach(input => {
    input.addEventListener("input", triggerPreview);
  });

  function triggerPreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchPreview, 250);
  }

  // 6. Fetch vector preview from server
  async function fetchPreview() {
    const title = inputTitle.value.trim() || "THE NIGHT WE MET";
    const sub = inputSub.value.trim();
    const where = inputWhere.value.trim() || "Earth";
    const dateStr = `${inputDate.value}T${inputTime.value}:00Z`;

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          lat: currentLat,
          lon: currentLon,
          whereLabel: where,
          messageTitle: title,
          messageSub: sub,
          shirtColor: currentColor
        })
      });

      if (res.ok) {
        const data = await res.json();
        svgContainer.innerHTML = data.svg;
      }
    } catch (err) {
      console.error("Preview render failed:", err);
    }
  }

  // Initial preview render
  fetchPreview();

  // 7. Inspect Print File
  inspectPrintBtn.addEventListener("click", async () => {
    inspectPrintBtn.textContent = "Generating 4680×5790 PNG...";
    const dateStr = `${inputDate.value}T${inputTime.value}:00Z`;

    try {
      // Create a preview artwork session
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          lat: currentLat,
          lon: currentLon,
          whereLabel: inputWhere.value,
          messageTitle: inputTitle.value,
          messageSub: inputSub.value,
          shirtColor: currentColor,
          shirtSize: currentSize
        })
      });

      const data = await res.json();
      if (data.orderId) {
        window.open(`/art/${data.orderId}.png`, "_blank");
      }
    } catch (err) {
      alert("Could not generate artwork: " + err.message);
    } finally {
      inspectPrintBtn.textContent = "View Full 300 DPI Print File ↗";
    }
  });

  // 8. Stripe Hosted Checkout Flow
  stripeCheckoutBtn.addEventListener("click", async () => {
    stripeCheckoutBtn.disabled = true;
    stripeCheckoutBtn.textContent = "Preparing Stripe Checkout...";
    checkoutStatus.textContent = "";

    const dateStr = `${inputDate.value}T${inputTime.value}:00Z`;

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          lat: currentLat,
          lon: currentLon,
          whereLabel: inputWhere.value,
          messageTitle: inputTitle.value,
          messageSub: inputSub.value,
          shirtColor: currentColor,
          shirtSize: currentSize
        })
      });

      const data = await res.json();
      if (data.url) {
        checkoutStatus.style.color = "#81c784";
        checkoutStatus.textContent = "Redirecting to secure Stripe Checkout...";
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to create checkout session");
      }
    } catch (err) {
      checkoutStatus.style.color = "#ef5350";
      checkoutStatus.textContent = "Checkout Error: " + err.message;
      stripeCheckoutBtn.disabled = false;
      stripeCheckoutBtn.textContent = "Order Custom Shirt with Stripe";
    }
  });

  // 9. Instant Test Payment Flow (One-Click Verification)
  instantTestBtn.addEventListener("click", async () => {
    instantTestBtn.disabled = true;
    instantTestBtn.textContent = "Processing payment & fulfilling to Prodigi...";
    checkoutStatus.style.color = "#c5a467";
    checkoutStatus.textContent = "Simulating test card payment (pm_card_visa) & sending order to Prodigi...";

    const dateStr = `${inputDate.value}T${inputTime.value}:00Z`;

    try {
      const res = await fetch("/api/direct-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          lat: currentLat,
          lon: currentLon,
          whereLabel: inputWhere.value,
          messageTitle: inputTitle.value,
          messageSub: inputSub.value,
          shirtColor: currentColor,
          shirtSize: currentSize,
          paymentMethod: "pm_card_visa",
          recipient: {
            name: "Test Customer",
            email: "test@example.com",
            address: {
              line1: "350 5th Ave",
              line2: null,
              townOrCity: "New York",
              stateOrCounty: "NY",
              postalOrZipCode: "10118",
              countryCode: "US"
            }
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        checkoutStatus.style.color = "#81c784";
        checkoutStatus.innerHTML = `✅ Payment Succeeded (${data.paymentIntentId})! Prodigi Order Created: <strong>${data.prodigiOrder?.id || "Complete"}</strong>.`;
        setTimeout(() => {
          window.location.href = `/success?session_id=${data.paymentIntentId}`;
        }, 1500);
      } else {
        throw new Error(data.error || "Payment failed");
      }
    } catch (err) {
      checkoutStatus.style.color = "#ef5350";
      checkoutStatus.textContent = "Test Error: " + err.message;
    } finally {
      instantTestBtn.disabled = false;
      instantTestBtn.textContent = "⚡ One-Click Instant Sandbox Test (Fulfills to Prodigi)";
    }
  });

  // 10. Gallery Presets
  const presets = {
    rome: {
      title: "THE NIGHT WE MET",
      sub: "When our paths converged forever",
      where: "Rome, Italy",
      lat: 41.9028,
      lon: 12.4964,
      date: "2024-06-14",
      time: "22:30",
      color: "black"
    },
    paris: {
      title: "SHE SAID YES",
      sub: "Beneath a blanket of French stars",
      where: "Paris, France",
      lat: 48.8566,
      lon: 2.3522,
      date: "2023-09-18",
      time: "23:15",
      color: "navy"
    },
    tokyo: {
      title: "A STAR WAS BORN",
      sub: "Welcome to this world, little one",
      where: "Tokyo, Japan",
      lat: 35.6762,
      lon: 139.6503,
      date: "2024-03-28",
      time: "03:42",
      color: "asphalt"
    },
    nyc: {
      title: "UNDER NEW YORK LIGHTS",
      sub: "Our journey began here",
      where: "New York, USA",
      lat: 40.7128,
      lon: -74.0060,
      date: "2023-12-31",
      time: "23:59",
      color: "black"
    }
  };

  document.querySelectorAll(".gallery-card").forEach(card => {
    card.addEventListener("click", () => {
      const presetKey = card.getAttribute("data-preset");
      const p = presets[presetKey];
      if (!p) return;

      inputTitle.value = p.title;
      inputSub.value = p.sub;
      inputWhere.value = p.where;
      inputDate.value = p.date;
      inputTime.value = p.time;
      currentLat = p.lat;
      currentLon = p.lon;
      currentColor = p.color;

      document.querySelectorAll(".color-option").forEach(c => {
        if (c.getAttribute("data-color") === currentColor) c.classList.add("active");
        else c.classList.remove("active");
      });
      shirtMockup.setAttribute("data-color", currentColor);

      fetchPreview();
      window.scrollTo({ top: document.getElementById("customizer").offsetTop - 70, behavior: "smooth" });
    });
  });
});
