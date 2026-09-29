# Stellara — Custom Star Map T-Shirts

A fully functioning t-shirt store that sells one-of-a-kind **star map** shirts.
Each shirt shows the real night sky — the actual stars and constellations that
were overhead — for a date and place the customer chooses, printed on demand
with direct-to-garment (DTG) technology.

## Theme

"Wear the night you'll never forget." Customers pick a moment (a birthday, an
anniversary, a first meeting), a place, and the words they want to remember it
by. Stellara computes the positions of hundreds of real stars for that exact
moment and renders a custom star map, so no two shirts are alike.

## How it works

1. **Customize** — the customer enters a date, place, title, names and an
   optional message, and picks a shirt color and size.
2. **Live preview** — the star map is rendered server-side from a real star
   catalog (Hipparcos, magnitude ≤ 3.5) and shown before purchase.
3. **Pay** — checkout is handled by **Stripe** (Checkout Sessions).
4. **Print & ship** — only after Stripe confirms payment (via the
   `checkout.session.completed` webhook) is an order sent to **Prodigi**, which
   prints the shirt with DTG and ships it to the customer.

## Tech stack

- **Next.js 14** (App Router) on Vercel
- **Stripe** for payments (Checkout Sessions + webhooks)
- **Prodigi Print API** for DTG printing and fulfillment
- **@resvg/resvg-js** for server-side SVG → PNG rendering of the print file
- **OpenStreetMap Nominatim** for geocoding (with a built-in fallback)

## Project structure

```
src/
  app/
    page.tsx                 landing page
    customize/page.tsx       customization form + live preview
    success/page.tsx         post-checkout confirmation
    api/
      design/route.ts        renders the star map (SVG or PNG)
      geocode/route.ts       geocodes a place name to lat/lng
      checkout/route.ts      creates a Stripe Checkout Session
      webhook/route.ts       handles checkout.session.completed → Prodigi
  lib/
    astronomy.ts             Julian date, sidereal time, alt/az, projection
    starmap.ts               builds the star map SVG
    stars.ts                 bright star catalog (288 stars)
    constellations.ts        constellation line segments
    config.ts                product catalog, prices, validation
    geocode.ts               Nominatim client + fallback
    prodigi.ts               Prodigi order client
    stripe.ts                Stripe client + webhook verification
    url.ts                   base-URL helper
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key (test mode) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `PRODIGI_API_KEY` | Prodigi sandbox API key |
| `PRODIGI_LIVE` | Set to `"true"` to use the live Prodigi API (default: sandbox) |

## Local development

```sh
npm install
npm run dev
```

## Deploy

```sh
vercel --prod
```

Then set the environment variables in the Vercel project and register the
webhook endpoint (`https://<project>.vercel.app/api/webhook`) in Stripe for the
`checkout.session.completed` event.
