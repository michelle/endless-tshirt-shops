const state = { style: "fitted", size: "M", submitting: false };
const fittedPath = "M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117C92.185,29.288,80.945,16.781,79.312,15.149z";
const unisexPath = "M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z";

const $ = (selector) => document.querySelector(selector);

function parts(date = new Date()) {
  const month = date.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  const time = date.toLocaleTimeString(undefined, { hour12: false });
  const ms = `.${String(date.getMilliseconds()).padStart(3, "0")}`;
  const zone = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(date).find((part) => part.type === "timeZoneName");
  return { date: `${month} ${day}, ${year}`, time, ms, zone: zone ? zone.value : "local" };
}

function renderClock() {
  const now = parts();
  $("#hero-clock").textContent = `${now.time}${now.ms}`;
  $("#hero-date").textContent = `${now.date} · ${now.zone}`;
  $("#shirt-date").textContent = now.date;
  $("#shirt-time").textContent = now.time;
  $("#shirt-ms").textContent = now.ms;
}

function renderSelection() {
  const fitLabel = state.style === "fitted" ? "Fitted" : "Unisex";
  $("#fit-value").textContent = fitLabel;
  $("#summary-fit").textContent = state.style;
  $("#summary-size").textContent = state.size;
  $("#shirt-path").setAttribute("d", state.style === "fitted" ? fittedPath : unisexPath);
  document.querySelectorAll("[data-option]").forEach((button) => {
    const selected = button.dataset.option === "style" ? button.dataset.value === state.style : button.dataset.value === state.size;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function artworkDataUrl() {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1500;
  const context = canvas.getContext("2d");
  const now = parts();
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.font = "500 54px 'DM Mono', monospace";
  context.fillText(now.date, 600, 580);
  context.font = "500 110px 'DM Mono', monospace";
  context.fillText(now.time, 600, 735);
  context.fillStyle = "#f25343";
  context.font = "400 66px 'DM Mono', monospace";
  context.fillText(now.ms, 600, 830);
  context.fillStyle = "#ffffff";
  context.globalAlpha = 0.68;
  context.font = "400 30px 'DM Mono', monospace";
  context.fillText(`LOCAL TIME / ${now.zone}`, 600, 900);
  return canvas.toDataURL("image/png");
}

function setError(message) {
  const error = $("#checkout-error");
  error.textContent = message;
  error.hidden = !message;
}

async function beginCheckout() {
  if (state.submitting) return;
  state.submitting = true;
  const button = $("#buy-button");
  button.disabled = true;
  $("#buy-label").textContent = "Preparing your moment…";
  setError("");
  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ style: state.style, size: state.size, artwork: artworkDataUrl() })
    });
    const payload = await response.json();
    if (!response.ok || !payload.url) throw new Error(payload.error || "We couldn’t start checkout. Please try again.");
    window.location.assign(payload.url);
  } catch (error) {
    setError(error.message || "Something went wrong. Please try again.");
    state.submitting = false;
    button.disabled = false;
    $("#buy-label").textContent = "Make it mine";
  }
}

async function finishCheckout(sessionId) {
  const panel = $("#success-panel");
  const copy = $("#success-copy");
  panel.hidden = false;
  $("#buy-button").hidden = true;
  $(".secure-note").hidden = true;
  copy.textContent = "Confirming payment and sending your one-of-one design to the printer…";
  try {
    const response = await fetch(`/api/complete?session_id=${encodeURIComponent(sessionId)}`, { headers: { Accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Your payment went through, but fulfillment needs a retry.");
    copy.textContent = payload.orderId ? `Order ${payload.orderId} is queued. A confirmation is on its way.` : "Your timestamp has been saved. A confirmation is on its way.";
  } catch (error) {
    copy.textContent = error.message || "Your payment is safe. We’re finishing the print order shortly.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderClock();
  renderSelection();
  window.setInterval(renderClock, 37);
  document.querySelectorAll("[data-option]").forEach((button) => {
    button.addEventListener("click", () => {
      state[button.dataset.option] = button.dataset.value;
      renderSelection();
    });
  });
  $("#buy-button").addEventListener("click", beginCheckout);
  $("#reset-button").addEventListener("click", () => window.location.assign("/"));
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  if (sessionId) finishCheckout(sessionId);
  if (params.get("canceled")) setError("Checkout was canceled. Your moment is still here whenever you’re ready.");
});
