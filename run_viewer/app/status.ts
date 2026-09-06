export const statusDefinitions: Record<string, string> = {
  "Paid E2E": "A real payment completed in Stripe's test environment, and the app sent artwork to Prodigi. E2E means end to end. This does not mean a physical shirt was printed or inspected.",
  "No paid E2E": "No complete customer payment-to-fulfillment flow was verified. Test orders may still exist.",
  "no paid E2E": "No complete customer payment-to-fulfillment flow was verified. Test orders may still exist.",
  "completed print": "The audit confirmed a Prodigi sandbox order with a completed artwork source. This is API test evidence, not confirmation of a manufactured shirt.",
  "2 completed prints": "The audit confirmed two Prodigi sandbox orders after test payments. No physical shirts were inspected.",
  "locally reproduced design": "The audit ran the app's image-generation code locally with inputs from a recorded unpaid checkout. This is the intended artwork; the actual test order submitted the social-preview image instead.",
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
