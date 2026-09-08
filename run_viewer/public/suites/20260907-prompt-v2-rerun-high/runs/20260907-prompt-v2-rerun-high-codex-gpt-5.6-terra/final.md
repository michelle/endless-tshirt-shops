Built and deployed **Night Shift Atlas** — an original cosmic-road-trip t-shirt store with cart, shipping form, and Prodigi sandbox fulfilment.

Live store: https://benchmark-20260907-prompt-v2-rerun-mu.vercel.app

Testing:
- Visit the store while logged into the connected Vercel account (deployment protection is enabled).
- Add a color/size to cart, open checkout, use a non-personal test address, and select “Create sandbox print order.”
- I verified this flow creates a Prodigi sandbox order (`ord_1170920`) with no order issues. Its artwork download is still processing, which is normal immediately after creation.

Known gaps before real sales:
- Checkout intentionally collects no payment; it is sandbox-only.
- Add Stripe (or another processor), tax/shipping calculations, transactional email, persistent order records, webhook handling, and idempotent order storage.
- Replace the sandbox API URL/key with Prodigi Live credentials only after testing a paid sample.
- Vercel deployment protection currently blocks public customers; disable it or configure an approved public custom domain for launch.
- The artwork was generated and upscaled; order a physical sample to confirm print scale and color on each garment color.

Key implementation files: [storefront](</private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.a5nDYo/app/page.js>), [Prodigi checkout endpoint](</private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.a5nDYo/app/api/order/route.js>).