# Bringing Off Hours Field Club to production

The deployed experience is intentionally sandbox-only. It demonstrates the shopping-to-print-order journey, but it cannot accept real paid purchases. Complete the following work before advertising live sales.

## 1. Payments and durable order management

Add a payment processor such as Stripe Checkout with server-owned line items and shipping charges. Use a hosted payment page; do not add card fields to this app. Configure tax collection for the business and destinations after determining applicable obligations.

Introduce a durable commerce database with carts/checkouts, customer consent, prices, tax, payments, refunds, fulfillment attempts, and provider IDs. Verify signed payment webhooks; create fulfillment only after verified payment. Use unique constraints plus provider idempotency keys so duplicate webhooks, retries, partial failures, and timeouts cannot cause duplicate payment or fulfillment. Add a queue/outbox and retry/reconciliation process for a payment that succeeds when Prodigi is unavailable. Test refund and cancellation races.

Replace the demo payment selector and remove every sandbox-only claim only when this flow is validated. Merely changing the Prodigi endpoint is unsafe: currently an “approved” payment is just a simulation.

## 2. Fulfillment and product quality

Create/configure the live Prodigi account, billing, production settings, and live API credential. The code hard-codes the sandbox endpoint; changing it must accompany payment gating and operational readiness, not just a new key.

Revalidate `GLOBAL-TEE-BC-3001` in Natural, each offered size, front print area, regional stock, shipping services, and current landed cost using the live product and quote endpoints. The $34 retail price is a demo choice, not a validated profit model. Current sandbox shipping passes through the provider's pretax shipping quote; VAT, sales tax, duties, payment fees, returns, and other business costs are not included in the demo calculations.

The generated files are 1122 × 1402 px. Current sandbox product data recommends roughly 2490 × 3510 px for US Natural variants and 2480 × 3507 px for UK-supported Natural variants. Prepare high-resolution or vector-master artwork with intentional background, print scale, and placement. Upscaling alone cannot restore missing detail. Order actual samples of both designs and approve fit, print sharpness, color, wash durability, and placement. Replace illustrative previews with approved sample photography or calibrated provider mockups.

Implement persistent fulfillment callbacks or scheduled status reconciliation and operational alerts. Do not rely on shoppers manually refreshing their order pages. Sandbox order acceptance and artwork download do not prove physical print quality or delivery.

## 3. Customer experience and business setup

Connect a custom domain and set the trusted canonical artwork origin accordingly. Host stable, versioned print assets so artwork cannot accidentally change for an existing order.

Publish the actual seller's identity, customer support contact, privacy/retention policy, shipping expectations, and returns/refunds policy. Configure transactional confirmation, fulfillment, and refund emails. Complete necessary business, tax, consumer-law, and brand/trademark review for the selling regions. The current help page explicitly describes a demo and does not stand in for final business policies.

Choose customer authentication or an email-based order recovery flow. Current signed bearer links expire in 30 days and are saved only in the shopper's browser; anyone who holds a link can view or request cancellation. There is no account-based history or email recovery. Provide appropriate retention and deletion workflows for personal data in both the store and print provider.

## 4. Reliability and launch validation

Replace best-effort in-memory throttling with a shared rate limiter, bot protection and abuse monitoring. Current limits are per server instance and may reset or be bypassed through scale-out. Configure error monitoring, paid-order reconciliation alerts, budgets, and operational ownership.

Perform desktop and mobile browser journeys, keyboard/screen-reader checks, representative device testing, and payment webhook testing in the payment processor's test mode. Verify concurrent retries, quote expiry, unavailable variants, slow provider responses, post-payment failures, cancellations, refunds, and customer email delivery. Conduct a controlled live sample purchase only after the production changes above are ready.

Automated API and unit tests are included. Full browser interaction/visual QA and physical sample approval were not performed during this build. Optional WebMCP agent tools were not shipped; this Vercel storefront uses standard browser controls.

## References

- Prodigi sandbox/live behavior, quotes, orders, idempotency and callbacks: https://www.prodigi.com/print-api/docs/reference/
- Bella+Canvas 3001 materials, sizing, production estimate and art requirements: https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/
- Vercel Next.js deployment: https://vercel.com/docs/frameworks/full-stack/nextjs
