const PRODUCT = { sku: "A-MT-GD64000", price: 3600, currency: "usd" };
const COLORS = new Set(["black", "white", "forest green"]);
const SIZES = new Set(["s", "m", "l", "xl", "2xl"]);
const STOREFRONT_HTML = __STOREFRONT_HTML__;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
function safeText(value, max) {
  return String(value ?? "").normalize("NFKD").replace(/[^\x20-\x7E]/g, "").replace(/[<>\\]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}
function pdfString(value) {
  return safeText(value, 56).replace(/[()\\]/g, "\\$&");
}
function color(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${((n >> 16) & 255) / 255} ${((n >> 8) & 255) / 255} ${(n & 255) / 255}`;
}
function pdfArtwork(query) {
  const name = safeText(query.get("n"), 20) || "YOUR NAME";
  const place = safeText(query.get("p"), 28) || "A PLACE TO BEGIN";
  const coords = safeText(query.get("c"), 28) || "37.7749 N / 122.4194 W";
  const line = safeText(query.get("l"), 28) || "FOLLOW YOUR OWN SIGNAL";
  const lightShirt = query.get("t") === "white";
  const ink = color(lightShirt ? "#23332f" : "#f4f0e5"), orange = color(lightShirt ? "#cc5636" : "#fa784b"), muted = color(lightShirt ? "#60776e" : "#9ab6b1");
  const ops = [];
  const txt = (s, x, y, size, font = "F1", fill = ink, tracking = 0) => ops.push(`BT /${font} ${size} Tf ${fill} rg ${tracking ? `${tracking} Tc ` : ""}${x} ${y} Td (${pdfString(s)}) Tj ET`);
  const linePath = (x1, y1, x2, y2, width = 1, stroke = muted) => ops.push(`${stroke} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  const circle = (x, y, r, width = 1, stroke = muted) => { const k = r * 0.55228475; ops.push(`${stroke} RG ${width} w ${x+r} ${y} m ${x+r} ${y+k} ${x+k} ${y+r} ${x} ${y+r} c ${x-k} ${y+r} ${x-r} ${y+k} ${x-r} ${y} c ${x-r} ${y-k} ${x-k} ${y-r} ${x} ${y-r} c ${x+k} ${y-r} ${x+r} ${y-k} ${x+r} ${y} c S`); };
  // Garment-sized transparent PDF: a quiet, centered chest composition in warm ink.
  const cx = 561, cy = 764;
  txt("A F T E R G L O W     /     FIELD SIGNAL No. 01", 320, 1100, 11, "F2", orange);
  linePath(320, 1081, 802, 1081, 0.8, muted);
  txt("A PLACE, HELD IN LIGHT", 320, 1036, 13, "F2", muted);
  txt(name.toUpperCase(), 316, 978, 42, "F2", ink);
  txt(place.toUpperCase(), 320, 946, 14, "F1", ink, 1.1);
  // Orbital contour / compass mark.
  circle(cx, cy, 171, 1.2, muted); circle(cx, cy, 156, 0.65, muted);
  circle(cx, cy, 112, 0.65, muted);
  ops.push(`${orange} RG 1.4 w ${cx-143} ${cy-82} m ${cx-28} ${cy+52} ${cx+52} ${cy+70} ${cx+147} ${cy+104} c S`);
  ops.push(`${orange} rg ${cx+147} ${cy+104} 4 4 re f`);
  // Sun disk and horizon lines.
  circle(cx, cy+6, 54, 1.5, orange);
  ops.push(`${orange} RG 1.2 w ${cx-38} ${cy+7} m ${cx-25} ${cy+22} ${cx-13} ${cy+22} ${cx} ${cy+7} c ${cx+14} ${cy-10} ${cx+25} ${cy-10} ${cx+38} ${cy+7} c S`);
  linePath(cx-48, cy-11, cx+48, cy-11, 1.1, orange);
  linePath(cx-35, cy-22, cx+35, cy-22, 1.1, orange);
  linePath(cx-19, cy-33, cx+19, cy-33, 1.1, orange);
  // North / south ticks and fine crosshair.
  linePath(cx, cy+174, cx, cy+192, 0.8, muted); linePath(cx, cy-174, cx, cy-192, 0.8, muted);
  linePath(cx-192, cy, cx-174, cy, 0.8, muted); linePath(cx+174, cy, cx+192, cy, 0.8, muted);
  txt("N", cx-4, cy+198, 8, "F2", orange); txt("S", cx-3, cy-207, 8, "F2", orange);
  txt("YOUR COORDINATES", 320, 535, 10, "F2", muted);
  txt(coords, 320, 509, 15, "F1", ink);
  linePath(320, 487, 802, 487, 0.8, muted);
  txt("KEEP THIS CLOSE:", 320, 452, 10, "F2", orange);
  txt(line.toUpperCase(), 320, 424, 16, "F2", ink);
  txt("MADE FOR YOU  /  PRINTED TO ORDER", 320, 384, 9, "F1", muted, 0.7);
  const stream = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1122.48 1388.88] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`
  ];
  let out = "%PDF-1.4\n%AFTERGLOW\n", offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(new TextEncoder().encode(out).length); out += `${i+1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = new TextEncoder().encode(out).length;
  out += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n` + offsets.slice(1).map(o => `${String(o).padStart(10,"0")} 00000 n \n`).join("") + `trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Response(out, { headers: { "content-type": "application/pdf", "cache-control": "public, max-age=31536000, immutable", "content-disposition": "inline; filename=afterglow-field-signal.pdf" } });
}
async function stripeSignatureValid(raw, header, secret) {
  const fields = Object.fromEntries(header.split(",").map(part => part.split("=", 2)));
  if (!fields.t || !fields.v1 || Math.abs(Date.now()/1000 - Number(fields.t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${fields.t}.${raw}`)));
  const actual = [...sig].map(v => v.toString(16).padStart(2,"0")).join("");
  if (actual.length !== fields.v1.length) return false;
  let diff = 0; for (let i=0;i<actual.length;i++) diff |= actual.charCodeAt(i) ^ fields.v1.charCodeAt(i);
  return diff === 0;
}
async function makeCheckout(request, env) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Checkout is not connected yet." }, 503);
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") && request.headers.get("origin") !== origin) return json({ error: "Request origin did not match." }, 403);
  let data; try { data = await request.json(); } catch { return json({ error: "Please check your design details." }, 400); }
  const design = {
    name: safeText(data.name, 20), place: safeText(data.place, 28), coords: safeText(data.coords, 28),
    line: safeText(data.line, 28), color: String(data.color || "black").toLowerCase(), size: String(data.size || "m").toLowerCase()
  };
  if (!design.name || !design.place || !design.coords || !design.line || !COLORS.has(design.color) || !SIZES.has(design.size)) return json({ error: "Add each field and choose an available color and size." }, 400);
  const form = new URLSearchParams();
  form.set("mode", "payment"); form.set("success_url", `${origin}/?paid=1&session_id={CHECKOUT_SESSION_ID}`); form.set("cancel_url", `${origin}/?cancelled=1`);
  form.set("shipping_address_collection[allowed_countries][0]", "US"); form.set("shipping_address_collection[allowed_countries][1]", "CA"); form.set("shipping_address_collection[allowed_countries][2]", "GB");
  form.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount"); form.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", "500"); form.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd"); form.set("shipping_options[0][shipping_rate_data][display_name]", "Tracked shipping");
  form.set("line_items[0][quantity]", "1"); form.set("line_items[0][price_data][currency]", PRODUCT.currency); form.set("line_items[0][price_data][unit_amount]", String(PRODUCT.price)); form.set("line_items[0][price_data][product_data][name]", "Your Field Signal Tee"); form.set("line_items[0][price_data][product_data][description]", `${design.name} · ${design.place} · printed just for you`);
  form.set("phone_number_collection[enabled]", "true"); form.set("billing_address_collection", "auto");
  for (const [key,value] of Object.entries(design)) form.set(`metadata[${key}]`, value);
  const result = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" }, body: form.toString() });
  const session = await result.json();
  if (!result.ok || !session.url) return json({ error: "Stripe could not start checkout. Please try again." }, 502);
  return json({ url: session.url });
}
async function fulfillPaidSession(session, env, origin) {
  if (!env.PRODIGI_API_KEY) throw new Error("Prodigi is not configured");
  if (!session || !session.id || session.payment_status !== "paid") return;
  const m = session.metadata || {};
  const design = { name: safeText(m.name,20), place: safeText(m.place,28), coords: safeText(m.coords,28), line: safeText(m.line,28) };
  if (!design.name || !design.place || !design.coords || !design.line || !COLORS.has(m.color) || !SIZES.has(m.size)) throw new Error("Paid checkout is missing a valid design");
  const ship = session.shipping_details?.address;
  if (!ship?.country || !ship.line1) throw new Error("Paid checkout is missing its shipping address");
  const artworkUrl = new URL("/artwork/field-signal.pdf", origin);
  artworkUrl.search = new URLSearchParams({ n:design.name,p:design.place,c:design.coords,l:design.line,t:m.color }).toString();
  const order = {
    merchantReference: session.id,
    idempotencyKey: `afterglow-${session.id}`,
    shippingMethod: "Standard",
    recipient: {
      name: safeText(session.shipping_details?.name || session.customer_details?.name, 80),
      email: session.customer_details?.email || undefined,
      phoneNumber: session.customer_details?.phone || undefined,
      address: { line1:safeText(ship.line1,100), line2:safeText(ship.line2,100) || null, postalOrZipCode:safeText(ship.postal_code,24), countryCode:ship.country, townOrCity:safeText(ship.city,80), stateOrCounty:safeText(ship.state,80) || null }
    },
    items: [{ merchantReference: session.id, sku:PRODUCT.sku, copies:1, sizing:"fitPrintArea", attributes:{ brand:"Gildan", edge:"Crew neck", color:m.color, gender:"Men's", size:m.size, style:"64000.0" }, recipientCost:{ amount:"36.00", currency:"USD" }, assets:[{ printArea:"default", url:artworkUrl.toString() }] }],
    metadata: { shop:"Afterglow Supply", designName:design.name, designPlace:design.place }
  };
  const response = await fetch("https://api.sandbox.prodigi.com/v4.0/Orders", { method:"POST", headers:{ "X-API-Key":env.PRODIGI_API_KEY, "Content-Type":"application/json" }, body:JSON.stringify(order) });
  if (!response.ok) { const detail=await response.text(); throw new Error(`Prodigi returned ${response.status}: ${detail.slice(0,500)}`); }
}
async function webhook(request, env, origin) {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response("Webhook is not configured", { status:503 });
  const body = await request.text();
  if (!await stripeSignatureValid(body, request.headers.get("stripe-signature") || "", env.STRIPE_WEBHOOK_SECRET)) return new Response("Invalid signature", { status:400 });
  const event = JSON.parse(body);
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    const session=event.data?.object;
    if (session?.payment_status === "paid") {
      try { await fulfillPaidSession(session, env, origin); }
      catch (e) { console.error("Paid order fulfillment failed", event.id, String(e).slice(0,700)); return new Response("Fulfillment needs retry", { status:500 }); }
    }
  }
  return json({ received:true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return json({ ok:true, payments:!!env.STRIPE_SECRET_KEY, fulfillment:!!env.PRODIGI_API_KEY && !!env.STRIPE_WEBHOOK_SECRET });
    if (url.pathname === "/api/checkout" && request.method === "POST") return makeCheckout(request, env);
    if (url.pathname === "/api/stripe-webhook" && request.method === "POST") return webhook(request, env, url.origin);
    if (url.pathname === "/artwork/field-signal.pdf" && request.method === "GET") return pdfArtwork(url.searchParams);
    if (url.pathname === "/" || url.pathname === "/index.html") return new Response(STOREFRONT_HTML, { headers:{ "content-type":"text/html; charset=utf-8", "cache-control":"no-cache" } });
    return new Response("Not found", { status:404 });
  }
};
