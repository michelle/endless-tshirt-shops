import assert from "node:assert/strict";
const base = process.argv[2];
if (!base) throw new Error("Pass the deployed HTTPS URL.");
const health = await fetch(base + "/api/health").then((r) => r.json());
assert.equal(health.store, "Field Notes Club");
assert.equal(health.mode, "test");
assert.equal(health.fulfillmentMode, "sandbox");
const home = await fetch(base);
assert.equal(home.status, 200);
assert.match(await home.text(), /Your place/);
const design = {
  place: "TEST PARK",
  name: "TEST EXPLORERS",
  year: "2026",
  phrase: "A GOOD DAY OUTSIDE",
  palette: "forest",
  size: "m",
};
const image = await fetch(
  base + "/api/artwork?design=" + encodeURIComponent(JSON.stringify(design)),
);
assert.equal(image.status, 200);
assert.equal(image.headers.get("content-type"), "image/png");
assert.ok((await image.arrayBuffer()).byteLength > 10000);
const invalidArt = await fetch(base + "/api/artwork?token=forged.invalid");
assert.equal(invalidArt.status, 400);
const forged = await fetch(base + "/api/webhooks/stripe", {
  method: "POST",
  body: "{}",
  headers: { "stripe-signature": "fake" },
});
assert.ok([400, 503].includes(forged.status));
const noOrigin = await fetch(base + "/api/checkout", {
  method: "POST",
  body: JSON.stringify(design),
});
assert.equal(noOrigin.status, 403);
if (!health.checkoutConfigured) {
  const checkout = await fetch(base + "/api/checkout", {
    method: "POST",
    body: JSON.stringify(design),
    headers: { Origin: base, "Content-Type": "application/json" },
  });
  assert.equal(checkout.status, 503);
  console.log("Checkout correctly blocked until Stripe is configured.");
}
console.log(
  "PASS: deployed home, artwork, signed-asset protection, webhook rejection, origin enforcement, and sandbox mode.",
);
console.log("Stripe checkout configured:", health.checkoutConfigured);
