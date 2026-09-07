export type Check = { result: "pass" | "fail" | "unverified"; reason: string };
export type Assessment = Record<"artwork" | "checkout" | "prodigi", Check>;

export const criteria = [
  { id: "artwork", label: "Timestamp-only print", definition: "Only the timestamp, legible at shirt scale, with sufficient resolution and transparency. Branding, slogans, illustrations, and decorative graphics do not pass." },
  { id: "checkout", label: "End-to-end checkout", definition: "A genuine customer payment completed in Stripe test mode and triggered the application's fulfillment path. Unpaid sessions, demo checkout, and synthetic events do not pass." },
  { id: "prodigi", label: "Prodigi integration", definition: "The application's fulfillment path sent the intended artwork and garment mapping to Prodigi, which fetched the asset successfully. A standalone API request or the wrong image does not prove this. Artwork quality is scored separately." },
] as const;

const pass = (reason: string): Check => ({ result: "pass", reason });
const fail = (reason: string): Check => ({ result: "fail", reason });
const unverified = (reason: string): Check => ({ result: "unverified", reason });

// Audit judgments from each suite's summary.md plus inspection of archived art.
// These are benchmark checks, not a live health check or launch certification.
export const assessments: Record<string, Record<string, Assessment>> = {
  "20260906-minimal-inspector-high": {
    astra: {
      artwork: fail("The exact transparent source cuts off the timestamp's final digits. Its MD5 matches Prodigi: this is the submitted defect, not viewer cropping."),
      checkout: unverified("Product-tagged app Sessions remain unpaid. A separate succeeded PaymentIntent and smoke orders do not prove hosted checkout; the account also contains Terra's webhook."),
      prodigi: unverified("Both cuts were tested directly, but no paid customer Session verifies app fulfillment. Cross-run Stripe contamination prevents independent attribution."),
    },
    sol: {
      artwork: fail("Actual 4665×5844 output has only 754 nontransparent pixels and 129×12-pixel text bounds: effectively invisible at shirt scale."),
      checkout: unverified("Both app Checkout Sessions remain unpaid, with no PaymentIntents or payment events."),
      prodigi: unverified("Order ord_1170762 is a standalone fitted/M API test using the app renderer, not the paid application fulfillment path."),
    },
    terra: {
      artwork: pass("Exact 2480×3507 customer-renderer test source is a readable raw timestamp on transparency; MD5 matches Prodigi."),
      checkout: unverified("Saved profile has no test key; Terra's webhook appears on Astra's account. No independent paid customer flow was established."),
      prodigi: unverified("Only direct garment API tests are confirmed. Current shipping extraction and body idempotency exist, but paid app delivery is unverified."),
    },
    luna: {
      artwork: fail("Exact paid source has only 4,636 nontransparent pixels and adds date, fit and DATETIME.STORE branding beyond the timestamp."),
      checkout: pass("Succeeded app-shaped PaymentIntent, fulfillment metadata and completed fitted/L order ord_1170769 agree. Independent browser card-entry replay was not performed."),
      prodigi: pass("Final paid fitted/L order uses Bella + Canvas 6004 and the intended asset; MD5 matches and asset is Complete. Earlier unisex asset failures remain recorded."),
    },
    fable: {
      artwork: pass("Exact 2490×3510 transparent Chivo timestamp is legible and source MD5 matches the completed paid order."),
      checkout: pass("Paid app PaymentIntent and unisex/L order ord_1170778 agree, corroborating archived browser-purchase evidence. This audit did not replay payment."),
      prodigi: pass("Intended Bella + Canvas 3001 black/L mapping and source fetched successfully; webhook and browser fallback use body idempotency."),
    },
    opus: {
      artwork: pass("Exact 4680×5790 timestamp-only transparent print is legible, with source MD5 matching paid order ord_1170792."),
      checkout: pass("Latest app payment completed and produced the fitted/M order, corroborating the browser-test report. A forced-failure authorization was canceled separately."),
      prodigi: pass("Final Bella + Canvas 6004 black/M order is Complete with intended asset and body idempotency. Earlier asset errors and physical samples remain caveats."),
    },
    sonnet: {
      artwork: fail("The actual paid 1500×1800 transparent artwork adds an ISO-date subtitle below the raw timestamp."),
      checkout: pass("Paid app PaymentIntents triggered matching completed orders, including ord_1170804. Independent browser replay remains unverified."),
      prodigi: fail("Two earlier payments each produced duplicate orders. Final code still uses non-atomic metadata claiming and omits Prodigi idempotencyKey; successful asset delivery does not close that race."),
    },
  },
  "20260906-clean-sheet-high": {
    astra: {
      artwork: pass("Legible high-resolution astronomy artwork on transparency; exact paid orbit and phase-v2 source hashes match Prodigi."),
      checkout: pass("Two original app-created $102.00 Sessions were paid through API-driven confirmation with shipping collection intact and fulfilled; not cloned fixtures."),
      prodigi: pass("Paid orbit/M and phase/S quantities map to black Gildan 64000; both orders fetched the intended assets. Physical samples remain unverified."),
    },
    sol: {
      artwork: pass("The actual 6000×7200 customer-path 418 print is readable transparent artwork intended for an orange shirt."),
      checkout: unverified("Three unpaid Sessions, no PaymentIntents or payment events; the customer payment-to-order path was not demonstrated."),
      prodigi: unverified("Committed fulfillment code exists, but no matched app order or asset delivery was confirmed."),
    },
    terra: {
      artwork: pass("The 2490×3510 outdoor design is a coherent opaque panel. This prompt allows themed graphics; sample the panel on each garment color before launch."),
      checkout: unverified("Both app Sessions stayed unpaid; there is no customer payment-to-fulfillment proof."),
      prodigi: unverified("Catalog colors are valid, but no paid app order verifies the TEE-AA-1301 mapping and public asset delivery."),
    },
    luna: {
      artwork: pass("The 2172×724 transparent fixed-edition timestamp is legible pixel typography. This prompt does not require purchase-time capture; lower raster resolution needs physical-scale validation."),
      checkout: unverified("Three unpaid Sessions and no payments. The legacy-shaped synthetic event does not verify real current checkout events."),
      prodigi: fail("The app offers navy blue absent from the exact TEE-GIL-64000 catalog, reads legacy shipping_details, and lacks a paid-state guard. Only synthetic black/M delivery was confirmed."),
    },
    fable: {
      artwork: pass("The paid 4665×5844 transparent HTTP response design is legible, rendered with bundled fonts, and hash-matched to Prodigi."),
      checkout: pass("A genuine paid $34.99 app Session is linked to the selected navy blue/XL order and payment receipt."),
      prodigi: pass("Order ord_1170711 is Complete with the intended Gildan 64000 variant and source. Body idempotency and receipt reuse are present; wider catalog regression testing remains."),
    },
    opus: {
      artwork: pass("The exact paid 3000×3758 indexed PNG is a coherent, transparent Rule 184 cellular-automaton design; its hash matches Prodigi."),
      checkout: pass("Two genuine app Sessions were paid and produced matching custom/multi-item orders. Browser gestures and latest webhook delivery were not independently replayed."),
      prodigi: fail("One paid cart produced duplicate orders. Final code sends Idempotency-Key as a header instead of the documented JSON idempotencyKey; non-atomic prelookup does not close the race."),
    },
    sonnet: {
      artwork: pass("The actual 4665×5844 HTTP 418 panel is legible and intentionally colored. Opaque themed panels are allowed by clean-sheet, unlike timestamp-only prompts."),
      checkout: unverified("App 404/M and 418/L Sessions remain unpaid. The sole $30 paid fixture has no product metadata and does not demonstrate customer fulfillment."),
      prodigi: unverified("Order ord_1170723 was a separate 500/M direct API smoke test, not the app's paid ordering path. Missing paid/idempotency guards still require fixes."),
    },
  },
  "20260905-unserious-high": {
    astra: {
      artwork: pass("The exact 4677×5881 print is a legible raw timestamp on transparency, with 130,769 nontransparent pixels."),
      checkout: unverified("The successful payment used a cloned fixture Session with hosted shipping collection removed and PaymentIntent shipping seeded. Paid backend fulfillment worked, but the original customer checkout was not verified."),
      prodigi: pass("The deployed fulfillment handler sent the fixture's intended black/M artwork to ord_1170586. Source MD5 matches Prodigi; this integration check is distinct from hosted checkout."),
    },
    sol: {
      artwork: fail("The deployed customer artwork has only 2,728 nontransparent pixels in tiny glyphs on a 4665×5844 canvas; the code also adds a slogan."),
      checkout: unverified("Three open unpaid Checkout Sessions, no PaymentIntents or payment events. A direct smoke order does not establish end-to-end checkout."),
      prodigi: unverified("Order ord_1170588 fetched the same artwork bytes through a standalone API test, not the application's paid fulfillment path."),
    },
    terra: {
      artwork: fail("The transparent image includes THE INSTANT WAS and AND THEN IT WASN'T, beyond the timestamp."),
      checkout: unverified("One unpaid Checkout Session and no PaymentIntents. Customer payment-to-fulfillment was not verified."),
      prodigi: fail("Both classic and roomy choices submit the same TEE-AS-5001 garment; only standalone smoke order ord_1170592 was confirmed."),
    },
    luna: {
      artwork: fail("Every pixel of the 4200×5370 canvas is opaque white apart from tiny rendered marks; the source also includes branding and a slogan."),
      checkout: unverified("Nine unpaid Sessions, no PaymentIntents or payment events. Legacy shipping extraction is a code concern, not a newly observed paid failure in this suite."),
      prodigi: fail("Both fit choices submit the same white unisex TEE-AS-5001. Only standalone smoke order ord_1170594 was confirmed; paid application delivery was not."),
    },
    fable: {
      artwork: pass("The exact 4677×5881 print contains only a legible raw timestamp on transparency; 197,939 nontransparent pixels."),
      checkout: pass("A genuine succeeded deployed PaymentIntent is linked to the app's fitted/M fulfillment and completed order. Browser payment steps were not independently replayed."),
      prodigi: pass("Paid fitted/M order ord_1170596 uses the intended Bella + Canvas 6004 and deployed artwork; its source MD5 matches Prodigi. An earlier localhost-source order failed separately."),
    },
    opus: {
      artwork: pass("The 3300×4228 transparent print contains only a legible raw timestamp; 127,358 nontransparent pixels. Physical print placement remains unverified."),
      checkout: pass("A genuine paid $22.50 Checkout Session triggered the deployed fulfillment path and ord_1170598."),
      prodigi: fail("The paid customer selected fitted, but the code ignores fit and order ord_1170598 contains unisex Gildan 64000. Payment and asset delivery do not excuse the wrong garment mapping."),
    },
    sonnet: {
      artwork: fail("The actual 1200×1500 print is fully opaque and adds ms since epoch below the timestamp; it is not timestamp-only transparent artwork."),
      checkout: pass("Two genuine paid $22.50 Checkout Sessions triggered orders for black/M and white/L variants."),
      prodigi: pass("Paid customer orders ord_1170599 and ord_1170600 use the selected unisex garment/color/size and intended artwork. The latter's source MD5 matches Prodigi. Paid-state guarding still needs hardening."),
    },
  },
  "20260905-beauty-high": {
    astra: {
      artwork: pass("The archived 4665×5844 transparent print contains only the raw epoch at a readable scale."),
      checkout: pass("One genuine paid Stripe test checkout triggered fulfillment; declined payments were also tested."),
      prodigi: pass("The paid app flow sent the intended design to order ord_1170501; source and thumbnail were confirmed."),
    },
    sol: {
      artwork: fail("The archived smoke-order design includes decorative lines and dots rather than only the timestamp."),
      checkout: fail("Both Checkout Sessions stayed unpaid, and the deployed webhook was missing configuration."),
      prodigi: unverified("Order ord_1170506 was a standalone smoke request. It does not verify the app's fulfillment path."),
    },
    terra: {
      artwork: fail("The print includes slogans, a rule, and a decorative dot in addition to the timestamp."),
      checkout: unverified("Two unpaid Sessions; no completed customer payment-to-fulfillment flow."),
      prodigi: unverified("The final app design was only reproduced locally and never reached Prodigi."),
    },
    luna: {
      artwork: fail("The print is an opaque black rectangle with tiny formatted text, not a usable transparent timestamp print."),
      checkout: fail("The deployment was explicitly demo-only, with no usable Stripe account or configured webhook."),
      prodigi: unverified("The direct smoke order bypassed the app's customer fulfillment path."),
    },
    fable: {
      artwork: pass("The archived 2340×2895 transparent print contains only a legible raw epoch."),
      checkout: pass("A genuine embedded Stripe test checkout completed payment and fulfillment."),
      prodigi: pass("The paid fitted/L flow sent the intended artwork to ord_1170515; source and thumbnail were confirmed."),
    },
    opus: {
      artwork: fail("The actual production asset is only 320×396 pixels, far below the intended print resolution."),
      checkout: pass("Two genuine Stripe test payments completed and triggered fulfillment."),
      prodigi: pass("Paid app flows created orders ord_1170523 and ord_1170525 with the generated assets. Their resolution failure is scored under artwork."),
    },
    sonnet: {
      artwork: fail("The customer-path design stored on the unpaid Session includes sun/cloud illustrations and an opaque JPEG background, not timestamp-only transparent art."),
      checkout: unverified("All three Sessions stayed unpaid; only synthetic signed payment events were exercised."),
      prodigi: unverified("Synthetic webhook tests delivered the 64×64 app icon, not the customer-path artwork. Delivery of the actual Session design was never verified."),
    },
  },
  "20260905-minimal-high": {
    astra: {
      artwork: pass("The archived 4677×5881 transparent print contains only a legible raw epoch."),
      checkout: pass("Three genuine Stripe test payments; one was refunded before print and the other two fulfilled."),
      prodigi: pass("Two paid variant orders sent the intended artwork; source and thumbnail evidence were confirmed."),
    },
    sol: {
      artwork: fail("The actual paid-order asset contains only 994 nontransparent pixels in a 254×12 strip of tiny box-like glyphs. The local reconstruction hid this deployed rendering failure."),
      checkout: pass("Post-run user test on 2026-09-06 UTC completed a $22.50 Stripe payment and app fulfillment. This is new manual evidence, not a test the benchmark agent performed."),
      prodigi: pass("Paid fitted/M order ord_1170585 fetched the intended /api/artwork asset successfully; the downloaded file's MD5 matches Prodigi's record. Print quality fails separately. Independent webhook delivery versus success-page recovery was not isolated."),
    },
    terra: {
      artwork: fail("The submitted timestamp is a nearly invisible 167×13-pixel strip on a 2490×3510 canvas."),
      checkout: pass("Two genuine Stripe test payments completed and triggered orders."),
      prodigi: pass("Paid app flows delivered their generated assets to ord_1170543 and ord_1170546. The print-scale failure is scored under artwork."),
    },
    luna: {
      artwork: fail("The paid Session's hosted image renders three lines of tiny box-like glyphs, only 2,438 nontransparent pixels on a 2400×2900 canvas."),
      checkout: fail("Post-run user payment succeeded, but end-to-end payment-to-fulfillment failed: no corresponding Prodigi order and a pending webhook delivery. Receiving money alone does not pass this check."),
      prodigi: fail("The handler reads session.shipping_details, absent from the actual paid event, and throws before sending an order. Shipping is in collected_information.shipping_details. Both fit choices also map to the same unisex SKU."),
    },
    fable: {
      artwork: pass("The archived 3120×3860 transparent print contains only a legible raw epoch."),
      checkout: pass("Genuine Stripe test payments completed for two successfully fulfilled hosted variants."),
      prodigi: pass("Two paid hosted designs reached Prodigi after an earlier localhost-source failure."),
    },
    opus: {
      artwork: pass("The archived 3600×4800 transparent print contains only a legible raw epoch."),
      checkout: pass("Genuine Stripe test payments completed and triggered fulfillment."),
      prodigi: pass("Paid orders delivered intended assets. Initial duplicates prompted a lease/prelookup fix; regression and outage testing remain launch gaps."),
    },
    sonnet: {
      artwork: fail("The print adds DATETIME.STORE branding and a second date line; it is not only the timestamp."),
      checkout: pass("A post-run user checkout on 2026-09-06 UTC completed a genuine Stripe test payment and produced Prodigi order ord_1170583. This was not performed by the benchmark agent."),
      prodigi: pass("The paid unisex/M flow delivered its intended /api/artwork PNG to ord_1170583; the fetched source MD5 matches Prodigi's record. Payment guarding and recovery still need hardening."),
    },
  },
};

export function rateRun(suiteId: string, runId: string) {
  const assessment = assessments[suiteId]?.[runId];
  const checks = criteria.map((criterion) => ({
    ...criterion,
    ...(suiteId === "20260906-clean-sheet-high" && criterion.id === "artwork" ? {
      label: "Printable theme design",
      definition: "A coherent theme design legible at shirt scale with suitable raster detail. This prompt allows graphics and intentional colored panels; opacity is disclosed, not automatically failed. Physical samples remain unverified.",
    } : {}),
    ...(assessment?.[criterion.id] ?? unverified("No independent audit evidence recorded for this check.")),
  }));
  const passed = checks.filter((check) => check.result === "pass").length;
  return {
    checks, passed,
    tone: passed === 3 ? "complete" : passed === 2 ? "partial" : "failed",
    label: passed === 3 ? "Pass" : passed === 2 ? "Partial" : "Fail",
  };
}
