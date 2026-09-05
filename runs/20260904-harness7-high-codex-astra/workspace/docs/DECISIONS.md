# Design and implementation decisions

- Preserve the original's live Unix-millisecond print and freeze-on-checkout behavior, black tee, white number, two fits, and S–XL size range. Capture is an explicit review step so the customer can inspect the exact moment before payment.
- Use a generated, realistic blank crew-neck mockup for the live product canvas. Digital placement is clearly labeled approximate. Use a supplier garment photograph for the unisex on-body reference.
- Warm off-white, sage, charcoal, restrained orange, large editorial type, and monospaced timestamp displays make the single-product shop feel intentional. Mobile layout stacks the preview above configuration.
- Vercel-native Next.js App Router and TypeScript suit the explicitly requested hosting target. No Cloudflare/Sites deployment was created.
- Stripe hosted Checkout keeps card data outside the app. Server code owns price, SKU, shipping, and metadata; the client cannot submit a price or artwork URL.
- Stripe Checkout Session metadata is the durable order record for this small sandbox. Prodigi idempotency keys are derived from the unique session ID, preventing duplicate print orders on webhook retries. There is no ephemeral filesystem order database.
- Prodigi replaces Scalable Press completely. Actual API product details and quotes were checked for GLOBAL-TEE-BC-3001 and GLOBAL-TEE-BC-6004.
- US-only, USD, $30 tee + $6 shipping keeps the initial scope clear. The sampled unisex M quote was $16.90 including supplier shipping, before potential sales tax. Quotes and margins must be rechecked live.
- Artwork is generated on the server as a transparent 4677×5881 PNG with 300 DPI metadata. Glyphs are converted to vector outlines from the bundled IBM Plex Mono font before rasterization, so Vercel does not need system fonts. Artwork URLs are deterministic, public, and contain only the printed number. Final placement and sizing need physical sample approval.
- Sandbox mode is the default. Live Stripe keys are rejected in sandbox; real fulfillment requires SHOP_MODE=live and ENABLE_LIVE_ORDERS=true. Policies still explicitly describe sandbox operation and must be rewritten before live launch.

# Sources and asset provenance

- Product behavior reference: https://github.com/michelle/datetime.store (reference commit recorded in README). No license was present in the reference repository; confirm commercial reuse rights before launch.
- Unisex product and photo: https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/
- Fitted product: https://www.prodigi.com/products/womens-clothing/t-shirts/classic/bella-canvas-6004/
- Prodigi API: https://www.prodigi.com/print-api/docs/reference/
- Stripe Checkout fulfillment: https://docs.stripe.com/checkout/fulfillment
- IBM Plex Mono: https://github.com/google/fonts/tree/main/ofl/ibmplexmono (OFL bundled in public/fonts).
- Icons: lucide-react.
- Product mockup: built-in image generation tool, saved at public/shirt-front.png. Prompt: "One isolated black crew-neck short-sleeve tee, top-down flat lay, whole garment visible, realistic cotton, gentle neutral lighting, transparent background, no text or logos, clear chest for timestamp overlay."
- Social card: built-in image generation tool. Saved at public/og.png. Prompt: "Create one polished landscape social preview card for datetime.store, warm ivory background, charcoal Swiss typography, tiny orange accent. Exact text: datetime.store; Wear this very moment.; A timestamp. A t-shirt. Yours. Right half realistic black tee with white monospaced 1788566400123. Restrained independent design studio aesthetic, generous negative space, subtle soft shadow."

# Integration friction

- Stripe CLI initially had no authenticated profile. A claimable test sandbox was provisioned autonomously, using datetime-sandbox@example.com as a placeholder identity, and its test key configured privately.
- Stripe Projects CLI was installed and queried, but project initialization required browser account authorization. A device sign-in request was issued; provisioning remains pending unless completed by the operator. Creating a Stripe sandbox does not grant Projects account access.
- No connected browser backend was available. An isolated Playwright browser was installed for UI and checkout validation.
- Vercel CLI project creation selected the generic framework preset; explicit nextjs configuration corrected initial 404 routes. Its generated production alias differs from the project name, so APP_URL and the Stripe webhook were aligned with the returned alias.
- Dependency audit found transitive PostCSS and native image-library advisories. Sharp was upgraded and PostCSS pinned to a patched compatible release; final audit was clean.
- Prodigi's website and API differ on some fabric details and print dimensions. The integration uses the API's SKUs/attributes and conservative customer-facing material copy. Physical sample approval remains necessary.
