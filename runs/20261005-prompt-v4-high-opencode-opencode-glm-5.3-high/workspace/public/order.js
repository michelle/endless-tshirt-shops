// Order status page: polls /api/order/:id and renders the fulfilment timeline.
const id = location.pathname.split("/").pop();
const $ = (x) => document.getElementById(x);
const fmt = (v) => `$${v.toFixed(2)}`;

const STAGE_LABELS = {
  downloadAssets: "Print file downloaded by the print network",
  printReadyAssetsPrepared: "Print file prepared for the press",
  allocateProductionLocation: "Print facility allocated",
  inProduction: "In production — being printed",
  shipping: "Shipping to you",
};
const STAGE_ORDER = ["downloadAssets", "printReadyAssetsPrepared", "allocateProductionLocation", "inProduction", "shipping"];

let first = true;
async function tick() {
  let res;
  try {
    res = await fetch(`/api/order/${id}`).then((r) => r.json());
  } catch {
    return; // transient network error; next poll will retry
  }
  if (!res.ok) { location.href = "/"; return; }
  const o = res.order;

  $("oid").textContent = o.id;
  $("when2").textContent = new Date(o.createdAt).toLocaleString();

  if (o.previewUrl) $("designThumb").src = o.previewUrl;
  else $("designThumb").style.visibility = "hidden";
  const rows = [
    [`${o.design.place}`, ""],
    [`${o.design.dateStr} · ${o.design.timeStr} (${o.design.tz})`, ""],
    [`Tee — ${o.product.color}, ${o.product.size.toUpperCase()}`, fmt(o.amounts.total)],
    [o.payment ? `Paid${o.payment.last4 ? " · card •••• " + o.payment.last4 : ""} (${o.payment.driver})` : "Payment pending", ""],
  ];
  $("orderRows").innerHTML = rows
    .map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`)
    .join("");

  // timeline
  const d = o.prodigi?.details || {};
  const steps = [
    { label: "Payment received", done: o.status !== "pending_payment", active: o.status === "pending_payment", fail: false },
    { label: "Print file rendered (300 dpi)", done: !!o.printFileUrl, active: false, fail: false },
    { label: "Order sent to print network", done: !!o.prodigi?.orderId, active: false, fail: o.status === "paid_fulfillment_failed" },
    ...STAGE_ORDER.map((k) => ({
      label: STAGE_LABELS[k],
      done: d[k] === "Complete",
      active: d[k] === "InProgress" || (d[k] === "NotStarted" && !!o.prodigi?.orderId),
      fail: d[k] === "Failed",
    })),
    {
      label: "Delivered",
      done: o.prodigi?.stage === "Complete" && (d.shipping === "Complete"),
      active: o.prodigi?.stage === "Complete",
      fail: o.prodigi?.stage === "Cancelled",
    },
  ];
  $("steps").innerHTML = steps
    .map(
      (s) =>
        `<li class="${s.fail ? "failed" : s.done ? "done" : s.active ? "active" : ""}">
           <span class="dot"></span><span>${s.label}${s.fail ? " — needs attention" : ""}</span></li>`
    )
    .join("");

  $("orderErr").textContent = o.fulfillmentError ? `Fulfilment problem: ${o.fulfillmentError}` : "";
  $("retryBtn").hidden = o.status !== "paid_fulfillment_failed";

  // meta grid
  const meta = [];
  if (o.prodigi?.orderId) meta.push(["Prodigi order", o.prodigi.orderId]);
  meta.push(["Stage", o.prodigi?.stage || o.status]);
  if (o.prodigi?.shipments?.length) {
    for (const s of o.prodigi.shipments) {
      meta.push(["Shipment", `${s.status}${s.carrier ? " · " + s.carrier.name : ""}`]);
      if (s.tracking?.url) meta.push(["Tracking", `<a class="tracking" href="${s.tracking.url}" target="_blank" rel="noopener">${s.tracking.number || "track"}</a>`]);
    }
  }
  meta.push(["Print file", o.printFileUrl ? `<a class="tracking" href="${o.printFileUrl}" target="_blank" rel="noopener">300 dpi PNG</a>` : "—"]);
  $("meta").innerHTML = meta.map(([k, v]) => `<div><span>${k}</span>${v}</div>`).join("");

  if (o.prodigi || o.status === "paid_fulfillment_failed") {
    $("fine").hidden = false;
    $("finePre").textContent = JSON.stringify(
      { status: o.status, prodigi: o.prodigi, events: o.events?.slice(-8) },
      null,
      1
    );
  }
  first = false;
}

$("retryBtn").onclick = async () => {
  $("retryBtn").disabled = true;
  try {
    await fetch(`/api/order/${id}/retry`, { method: "POST" });
  } finally {
    $("retryBtn").disabled = false;
    tick();
  }
};

await tick();
setInterval(tick, 9000);
