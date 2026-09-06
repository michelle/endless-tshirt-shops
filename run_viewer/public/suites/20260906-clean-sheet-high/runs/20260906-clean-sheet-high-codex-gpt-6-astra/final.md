Built and deployed **[Night Shift](https://benchmark-20260906-clean-sheet-high-codex-gpt-6-astra.vercel.app)**: three astronomy-themed shirts, size selection, shopping bag, Stripe Checkout, and Prodigi fulfillment.

Verified a completed Stripe test payment created Prodigi order `ord_1170685`. Both print files downloaded successfully; duplicate webhook delivery preserved the same order.

To test:

1. Choose a design and size, then checkout.
2. Use **4242 4242 4242 4242**, any future expiry, any three-digit CVC, and a US test address.
3. The confirmation page updates with your Prodigi order reference.

**No real money is charged and no shirts ship in this release.**

Next steps:

- **Claim the Stripe sandbox before September 13, 2026** using the [private handoff](OTHER_LINK).
- Before live sales: configure live accounts, enable live mode, approve physical samples, and add taxes, support/returns policies, fulfillment alerts, and refund handling.
- Known gaps include US-only delivery, no transactional emails or rate limiting, and no manual browser or physical-product QA.

Full setup and launch instructions are in the [README](README_LINK).