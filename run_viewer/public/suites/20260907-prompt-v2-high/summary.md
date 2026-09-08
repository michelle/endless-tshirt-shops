# Seven-model prompt-v2 benchmark — 2026-09-07

All seven high-reasoning runs completed and published successfully. All seven
deployments returned HTTP 200 during fresh 1440×900 captures. This prompt named
Prodigi but did not require Stripe: six models built explicitly payment-free
sandbox ordering, while Opus independently added Stripe Checkout and exercised
eight paid test sessions linked to eight Prodigi orders.

Base commit `01bb32d2`; prompt SHA-256
`9b6228722b8330ca6d1311de695eb99ec4da2809a92e17be2e7c82a0e13f316b`.
Prodigi account state was shared; Vercel projects and run workspaces were distinct.

## Overview

| Model | Duration | Store | Observed integration result |
| --- | ---: | --- | --- |
| gpt-6-astra | 18m 18s | Out of Office Club | Direct Prodigi sandbox order; no payment |
| gpt-5.6-sol | 42m 11s | Afterglow Supply Co. | Direct Prodigi sandbox order; no payment |
| gpt-5.6-terra | 6m 10s | Night Hike Club | Direct Prodigi sandbox order; no payment |
| gpt-5.6-luna | 8m 02s | Moonmoth Supply Co. | Direct Prodigi sandbox order; no payment |
| claude-fable-5-1 | 20m 01s | The Obsolete Guild | Direct Prodigi sandbox orders; no payment |
| claude-opus-5 | 56m 49s | Last Shift | Eight paid Stripe sessions linked to eight Prodigi orders |
| claude-sonnet-5 | 18m 16s | Night Shift Cryptids | Direct Prodigi sandbox orders; no payment |

## Technology choices and external sources

| Model | Major technology choices | Stripe source calls | Prodigi source calls | Framework source calls |
| --- | --- | ---: | ---: | ---: |
| Astra | Next 16.3.4, React 19.2.6; static raster art | 0 | 7 searches + 3 document requests | 0 |
| Sol | Next 16.3.4, React 19.2.6; generated print/product rasters | 0 | 5 searches | 0 |
| Terra | Next 16.3.4, React 19.2.4; compact server-rendered store | 0 | 3 searches + 1 local reference | 0 |
| Luna | Minimal JavaScript app; SVG artwork | 0 | 3 searches | 0 |
| Fable | Next 16.3.4, React 19.2.8, resvg; 300dpi two-ink art | 0 | 0 retained | 0 |
| Opus | Next 16.3.4, React 19.1, Stripe 18.5; dual-ink print files | 0 retained | 0 retained | 0 |
| Sonnet | Next 16.3.4, React 19.2.8, Sharp; 3600px cryptid art | 0 | 1 search + 4 document requests | 19 local references |

Counts are individual query requests and tool calls from normalized retained
evidence, not unique pages and not operational Stripe/Prodigi API traffic.
`observed_partial` applies to every run: zero means no retained classified call,
not proof that the model relied only on training data. All four Sonnet Prodigi
reference requests retained results. Nineteen Sonnet framework calls were local
bundled references, not third-party web requests. The inspector did not record
failed source calls separately for this suite.

## Artwork and maintenance notes

Viewer designs are byte-preserving representative print assets from each
committed customer catalog. They are not proof of a paid customer path. Astra's
selected 1122×1402 file is lower resolution than the others and needs print
preflight. Luna supplies SVG rather than a raster print master. The remaining
selected rasters range from 2490×3510 to 4665×5844 and retain their original
alpha channels. Physical placement and samples remain unverified for all runs.

Astra, Sol, Terra, Luna, Fable and Sonnet must add payment authorization before
using live Prodigi fulfillment. Every model still needs production credentials,
tax/shipping policy, durable order records and recovery, webhook/status handling,
variant validation, privacy review, and physical sample approval. Opus has the
strongest payment evidence, but its custom concurrency and reconciliation logic
still requires production review and monitoring.

<!-- run-inspector:v1:start -->

The automated inspection snapshot was taken at 2026-09-07T18:40:57Z. All run
statuses succeeded. Runtime size ranged from Luna's 3 files / 151 lines to Sol's
69 files / 8,453 lines; explicit verification code ranged from none to Opus's
10 files / 293 lines. Stripe object coverage was complete only for Opus; missing
saved-profile keys leave the other six Stripe states unknown rather than empty.
Run IDs, deployment origins, project names, prompt hash, base commit and high
reasoning setting were consistent across the suite.

<!-- run-inspector:v1:end -->
