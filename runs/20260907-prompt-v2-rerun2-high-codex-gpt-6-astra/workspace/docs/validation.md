# Validation — 2026-09-07

Deployed URL: https://amateur-weather-club-20260907-r2-astra-7f4c.vercel.app
Vercel project: benchmark-20260907-prompt-v2-rerun2-high-codex-gpt-6-astra
Final deployment: dpl_9qYeUWh6vQmFAsft2Yu1JsphzF9p — READY

- Production build and TypeScript passed.
- npm audit: zero known vulnerabilities after removing unused vulnerable Worker runtime dependencies and applying the remaining compatible fix.
- Client bundle scan: no Prodigi API key or order-signing secret found.
- Public print PNGs return HTTP 200 with image/png and no Vercel login. Project deployment protection was disabled for this intentionally public store.
- HTTP integration suite: 33 checks passed locally and 33 on the final deployed URL.
- Deployed test orders: ord_1170932 (A Little Rain / black / M), ord_1170933 (Head in the Clouds / navy / XL).
- Repeating the same checkout request returned the existing order ID.
- Earlier integration orders ord_1170930 and ord_1170931 both reached downloadAssets=Complete and allocateProductionLocation=Complete with no status issues. This confirms both print URLs were consumed by Prodigi. Sandbox production simulation was InProgress; no real printing or shipping occurs.
- A single US medium tee quote returned $32.00 retail + $4.74 shipping = $36.74 test total. Prices are not guaranteed for future quotes. Customer tax calculation is not implemented.
- Validation included empty/invalid carts, invalid variants and quantities, unsupported country, disallowed request origin, receipt forgery, client price tampering, missing sandbox acknowledgment, malformed email/US ZIP, signed quote tampering, two product fulfillment mappings, quote coverage for all four supported countries, status response privacy, and page/image HTTP checks.
- Browser interaction, screenshot, physical sample, live payment, and real shipping tests were not performed.

The suite creates two sandbox orders when rerun. The application intentionally uses only api.sandbox.prodigi.com. Private receipt tokens are omitted from this document.
