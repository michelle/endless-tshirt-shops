export const statusDefinitions: Record<string, string> = {
  "unaudited": "No human audit has been performed. The status reflects what the harness recorded and what the agent claimed about its own work, not verified behaviour.",
  "Deployed": "A storefront URL was recorded for this run. Nothing about payment, fulfilment or correctness is implied.",
  "expired at capture": "The agent reported a temporary deployment, but it redirected to the provider's expired-deployment page when the viewer captured it.",
  "checkout disabled": "The deployed store deliberately refuses checkout because the run did not find usable payment credentials.",
  "human review required": "Automated evidence has been collected, but the application, commerce flow and print output have not completed human review.",
  "No usable deployment": "The run reported a URL, but review could not establish a working public storefront at that address.",
  "Process failed": "The model adapter exited non-zero. Partial source or external objects may still exist and are described separately.",
  "Provider unavailable": "The requested model was rejected by the provider before it could begin the task.",
  "supplemental run": "This run was added after the original suite controller completed. It used the same prompt and effort but a later harness commit.",
  "Never deployed": "The run finished without shipping a storefront: no deployment URL was recorded, no project exists, and no storefront host appears in the private log.",
  "Aborted on question": "The agent stopped to ask a human for help with a step it could not complete alone. The harness runs non-interactively and denies questions, so the session ended there.",
  "URL not captured": "The run deployed, but its report ended mid-sentence and named no URL, so the harness recorded none. The storefront is reachable; the archived metadata understates the run.",
  "Sandbox checkout": "The customer flow created a Prodigi sandbox order without collecting a real payment. Sandbox orders are API test evidence only and are not manufactured or shipped.",
  "Provider limit": "The model adapter stopped because the provider's shared session quota was exhausted. This is an availability failure, not a completed implementation assessment.",
  "partial build": "A workspace contains meaningful implementation work, but the run ended before deployment and end-to-end verification.",
  "no build": "The provider ended the attempt before an application workspace was produced.",
  "submitted shirt mockup": "The fulfillment request used a rendered product photograph/mockup as the front print source instead of isolated print artwork.",
  "isolation failure": "Live inspection found a Stripe webhook pointing to another run's storefront. Results cannot be treated as independent account-isolated experiments; see the suite summary.",
  "asset fetched": "Prodigi downloaded the original artwork successfully. This is not confirmation of physical manufacture or print quality.",
  "theme design": "Clean-sheet permits any appealing shirt theme, not only a timestamp. The artwork check is assessed against that prompt.",
  "opaque panel": "The artwork includes an intentional colored background panel. Changing the viewer background will not show through that panel.",
  "fulfillment concerns": "Source or catalog inspection found fulfillment risks; see the separate checks and evidence for the specific mapping and payment issues.",
  "duplicate-order risk": "A payment produced duplicate orders during the run, and the final implementation still has a non-atomic deduplication path.",
  "App checkout unpaid": "Actual product Checkout Sessions remain unpaid. A separate paid fixture exists but lacks the metadata required for customer-order fulfillment.",
  "Paid fixture": "A real Stripe test payment completed on a Session cloned by the integration script, with the normal shipping form bypassed and shipping seeded on the PaymentIntent. This is backend integration evidence, not a verified customer checkout.",
  "hosted checkout unverified": "The normal customer-facing checkout flow was not independently demonstrated. An altered integration fixture is not a substitute for that test.",
  "Hosted unpaid": "The deployed application created a real Stripe Checkout Session, but no payment completed. This artwork was recovered using that Session's recorded inputs, not recreated from a guess.",
  "extra print text": "The print includes slogans or subtitles beyond the timestamp, so it fails this suite's timestamp-only artwork requirement.",
  "opaque print": "The PNG has an alpha channel but every pixel is opaque. Changing the viewer background cannot show through the image's own background; this fails the transparent-artwork requirement.",
  "wrong garment fit": "The customer's fit selection was recorded, but fulfillment ignores it and orders the same unisex garment for every fit. The print may arrive on a different cut than the customer chose.",
  "Payment received": "Stripe confirms a completed test payment. This alone does not prove that fulfillment worked.",
  "fulfillment failed": "The paid customer's print order did not reach Prodigi. In this run, the webhook reads an obsolete shipping-address field and throws before submitting the order.",
  "Session artwork": "This image was fetched from the artwork URL recorded on the customer's Checkout Session. It is hosted customer-path artwork, but no matching Prodigi submission was confirmed.",
  "extra branding": "The print is legible, but includes DATETIME.STORE branding and a date subtitle, so it fails the strict timestamp-only artwork requirement.",
  "manually verified": "A user completed a real Stripe test payment after the original benchmark run. The follow-up audit confirmed payment and the resulting Prodigi asset. This is later manual validation, not work performed by the benchmark agent.",
  "submitted social image": "The image actually used in the Prodigi test order was the site's social-sharing preview: a shirt mockup and marketing copy. The viewer shows that wrong submitted file, not reconstructed intended artwork.",
  "Submitted app icon": "The synthetic Prodigi order used the site's 64×64 app icon. The viewer shows that wrong submitted file, not the intended shirt design stored in an unpaid checkout.",
  "Paid E2E": "A real payment completed in Stripe's test environment, and the app sent artwork to Prodigi. E2E means end to end. This does not mean a physical shirt was printed or inspected.",
  "No paid E2E": "No complete customer payment-to-fulfillment flow was verified. Test orders may still exist.",
  "completed print": "The audit confirmed a Prodigi sandbox order with a completed artwork source. This is API test evidence, not confirmation of a manufactured shirt.",
  "2 completed prints": "The audit confirmed two Prodigi sandbox orders after test payments. No physical shirts were inspected.",
  "locally reproduced design": "The audit ran the app's image-generation code locally with inputs from a recorded unpaid checkout. The customer fulfillment code uses this artwork route, but no paid delivery was verified. A separate command-line smoke test bypassed the app and used a social-preview image; that is not evidence the app would submit the wrong image.",
  "ineffective print scale": "The submitted image contains an extremely small, faint design relative to the full canvas, so the artwork would be practically invisible on a shirt.",
  "Synthetic fulfillment": "A fabricated payment event or direct test call triggered fulfillment. This tests part of the ordering code without proving that a customer completed checkout.",
  "Direct smoke order": "A basic test order was sent directly to Prodigi, bypassing customer checkout and payment. It proves only that this test request was accepted.",
  "Local final design": "The audit reproduced the app's intended artwork locally from its recorded example. That artwork was never sent to Prodigi.",
  "undersized print source": "The image submitted for printing has too few pixels for a full-size shirt design; this run submitted only 320 × 396 pixels.",
  "Session design": "The artwork URL was stored in a Stripe Checkout Session, the record for a checkout attempt that remained unpaid. This is intended artwork, not the image sent in the synthetic print test, which used the app icon.",
};

// Suite reports capitalise the same label inconsistently, so match on case-folded
// keys rather than carrying a near-duplicate entry per spelling.
const byLabel = new Map(
  Object.entries(statusDefinitions).map(([label, definition]) => [label.toLowerCase(), definition]),
);

export function explainStatus(status: string) {
  return status.split(" · ").map((label) => ({
    label,
    definition: byLabel.get(label.toLowerCase()) ?? label,
  }));
}
