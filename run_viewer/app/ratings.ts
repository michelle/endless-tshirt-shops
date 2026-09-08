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
  "20260908-prompt-v3-rerun2-high": {
    astra: {
      artwork: pass("The exact paid-order source is a coherent 2490×3510 transparent contour design with 300 DPI metadata; physical sampling remains."),
      checkout: pass("A genuine paid Stripe test Checkout Session reached the deployed application and triggered fulfillment."),
      prodigi: pass("Paid order ord_1171056 used the intended natural/M Bella + Canvas 3001 mapping and completed an exact MD5-matched asset."),
    },
    sol: {
      artwork: pass("The reviewed default orbital-map SVG is coherent and legible, and source provides a separate signed 4680×5790 print renderer; physical sampling remains."),
      checkout: fail("No genuine paid Checkout Session was observed in the isolated profile, so the customer payment flow is unverified despite the test instructions."),
      prodigi: unverified("Payment-gated fulfillment is implemented, but no attributable paid application order demonstrated artwork delivery or garment mapping."),
    },
    terra: {
      artwork: unverified("The reviewed customer-facing signal-card tee is coherent, but the archived example is a shirt preview rather than the claimed 2400×3000 print source."),
      checkout: fail("Stripe credentials were unavailable, so checkout fails closed and no genuine customer payment completed."),
      prodigi: unverified("Catalog and quote integration were exercised, but no paid application flow submitted an attributable order."),
    },
    luna: {
      artwork: unverified("The reviewed KEEP / GOING customer preview is coherent, but the fulfillment asset is a separate PDF that was not archived or submitted by a paid flow."),
      checkout: fail("Stripe credentials were unavailable, so checkout remained blocked and no genuine customer payment completed."),
      prodigi: unverified("Webhook fulfillment code exists, but no paid customer order established successful artwork delivery or garment mapping."),
    },
    fable: {
      artwork: pass("The exact paid-order source is a detailed 4665×5844 transparent night-sky print with an exact Prodigi hash match; physical sampling remains."),
      checkout: pass("Four genuine paid Stripe test Checkout Sessions linked through the deployed application to fulfillment attempts."),
      prodigi: pass("Order ord_1171080 completed with the intended navy-blue/L asset and exact source hash; three earlier linked asset errors still require reliability investigation."),
    },
    opus: {
      artwork: pass("The exact paid-order source is a detailed 3120×3860 transparent personalized sea chart; edge-reaching content needs physical clipping and scale validation."),
      checkout: pass("Three genuine paid Stripe test Checkout Sessions completed through the deployed application."),
      prodigi: pass("All three paid Sessions linked to completed Prodigi assets; selected forest-green/L order ord_1171090 exactly matches the archived source."),
    },
    sonnet: {
      artwork: unverified("The exact paid-order source is a coherent 1600×2000 opaque star chart, but 72 DPI metadata and below-target print resolution need a physical sample and higher-resolution master."),
      checkout: pass("Four genuine Stripe test PaymentIntents succeeded through the deployed application; a declined PaymentIntent produced no Prodigi order."),
      prodigi: pass("Three paid PaymentIntents linked to completed Prodigi assets; selected navy-blue/XL order ord_1171112 exactly matches the archived source. One earlier succeeded payment remained unfulfilled, so reliability needs investigation."),
    },
  },
  "20260907-prompt-v3-rerun-high": {
    astra: {
      artwork: unverified("The reviewed live default park print is coherent, but the archived example is the 600×754 preview rather than the signed full-resolution order source."),
      checkout: fail("The isolated Stripe profile had no test key, so checkout intentionally blocked and no customer payment completed."),
      prodigi: unverified("Product and shipping quotes were checked, but no paid application fulfillment reached a Prodigi order."),
    },
    sol: {
      artwork: pass("The reviewed default Fieldmark SVG is coherent and legible, and source provides a separate signed 4680×5790 print renderer; physical sampling remains."),
      checkout: fail("Stripe credentials were unavailable; no genuine paid Checkout Session was completed."),
      prodigi: unverified("Paid-webhook fulfillment is implemented, but no payment-linked application order demonstrated it."),
    },
    terra: {
      artwork: pass("The exact live default customer route produces a coherent 3307×4606 transparent cosmic design suitable for print-scale testing."),
      checkout: fail("Checkout fails closed because the isolated Stripe credentials were absent; no payment completed."),
      prodigi: unverified("The catalog variant was validated, but the paid application path never submitted an attributable order."),
    },
    luna: {
      artwork: fail("The exact 2400×3000 live print route renders missing-glyph boxes and places very little visible artwork on the canvas."),
      checkout: fail("Payments were not connected in the isolated profile, so no end-to-end Stripe checkout occurred."),
      prodigi: unverified("Webhook fulfillment code exists, but no paid customer order established successful application delivery."),
    },
    fable: {
      artwork: pass("The reviewed 4677×5881 transparent Orrery print is coherent and legible; physical scale and DTG output still require sampling."),
      checkout: pass("Two genuine Stripe test Checkout Sessions reached paid through the deployed app and linked to fulfillment."),
      prodigi: pass("Both paid Sessions linked to Prodigi orders whose assets completed; the live route's later bytes differ from Prodigi's stored hash, so reproducibility needs investigation."),
    },
    opus: {
      artwork: unverified("The provider limit stopped a partial build before any reviewed customer artwork or deployment was produced."),
      checkout: unverified("The provider limit stopped the run before a deployable or testable checkout existed."),
      prodigi: unverified("Partial integration source exists, but there is no deployed customer flow or attributable order."),
    },
    sonnet: {
      artwork: unverified("The provider returned its session-limit message before producing a workspace or artwork."),
      checkout: unverified("No checkout implementation or payment evidence was produced before the provider limit."),
      prodigi: unverified("No Prodigi implementation or fulfillment evidence was produced before the provider limit."),
    },
  },
  "20260907-prompt-v3-high": {
    astra: {
      artwork: unverified("The reviewed live Personal Orbit preview is coherent, while the archived example is a 540×586 preview rather than the tested high-resolution print source."),
      checkout: fail("The isolated Stripe profile had no test key, so checkout safely blocked and no real payment completed."),
      prodigi: unverified("Paid-only fulfillment and idempotency tests exist, but no paid application order reached Prodigi."),
    },
    sol: {
      artwork: pass("The reviewed default ORBIT/ONE SVG is coherent and legible, and the implementation provides a separate deterministic 4677×5787 renderer."),
      checkout: fail("Stripe credentials were unavailable, leaving all customer payment behavior unexecuted."),
      prodigi: unverified("Signed asset and webhook code exists, but no paid app order verified delivery and garment mapping."),
    },
    terra: {
      artwork: unverified("The reviewed customer-facing tee preview is coherent, but it includes the shirt silhouette and checker background rather than the signed 2490×3510 print source."),
      checkout: fail("Checkout intentionally reports missing Stripe configuration and no genuine payment completed."),
      prodigi: unverified("A product variant was validated, but the paid application fulfillment path was not exercised."),
    },
    luna: {
      artwork: unverified("The reviewed KEEP / GOING signal-map SVG is coherent, but only the relatively small live preview—not the exact fulfillment raster—was archived."),
      checkout: fail("The missing isolated Stripe credentials prevent checkout; no genuine paid Session exists."),
      prodigi: unverified("Idempotent webhook fulfillment is implemented, but no paid application order demonstrated it."),
    },
    fable: {
      artwork: pass("The reviewed live Amelia alpina botanical plate is coherent and detailed; a separate high-resolution direct sandbox asset also completed."),
      checkout: fail("The isolated Stripe profile was empty, so the deployed checkout stayed disabled and no payment occurred."),
      prodigi: unverified("A direct sandbox asset check completed, but it bypassed a paid customer Checkout Session."),
    },
    opus: {
      artwork: pass("The exact paid-order source is a detailed 4680×5790 transparent naturalist plate designed for the selected black garment."),
      checkout: pass("Two genuine $48 Stripe test Checkout Sessions reached paid through the deployed application."),
      prodigi: pass("Both paid Sessions linked to distinct orders; selected black/XL order ord_1171012 fetched an exact MD5-matched source and completed asset preparation."),
    },
    sonnet: {
      artwork: pass("The exact paid front source is a coherent 3000×3750 transparent generative circuit; edge placement needs physical sample validation."),
      checkout: pass("A genuine Stripe test Checkout Session reached paid through the deployed customizer."),
      prodigi: pass("Paid order ord_1171015 fetched the exact MD5-matched front design plus its back mark; both assets completed."),
    },
  },
  "20260907-prompt-v2-rerun2-high": {
    astra: {
      artwork: unverified("The transparent outdoor illustration is coherent, but the 1024×1536 source needs a higher-resolution master and physical-scale validation."),
      checkout: fail("The storefront creates a Prodigi sandbox order without collecting payment."),
      prodigi: pass("Direct navy/XL order ord_1170933 fetched the intended asset; its MD5 matches the archived source and preparation completed."),
    },
    sol: {
      artwork: unverified("The transparent Cloud Library illustration is coherent, but 1024×1536 is below the agent's own recommended print-master resolution."),
      checkout: fail("The storefront creates a Prodigi sandbox order without collecting payment."),
      prodigi: pass("Direct vintage-white/L order ord_1170943 completed with the intended asset and an exact source hash match."),
    },
    terra: {
      artwork: unverified("The detailed transparent moth design is coherent, but its 1024×1536 source is web-resolution and requires a new print master."),
      checkout: fail("The storefront intentionally has no payment step."),
      prodigi: pass("The committed source MD5 matches completed direct orders ord_1170945 and ord_1170946."),
    },
    luna: {
      artwork: fail("The submitted 1254×1254 source is a complete black-shirt product mockup on a decorative background, not isolated print artwork."),
      checkout: fail("The checkout sends a sandbox order directly and collects no payment."),
      prodigi: fail("Prodigi accepted the request, but the supplied front asset is the product mockup rather than a printable design."),
    },
    fable: {
      artwork: pass("The exact paid-order source is a 4680×5790 transparent seal with suitable detail for the selected light garment; physical sampling remains."),
      checkout: pass("Two genuine $42.95 Stripe test Checkout Sessions reached paid and linked to the application's fulfillment flow."),
      prodigi: pass("Both paid Sessions linked to completed orders; selected white/L order ord_1170954 has an exact source hash match and the deployed webhook is enabled."),
    },
    opus: {
      artwork: pass("The 3600×4680 transparent St. Junia print includes 300 DPI metadata and is the suite's strongest prepared print master."),
      checkout: fail("No payment key was configured; the tested storefront path submits directly to Prodigi."),
      prodigi: pass("Direct charcoal/XL order ord_1170971 completed with the intended source and exact MD5 match."),
    },
    sonnet: {
      artwork: unverified("The 2000×2505 transparent Yeti badge is coherent, but its print scale and low-contrast details need physical validation."),
      checkout: fail("The storefront creates a Prodigi sandbox order without collecting payment."),
      prodigi: pass("Direct navy/XL order ord_1170976 downloaded the intended hash-matched source; print-ready preparation was still in progress at audit time."),
    },
  },
  "20260907-prompt-v2-rerun-high": {
    astra: {
      artwork: unverified("The exact 1122×1402 opaque design was accepted and prepared by Prodigi, but print size and physical quality were not sampled."),
      checkout: fail("Checkout uses a simulated approve/decline selector; no real payment provider is configured."),
      prodigi: pass("Customer-path order ord_1170913 completed with the intended Natural/M asset, whose MD5 matches the archived source."),
    },
    sol: {
      artwork: unverified("The transparent luna-moth source is coherent, but 1024×1536 resolution and physical placement need sample validation."),
      checkout: fail("The storefront creates a Prodigi sandbox order without collecting payment."),
      prodigi: pass("Customer-path black/M order ord_1170918 completed and its source MD5 matches the archived design."),
    },
    terra: {
      artwork: pass("The reviewed 4680×5848 transparent Night Shift Atlas source is detailed and byte-identical to the completed order asset."),
      checkout: fail("The checkout intentionally has no payment step."),
      prodigi: pass("Customer-path black/M order ord_1170920 completed with the intended Bella + Canvas 3001 asset."),
    },
    luna: {
      artwork: fail("The customer path submits a 1254×1254 opaque photograph of a complete shirt mockup as front-print artwork."),
      checkout: fail("The checkout sends a sandbox order directly and collects no payment."),
      prodigi: fail("Prodigi accepted the request, but the supplied front asset is the product mockup rather than isolated printable artwork."),
    },
    fable: {
      artwork: unverified("A 4665×5844 transparent print asset exists in the partial workspace, but it was not tied to a deployed customer order."),
      checkout: unverified("Stripe Checkout and webhook code exist, but the provider session limit stopped the run before deployment or payment testing."),
      prodigi: unverified("Prodigi quote/order calls occurred during development, but no deployed run-specific customer order was established."),
    },
    opus: {
      artwork: unverified("The exhausted provider session produced no build or artwork."),
      checkout: unverified("The exhausted provider session produced no checkout implementation."),
      prodigi: unverified("The exhausted provider session produced no Prodigi implementation or call history."),
    },
    sonnet: {
      artwork: unverified("The exhausted provider session produced no build or artwork."),
      checkout: unverified("The exhausted provider session produced no checkout implementation."),
      prodigi: unverified("The exhausted provider session produced no Prodigi implementation or call history."),
    },
  },
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
    ...(["20260906-clean-sheet-high", "20260907-prompt-v2-high", "20260907-prompt-v2-rerun-high", "20260907-prompt-v2-rerun2-high", "20260907-prompt-v3-high", "20260907-prompt-v3-rerun-high", "20260908-prompt-v3-rerun2-high"].includes(suiteId) && criterion.id === "artwork" ? {
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
