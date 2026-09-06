export const statusDefinitions: Record<string, string> = {
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
  "no paid E2E": "No complete customer payment-to-fulfillment flow was verified. Test orders may still exist.",
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

export function explainStatus(status: string) {
  return status.split(" · ").map((label) => ({ label, definition: statusDefinitions[label] ?? label }));
}
