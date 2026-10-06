# Prodigi Print API — Practical Reference for a T-shirt Store

Compiled from official Prodigi documentation (developer.prodigi.com / prodigi.com/print-api/docs), the public Postman collection, and the published v4 blog post. All paths assume the current **v4.0** API.

Last verified against the live sandbox docs: October 2026.

---

## 1. Authentication

### Base URLs

| Environment | Base URL                                | Notes                                                            |
| ----------- | --------------------------------------- | ---------------------------------------------------------------- |
| Sandbox     | `https://api.sandbox.prodigi.com`       | **Does not fulfil orders, does not charge.** Use for development. |
| Live        | `https://api.prodigi.com`               | Fulfils and bills real orders.                                   |

All endpoints are prefixed with the version `/v4.0/`. There are no other version paths currently in use.

### Headers (every request)

```http
X-API-Key: <your-api-key>
Content-Type: application/json        # only on POST/PUT requests with a body
Accept: application/json               # optional but conventional
```

Example curl:

```bash
curl "https://api.sandbox.prodigi.com/v4.0/orders" \
  -X GET \
  -H "X-API-Key: $PRODIGI_API_KEY"
```

### Keys per environment

Sandbox and Live **use different credentials**. You cannot mix them — a sandbox key pointed at `api.prodigi.com` returns 401, and vice versa. Keys are created at:

* Live dashboard: `https://dashboard.prodigi.com` → Settings → Integrations → API → "Show API key"
* Sandbox dashboard: `https://sandbox-beta-dashboard.pwinty.com` (same login path)

Free accounts are created at `https://dashboard.prodigi.com/register`. Creating a Live account automatically provisions a linked Sandbox account.

### Auth example (live)

```bash
curl "https://api.prodigi.com/v4.0/orders?top=3" \
  -H "X-API-Key: live_live_live_abcdef..."
```

---

## 2. Product Catalog

There is **no single "list all products"** endpoint in v4. There are two ways to find products:

### 2a. Web catalogue (browse + SKU lookup)

* Live product pages: `https://www.prodigi.com/products/` — filter by category "Men's clothing → T-shirts" or "Women's clothing → T-shirts". Each product page lists its exact SKU.
* T-shirt category: `https://www.prodigi.com/products/mens-clothing/t-shirts/`
* Single SKU example: `https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-5000/`
* Full downloadable product portfolio PDF: `https://www.prodigi.com/download/product-range/prodigi-portfolio.pdf`
* Postman collection (hand-curated list of common SKUs): `https://postman.prodigi.com/`

### 2b. Product Details endpoint (authoritative)

**Endpoint:** `GET /v4.0/products/{sku}`

This is the canonical way to discover: valid attributes (colours/sizes), print areas, exact required pixel dimensions, and which countries the variant ships to.

```bash
curl "https://api.sandbox.prodigi.com/v4.0/products/GLOBAL-TEE-GIL-5000" \
  -H "X-API-Key: $PRODIGI_API_KEY"
```

Response (abridged, real-world shape for the Gildan 5000 t-shirt):

```json
{
  "outcome": "Ok",
  "product": {
    "sku": "GLOBAL-TEE-GIL-5000",
    "description": "Unisex Heavy Cotton T-shirt Gildan 5000",
    "productDimensions": {
      "width": "varies-by-size",
      "height": "varies-by-size",
      "units": "cm"
    },
    "attributes": {
      "color": [
        "White","Black","Orange","Sand","Gold","Daisy","Natural",
        "Military Green","Kiwi","Lime","Forest Green","Irish Green",
        "Turf Green","Dark Heather","Charcoal","Carolina Blue","Royal",
        "Light Blue","Navy","Heather Grey","Purple","Sport Grey","Azalea",
        "Maroon","Heliconia","Dark Chocolate","Safety Pink","Light Pink","Red"
      ],
      "size": ["S","M","L","XL","2XL","3XL","4XL","5XL","XS"]
    },
    "printAreas": {
      "default": { "required": true }
    },
    "variants": [
      {
        "attributes": { "color": "Black", "size": "S" },
        "shipsTo": ["GB","US","AU","DE", "..."],
        "printAreaSizes": {
          "default": { "horizontalResolution": 4677, "verticalResolution": 5787 }
        }
      }
      // ...one entry per (color × size) combination that ships to ≥1 country
    ]
  }
}
```

**Important details visible in this response:**

* `attributes.color` — list of valid colour names (28+ for Gildan 5000)
* `attributes.size` — list of valid sizes
* `variants[].shipsTo` — which ISO country codes each colour-size ships to (**lab availability varies** — a "Small, White" may only ship from a UK lab; a "5XL" may be unavailable everywhere)
* `variants[].printAreaSizes.default` — exact horizontal/vertical pixel resolution needed at 300 DPI

> Treat Product Details as the source of truth. Always look up the actual SKU before ordering; attribute keys and value lists differ per product.

### Common t-shirt / apparel SKUs

| Apparel model                     | Prodigi SKU                | Notes                                          |
| --------------------------------- | -------------------------- | ---------------------------------------------- |
| Gildan 5000 (unisex classic)      | `GLOBAL-TEE-GIL-5000`      | 29 colors, XS–5XL; ships from UK/EU/US/AU/CA/PL |
| Gildan 64000                      | `GLOBAL-TEE-GIL-64000`     | Soft-style                                       |
| Gildan 2400 (long sleeve)         | `GLOBAL-TEE-GIL-2400`      | Ships from EU/UK/US                             |
| Bella+Canvas 3001                 | `GLOBAL-TEE-BEL-3001`      | Unisex                                           |
| Bella+Canvas 3501 (long sleeve)   | `GLOBAL-TEE-BEL-3501`      |                                                  |
| Bella+Canvas 6004 (women's)       | `GLOBAL-TEE-BEL-6004`      |                                                  |
| AS Colour 5001                    | `GLOBAL-TEE-ASC-5001`      | 4 monochrome shades                             |
| LAT Apparel 3322 (baby)           | `GLOBAL-TEE-LAT-3322`      | Kids                                             |

> SKU pattern is `GLOBAL-TEE-{brand-code}-{model}`. **Always verify with `GET /v4.0/products/{sku}` first** — these prefixes can change without notice.

---

## 3. Order Endpoint

### Endpoint

`POST /v4.0/orders`

The body is a single **Order object**.

### Order object — full minimum shape (t-shirt example)

```bash
curl "https://api.sandbox.prodigi.com/v4.0/orders" \
  -X POST \
  -H "X-API-Key: $PRODIGI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingMethod": "Standard",
    "recipient": {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phoneNumber": "+15551234567",
      "address": {
        "line1": "123 Main St",
        "line2": "Apt 4",
        "postalOrZipCode": "94110",
        "countryCode": "US",
        "townOrCity": "San Francisco",
        "stateOrCounty": "CA"
      }
    },
    "items": [
      {
        "sku": "GLOBAL-TEE-GIL-5000",
        "copies": 1,
        "sizing": "fillPrintArea",
        "attributes": {
          "color": "Black",
          "size": "M"
        },
        "recipientCost": {
          "amount": "25.00",
          "currency": "USD"
        },
        "assets": [
          {
            "printArea": "default",
            "url": "https://your-cdn.example.com/designs/design-abc.png",
            "md5Hash": "d41d8cd98f00b204e9800998ecf8427e"
          }
        ]
      }
    ],
    "metadata": {
      "cartId": "cart_2026-10-06_001",
      "customerId": "cust_12345"
    }
  }'
```

### Top-level field reference

| Field             | Type     | Required | Notes                                                                                  |
| ----------------- | -------- | -------- | -------------------------------------------------------------------------------------- |
| `shippingMethod`  | string   | **yes**  | One of: `Budget`, `Standard`, `StandardPlus`, `Express`, `Overnight` (capitalisation variants accepted in different surfaces; stick to PascalCase in the API.) |
| `idempotencyKey`  | string   | no       | Your unique GUID. **Strongly recommended** to avoid double-charging on retry.         |
| `merchantReference` | string | no       | Your own reference (free-form). Not used for dedupe — use `idempotencyKey` for that. |
| `callbackUrl`     | string   | no       | Per-order webhook URL. Falls back to global setting in dashboard.                       |
| `recipient`       | object   | **yes**  | See below.                                                                              |
| `items[]`         | array    | **yes**  | At least one item.                                                                      |
| `metadata`        | object   | no       | Up to 2000 chars of free-form JSON.                                                     |
| `branding`        | object   | no       | Postcards, flyers, packing slips, stickers.                                             |
| `packingSlip`     | object   | no       | `{ "url": "..." }`                                                                      |

### Recipient object

| Field         | Required | Notes                                                                    |
| ------------- | -------- | ------------------------------------------------------------------------ |
| `name`        | **yes**  | Truncated to fit courier guidelines.                                     |
| `email`       | strongly recommended | Critical for international shipments; cleared from customs.   |
| `phoneNumber` | strongly recommended | Same reason.                                                    |
| `address.line1`     | **yes** |                                                                 |
| `address.line2`     | no      |                                                                 |
| `address.townOrCity`| **yes** |                                                                 |
| `address.stateOrCounty` | no, but required for US/CA/AU |                                                        |
| `address.postalOrZipCode` | **yes**|                                                                       |
| `address.countryCode` | **yes** | Two-letter ISO 3166-1 alpha-2 (e.g. `US`, `GB`, `DE`).              |

### Item object (t-shirt specific)

| Field            | Required | Notes                                                                                                          |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `sku`            | **yes**  | Prodigi SKU, e.g. `GLOBAL-TEE-GIL-5000`.                                                                       |
| `copies`         | **yes**  | Integer quantity.                                                                                              |
| `sizing`         | **yes**  | One of: `fillPrintArea` (default; crop to aspect), `fitPrintArea` (letterbox), `stretchToPrintArea` (squash). PNG/JPEG are rotated/resized; PDF prints at native size. |
| `attributes`     | varies   | For t-shirts: `{"color": "Black", "size": "M"}`. Other apparel may use `style`, `gender`, etc. Get exact keys from Product Details. |
| `assets[]`       | **yes**  | One element per print area.                                                                                    |
| `recipientCost`  | no, but recommended | `{ "amount": "25.00", "currency": "USD" }` — helps customs declarations.                         |
| `merchantReference` | no   | Your per-item reference.                                                                                       |

### Asset object (inside `items[].assets[]`)

| Field        | Required | Notes                                                                                       |
| ------------ | -------- | ------------------------------------------------------------------------------------------- |
| `printArea`  | **yes**  | `"default"` for the front of a t-shirt. Other possible areas: `"back"`, `"spine"`, `"lid"`. |
| `url`        | **yes**  | Publicly downloadable URL. **No base64, no data URIs.** Prodigi servers must `GET` it directly. |
| `md5Hash`    | no       | If supplied, Prodigi verifies the downloaded bytes match. Defensive integrity check.        |
| `pageCount`  | no       | Only required for photobooks/magazines. T-shirts ignore it.                                 |

### Multi-asset products (e.g. shirt printed on front AND back)

If a SKU supports back prints (extra-cost `printArea`), include both:

```json
"assets": [
  { "printArea": "default", "url": "https://...front.png" },
  { "printArea": "back",    "url": "https://...back.png"  }
]
```

Exact available print areas come from `GET /products/{sku}` (the `printAreas` and `variants[].printAreaSizes` fields).

### Response

```json
{
  "outcome": "Created",
  "order": {
    "id": "ord_840797",
    "created": "2021-03-11T14:40:05.12Z",
    "lastUpdated": "2021-03-11T14:40:05.201Z",
    "merchantReference": "cart_2026-10-06_001",
    "shippingMethod": "Standard",
    "idempotencyKey": null,
    "status": {
      "stage": "InProgress",
      "issues": [],
      "details": {
        "downloadAssets": "NotStarted",
        "printReadyAssetsPrepared": "NotStarted",
        "allocateProductionLocation": "NotStarted",
        "inProduction": "NotStarted",
        "shipping": "NotStarted"
      }
    },
    "charges": [],
    "shipments": [],
    "recipient": { "...": "..." },
    "items": [
      {
        "id": "ori_926887",
        "status": "NotYetDownloaded",
        "sku": "GLOBAL-TEE-GIL-5000",
        "copies": 1,
        "sizing": "fillPrintArea",
        "attributes": { "color": "Black", "size": "M" },
        "assets": [
          {
            "id": "ast_114059",
            "printArea": "default",
            "status": "InProgress",
            "url": "https://your-cdn.example.com/designs/design-abc.png"
          }
        ]
      }
    ]
  },
  "traceParent": "00-f68685c43545e048bc44d9bc8239d59a-967255597477ac40-00"
}
```

### Outcomes you may receive on POST

| `outcome` value         | HTTP | Meaning                                                              |
| ----------------------- | ---- | -------------------------------------------------------------------- |
| `created`               | 200  | Order created and started fulfilment (or queued for pause window).   |
| `onHold`                | 200  | Order created but account has a pause window — modify via dashboard. |
| `createdWithIssues`     | 200  | Created but with warnings (e.g. US sales tax).                       |
| `alreadyExists`         | 200  | Same `idempotencyKey` was used before; the existing order is returned. |
| `validationFailed`      | 400  | Body was malformed or a required field missing.                      |

### Variant SKU construction (colour + size codes)

There is **one** Prodigi SKU per garment model — e.g. `GLOBAL-TEE-GIL-5000` covers every colour/size combination for that shirt. You do **not** assemble colour/size into the SKU itself. You pick the SKU once and pass the variant as **`items[].attributes`**:

```json
"sku": "GLOBAL-TEE-GIL-5000",
"attributes": { "color": "Black", "size": "M" }
```

The colour/size *values* must match entries in the SKU's `attributes` block returned by `GET /products/{sku}`. (The exact labels — `Black` vs `black`, `M` vs `Medium` — are case-sensitive as defined by Prodigi; the Product Details endpoint returns the canonical spelling.)

---

## 4. Asset Requirements

### Accepted file formats

The Print API accepts **JPG, PNG, and PDF** only. For apparel and devices, **PNG** is strongly preferred because it preserves transparency.

(Prodigi's wider web pipeline also supports some additional formats, but the **API contract is JPG / PNG / PDF only.**)

### Resolution / DPI

For DTG (direct-to-garment) printing, **300 DPI at the final print size** is the standard target. The exact pixel dimensions needed for a given SKU come from:

```
GET /v4.0/products/{sku}  →  variants[].printAreaSizes.default.{horizontalResolution, verticalResolution}
```

For the Gildan 5000 the API returns `4677 × 5787` pixels for the default print area (front of the shirt for adult sizes). Example scaling math for other sizes:

```
15" wide  × 300 DPI  = 4500 px
20" tall  × 300 DPI  = 6000 px
```

### Aspect ratio / print-area dimensions for a standard t-shirt

| Garment                | Print area (px @ 300 DPI) | Approx. inches |
| ---------------------- | ------------------------- | -------------- |
| Gildan 5000 (front, default) | 4677 × 5787          | ~15.6 × 19.3   |
| Gildan 5000 (back, supplementary) | varies           | varies          |

Always read `printAreaSizes.default` from the Product Details endpoint for the SKU you're actually selling — pixel sizes vary by SKU and (in rare cases) by colour/size combination.

### Print location (front / back / etc.)

Set the `printArea` field on each asset in `items[].assets[]`:

* `"default"` — main / front of the garment (some products call this `"front"`).
* `"back"` — large back canvas (extra-cost on many apparel SKUs; check the product page).

You cannot use a print area that the SKU doesn't support — `GET /products/{sku}` returns the full set in `printAreas`.

### Asset URL — public vs signed vs base64

**Required: a full publicly-fetchable URL.** Prodigi's fulfilment cluster performs an HTTP `GET` on the URL server-side; it must be reachable from Prodigi's infrastructure without human interaction.

* **Public URLs** (`https://cdn.example.com/...`) — fine, this is the normal case.
* **Signed/expiring URLs** (e.g. S3 pre-signed, CloudFront signed) — also fine, **as long as they remain valid for the full retry window**. Prodigi retries failed downloads up to 10 times; if the URL expires mid-retry, the order is rejected.
* **Base64 / data URIs** — **not supported**. There is no `data:` field; the `url` field must be a real URL Prodigi can `GET`.

> **Practical advice:** host your design files on S3/CloudFront/GCS with a **24–48 hour** expiry window to prevent stale links from breaking fulfilment.

### Image retention

After a successful order, Prodigi retains the downloaded assets for up to **30 days** (sometimes cited as "two weeks" for the public FAQ). After that, the file is deleted. Re-submitting the same order after expiry requires the URL to still be valid.

### Quality validation

Prodigi does **not** rescale PDFs — they print at native size — so PDFs should already be sized to the desired print area. PNG and JPEG are rotated and (per `sizing` mode) cropped/fitted.

---

## 5. Webhooks / Callbacks

**Yes.** Prodigi pushes CloudEvents v1.0 compliant webhooks to either:

* a **global "callback URL"** configured in your Prodigi dashboard (Settings → Webhooks / API), or
* a **per-order `callbackUrl`** set in the Order payload.

### Setup

* Global default: Dashboard → Settings → developer section.
* Per-order override: `"callbackUrl": "https://your-server.example.com/prodigi-webhook"` in POST /v4.0/orders body.

### When callbacks fire

Three lifecycle moments produce webhooks:

1. **Order creation** — after the order is submitted.
2. **Shipment made** — when items are dispatched.
3. **Order completion** — when all shipments have shipped (success or failure).

The detailed v4 sequence also fires a callback on:
* Asset download completion (`com.prodigi.order.status.details.downloadAssets.complete` flavour).

### Webhook payload (CloudEvents v1.0)

```json
{
  "specversion": "1.0",
  "type": "com.prodigi.order.status.stage.changed#InProgress",
  "source": "https://api.prodigi.com/v4.0/Orders/",
  "id": "evt_305174",
  "time": "2020-08-14T11:51:01.55Z",
  "datacontenttype": "application/json",
  "subject": "ord_1469466",
  "data": {
    "id": "ord_1469466",
    "created": "2020-08-14T11:50:54.557Z",
    "status": {
      "stage": "InProgress",
      "issues": [],
      "details": {
        "downloadAssets": "InProgress",
        "printReadyAssetsPrepared": "NotStarted",
        "allocateProductionLocation": "NotStarted",
        "inProduction": "NotStarted",
        "shipping": "NotStarted"
      }
    },
    "charges": [],
    "shipments": [],
    "recipient": { "...": "..." },
    "items": [ { "...": "..." } ]
  }
}
```

### Important behavioural details

* The HTTP method is **POST**. The `data` object is the **complete Order object** (not a deltas).
* `status.stage` is one of `InProgress`, `Complete`, `Cancelled`. Sub-progress is in `status.details.*` with values `NotStarted`, `InProgress`, `Complete`, `Error`.
* The `type` fragment after `#` is **the new stage value**, e.g. `#Complete`, `#Cancelled`. Filtering on `com.prodigi.order.status.stage.changed#Complete` tells you "this order finished".
* Each event has a unique `id` prefixed `evt_`.
* Webhooks are queued — `time` may differ from delivery time.
* There is **no retry with exponential backoff publicly documented**; webhooks can be missed. Treat them as a hint and reconcile by polling `GET /orders/{id}` periodically.
* There is **no documentated signature header**; the URL is the only protection (use a hard-to-guess path or a query token).

### Verifying a webhook

`GET /v4.0/orders/{order_id}` and compare against what the webhook says.

---

## 6. Pricing

Use the **Quote** endpoint — it returns product unit cost + shipping cost per available shipping tier, broken down by lab and courier, without actually creating an order.

### Endpoint

`POST /v4.0/quotes`

### Request

```bash
curl "https://api.sandbox.prodigi.com/v4.0/quotes" \
  -X POST \
  -H "X-API-Key: $PRODIGI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "destinationCountryCode": "US",
    "currencyCode": "USD",
    "items": [
      {
        "sku": "GLOBAL-TEE-GIL-5000",
        "copies": 2,
        "attributes": { "color": "Black", "size": "M" },
        "assets": [{ "printArea": "default" }]
      }
    ]
  }'
```

| Top-level field           | Required | Notes                                                                   |
| ------------------------- | -------- | ----------------------------------------------------------------------- |
| `destinationCountryCode` | **yes**  | 2-letter ISO. Whether a (colour,size) variant ships here is SKU-specific. |
| `currencyCode`            | no       | 3-letter ISO 4217. Defaults to your account currency.                   |
| `shippingMethod`          | no       | If omitted, you get a quote for *every* tier (`budget`,`standard`,`standardplus`,`express`,`overnight`). If supplied, you get only that tier. |
| `items[]`                 | **yes**  | Same shape as Order items, but `assets[]` only needs `printArea` (no URL needed). |

### Response

```json
{
  "outcome": "Ok",
  "quotes": [
    {
      "shipmentMethod": "Standard",
      "costSummary": {
        "items":     { "amount": "13.72", "currency": "USD" },
        "shipping":  { "amount": "4.50",  "currency": "USD" }
      },
      "shipments": [
        {
          "carrier": { "name": "USPS", "service": "Priority" },
          "fulfillmentLocation": { "countryCode": "US", "labCode": "us11" },
          "cost": { "amount": "4.50", "currency": "USD" },
          "items": ["qit_..."]
        }
      ],
      "items": [
        {
          "id": "qit_...",
          "sku": "GLOBAL-TEE-GIL-5000",
          "copies": 2,
          "unitCost": { "amount": "6.86", "currency": "USD" },
          "attributes": { "color": "Black", "size": "M" },
          "assets": [{ "printArea": "default" }]
        }
      ]
    },
    { "shipmentMethod": "Express",     "...": "..." },
    { "shipmentMethod": "Overnight",   "...": "..." }
  ]
}
```

Key fields:

* **`costSummary.items`** — total *production* cost across all items.
* **`costSummary.shipping`** — total shipping cost.
* **`items[].unitCost`** — per-unit production cost (so 2 × copies × unitCost).
* **`shipments[]`** — split if items come from multiple labs.

The Quote endpoint is also a **validation tool**: if a SKU doesn't exist, an attribute is invalid for that SKU, or no variant ships to the destination, you get a `validationFailed` outcome — fail fast before you try POST /orders.

> Live prices and sandbox prices are usually the same but not guaranteed. If you see drift, the Live environment is authoritative.

---

## 7. Order Status

### Single order by ID

`GET /v4.0/orders/{prodigi_order_id}`

```bash
curl "https://api.sandbox.prodigi.com/v4.0/orders/ord_840797" \
  -H "X-API-Key: $PRODIGI_API_KEY"
```

Returns the full Order object including the same `status` block described in section 5.

### List orders (filter / paginate)

`GET /v4.0/orders`

| Query param         | Type      | Default | Notes                                                                                |
| ------------------- | --------- | ------- | ------------------------------------------------------------------------------------ |
| `top`               | int       | 10      | 1–100 page size.                                                                     |
| `skip`              | int       | 0       | Offset.                                                                              |
| `createdFrom`       | ISO 8601  |         | Inclusive lower bound on `created`.                                                  |
| `createdTo`         | ISO 8601  |         | Inclusive upper bound on `created`.                                                  |
| `status`            | enum      |         | One of: `draft`, `awaitingPayment`, `inProgress`, `complete`, `cancelled`.           |
| `orderIds[]`        | array     |         | Specific Prodigi order IDs (`ord_...`).                                              |
| `merchantReferences[]` | array  |         | Filter by your own merchant references.                                              |

```bash
curl "https://api.sandbox.prodigi.com/v4.0/orders?top=20&status=inProgress&createdFrom=2026-10-01T00:00:00Z" \
  -H "X-API-Key: $PRODIGI_API_KEY"
```

Response (paginated):

```json
{
  "outcome": "Ok",
  "orders": [ { "...full order object..." }, { "...": "..." } ],
  "hasMore": true,
  "nextUrl": "https://api.sandbox.prodigi.com/v4.0/Orders?Skip=20"
}
```

### Status / detail semantics

Top-level `status.stage`:
* `InProgress` — submitted, being processed.
* `Complete` — all shipments dispatched.
* `Cancelled` — cancelled before/during fulfilment.

Granular `status.details.*` (each is `NotStarted`/`InProgress`/`Complete`/`Error`):

| Detail key                    | Meaning                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| `downloadAssets`              | Prodigi pulling your image URLs into their system.                       |
| `printReadyAssetsPrepared`    | Asset conversion to lab-ready pre-press files.                           |
| `allocateProductionLocation` | Lab being picked globally (best proximity/cost).                         |
| `inProduction`                | Physical printing/manufacture at the lab.                                |
| `shipping`                    | Despatched from the lab to the customer.                                 |

### Shipment sub-objects

The Order contains a `shipments[]` array. Each shipment has:

```json
{
  "id": "shp_456456",
  "status": "Shipped",          // "Processing" | "Cancelled" | "Shipped"
  "carrier": { "name": "USPS", "service": "Priority" },
  "dispatchDate": "2026-10-10T13:24:00Z",
  "items": [ { "itemId": "ori_926887" } ],
  "tracking": {
    "url": "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400...",
    "number": "9400111899223456789012"
  },
  "fulfillmentLocation": { "countryCode": "US", "labCode": "us11" }
}
```

Polling this is the canonical way to find out when an order actually shipped and where.

---

## 8. Practical checklist for the t-shirt store integration

1. **Sign up** at dashboard.prodigi.com; copy the **sandbox** API key first.
2. **Look up the SKU** before quoting: `GET /products/GLOBAL-TEE-GIL-5000` → grab colour list, size list, required pixel dimensions.
3. **Pre-flight with the Quote endpoint** (`POST /quotes`) using your customer destination — confirms (a) the SKU/attribute combo is valid, (b) the destination is served, (c) shows you the live unit + shipping cost.
4. **Host your design files** on a CDN/object store with a publicly fetchable URL valid for ≥ 24 hours. PNG at the variant's pixel resolution (e.g. 4677×5787 for Gildan 5000 default).
5. **POST `/orders`** with the Order payload, **including `idempotencyKey`** (UUID) on every submission to avoid double-prints from retries.
6. **Subscribe to webhooks** by setting a `callbackUrl` per-order (or globally). Implement an endpoint that accepts POST CloudEvents and updates your DB based on `status.stage` and the per-stage `status.details.*` transitions.
7. **Reconcile via polling** on a 15-30 min cadence — webhook delivery is not guaranteed in v4 docs.
8. **Switch to Live** by swapping base URL **and** API key simultaneously. Same paths, same shape — the only differences are the credentials and the side effects (charges, fulfilment, shipment emails).

---

## 9. Useful endpoints cheat-sheet (sandbox, all under `/v4.0/...`)

| Verb  | Path                                                | Purpose                              |
| ----- | --------------------------------------------------- | ------------------------------------ |
| GET   | `/orders`                                           | List orders with optional filters.   |
| POST  | `/orders`                                           | Create an order.                     |
| GET   | `/orders/{id}`                                      | Fetch one order.                     |
| GET   | `/orders/{id}/actions`                              | Check what actions are available (cancel, update recipient, update shipping, update metadata). |
| POST  | `/orders/{id}/actions/cancel`                       | Cancel an order (before fulfilment). |
| POST  | `/orders/{id}/actions/updateShippingMethod`         | Change shipping tier.                |
| POST  | `/orders/{id}/actions/updateRecipient`              | Update recipient address/phone.      |
| POST  | `/orders/{id}/actions/updateMetadata`               | Patch metadata JSON.                 |
| POST  | `/quotes`                                           | Price a basket (no commitment).      |
| GET   | `/products/{sku}`                                   | Full product schema.                 |
| POST  | `/products/spine`                                   | Photobook spine width — *not used for t-shirts. |

---

## 10. Common pitfalls (from the docs, FAQ, and integration reports)

* **Asset URLs expiring mid-retry** — fetch them from your store onto stable storage, not from expiring signed URLs.
* **Wrong attribute keys** — `"colour"` instead of `"color"`, or `L` instead of `Large` — Prodigi returns 400 with a precise error.
* **Missing `sizing`** — orders without a sizing strategy are rejected outright.
* **Mixing sandbox + live** — a live key on the sandbox URL succeeds but produces an order that **does not exist**; a sandbox key on the live URL returns 401. Always set both base URL *and* key together.
* **Sandbox orders never arrive** — by design; sandbox doesn't ship. Check via `GET /orders/{id}` only.
* **Manual order-approval accounts** — submitted orders stay invisible (`entityNotFound`) until a human releases them in the dashboard. Treat 404 as ambiguous.
* **Tax idempotencyKey** vs `merchantReference` — only `idempotencyKey` deduplicates. `merchantReference` is free-form.

---

## 11. Source URLs

* Reference: https://www.prodigi.com/print-api/docs/reference/
* Guides index: https://www.prodigi.com/print-api/docs/
* First-order tutorial: https://www.prodigi.com/blog/your-first-print-api-order/
* V4 announcement: https://www.prodigi.com/blog/announcing-prodigi-print-api-v4/
* Image FAQ: https://www.prodigi.com/faq/images/
* API FAQ: https://www.prodigi.com/faq/print-api/
* Postman collection: https://postman.prodigi.com/
* Product catalogue: https://www.prodigi.com/products/
* Gildan 5000 page: https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-5000/
* Portfolio PDF: https://www.prodigi.com/download/product-range/prodigi-portfolio.pdf
