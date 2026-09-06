# Benchmark run viewer

A deliberately simple viewer for the beauty, minimal, and unserious benchmark
suites. The newest imported suite is the default.

It shows every recovered design for the selected suite at once, includes all 21
agent final responses, and renders all seven generated suite summaries as rich
Markdown. The shared artwork background color can be changed to inspect
transparency without altering image placement.

All suite reports live at `public/suites/<suite-id>/summary.md`. Suites with
recovered run artifacts use
`public/suites/<suite-id>/runs/<run-id>/{final.md,design.*}`. The archive also
contains the four earlier generated suite reports in the same layout.

The main image represents the customer ordering path. Prefer the asset from an
actual paid order; otherwise show recorded customer Session artwork or an exact
deterministic reproduction with its unverified provenance clearly labeled.
Minimal Sol now shows `paid-design.png`, the exact deployed asset from a user's
post-run paid order, hash-matched to Prodigi; its earlier local reconstruction
remains archived but is no longer displayed. This revealed a real production
rendering defect hidden by local reproduction. Beauty Sonnet shows its unpaid
Session design. Separate smoke-test assets (Sol's social image and
Sonnet's icon) remain archived as `submitted.png`, not as substitutes for
customer-path art. Those tests do not prove that the customer flow submits the
wrong file. Artwork quality and verified fulfillment are separate checks.

Minimal Sonnet also uses a hash-verified post-run `paid-design.png`. Minimal
Luna uses `session-design.png` from a later paid checkout's hosted artwork URL,
clearly labeled not delivered: the shipping-address bug prevented fulfillment.
Manual follow-up findings appear in the suite report without rewriting the
original benchmark's payment history.

The beauty, minimal, and unserious suites also include `storefront.png` and, where published,
`favicon.*` beside each run's artwork. These are fresh 1440 × 900 desktop
viewport captures of the deployed homepages, not screenshots from the original
benchmark. `public/suites/<suite-id>/storefronts.json` records the
capture time, page URL/title, response status, favicon source, and observed
page errors. The viewer discovers this file by suite ID; no per-suite screenshot
imports or component changes are required. Absent captures leave artwork and
reports available. Missing icons and icons that could not be downloaded are
distinguished. Inline data-URL favicons are archived too.

Run drawers also show archived `social-preview.*` images from the deployed
page's `og:image` (or `twitter:image` fallback). These are the actual published
files, not recreated artwork. The manifest records their source, dimensions,
capture time, and found/missing/unavailable status. A social card is separate
from the customer's print artwork. New suite captures collect these automatically.

Click a card's screenshot or Details to open the run drawer. The large screenshot
inside the drawer opens the live storefront in a new tab, as does the storefront link at the top.
Use Left/Right or h/l
to navigate within the selected suite; j/k scroll down/up and Escape closes it.
With the drawer closed, j/k scroll the main page instead.
On touchscreens, swipe left/right inside the drawer for the next/previous run.
Only deliberate horizontal swipes navigate; vertical scrolling, pinch zoom,
screen-edge gestures, text links, controls, and scrollable tables/code remain
native. Screenshot taps still open the storefront; swiping one changes runs.
Navigation stops at the first/last model. Touch controls have larger hit areas;
desktop density and main-page vertical scrolling are unchanged.
The arrow buttons show navigation shortcuts in their tooltips. Shortcuts ignore
text inputs, editable content, composition, and modifier keys. Hover
or focus a status (or tap its question mark) for plain-English definitions.

Ratings use three independent checks: printable timestamp-only art, genuine
end-to-end test checkout, and working app-to-Prodigi fulfillment with the intended
asset and garment mapping. Green means 3/3, yellow 2/3, red 0–1/3. Missing evidence
does not pass, but is labeled `unverified` rather than a demonstrated failure.
Branding, slogans, illustrations, and decorative graphics fail timestamp-only
art. Print quality is scored separately from successful asset delivery, so a
working integration that delivers an undersized image loses the artwork check.
Hover/focus the rating for reasons, or read all three in the run drawer. These
are archived sandbox assessments, not current uptime or launch certification.
Record future audit judgments in `app/ratings.ts`; unreviewed runs default to
three unverified checks. `npm run test:ratings` verifies the scoring.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Use `npm run lint` and `npm test` for validation.

Link directly to a suite with `?suite=20260905-beauty-high` or
`?suite=20260905-minimal-high`. Choosing a suite updates the URL without reloading;
browser Back/Forward restores the selection. Missing or unknown IDs show the
default suite. The query works on localhost and under the GitHub Pages subpath.
Add `&run=sol` (or another short run ID) to open a particular drawer directly.
Opening and navigating drawers updates the URL; refresh and Back/Forward preserve
the selected run. The drawer's Copy permalink button copies the direct URL
and briefly confirms success. If clipboard access fails, copy the browser address.
Every summary heading is a link with a stable `#summary-…` fragment; copy its
link address to share that section, including the selected suite.

With the local viewer running, `npm run test:keyboard` checks keyboard navigation,
focus at the first/last run, and drawer scrolling. Set `VIEWER_URL` if the server
uses a different URL, and `CAPTURE_BROWSER=chrome` to test with installed Chrome.
After `npm run build:pages`, `npm run test:mobile` checks phone layouts and
browser-dispatched touch input, including swipe boundaries, vertical/table
scrolling, multi-touch, cancellation, and screenshot taps. It also runs before
automatic Pages deployments. Physical iOS/Android testing is still worthwhile.

## Before pushing or deploying

Run `npm run predeploy` from `run_viewer` (Node 22.13+). It runs lint, fixed
permalink compatibility tests, registry-driven archive checks, ratings and
heading tests, a clean static build, HTTP asset checks, and browser/mobile tests.
The Pages workflow runs the same gate before uploading a deployment artifact.
Use `CAPTURE_BROWSER=chrome` for installed Chrome, or install Chromium with
`npx playwright install chromium` once.

Install the local push gate once per clone:

```bash
cd run_viewer
npm run hooks:install
```

The installer refuses to overwrite an existing hook configuration. The hook
checks the **exact commit being pushed** in a temporary directory with clean
dependencies, not the working tree: an untracked summary cannot hide a missing
committed file. It blocks branch pushes that change the viewer or its gate if
validation fails. Deletions, unchanged viewer trees, and `benchmark-results`
artifact pushes are skipped, so sequential model runs continue normally.
The hook uses Node 22 through `npx`, and detects installed macOS Chrome. First
use may download Node/dependencies; missing browser setup or network failures
fail closed. Git hooks are local and can be bypassed; CI remains the mandatory
pre-deployment check. No external storefront/payment endpoints are exercised.

`tests/fixtures/permalinks-v1.json` freezes published suite IDs, short model IDs,
and summary fragments. Add new destinations after publishing; never remove old
entries merely to make a failing test pass. Renamed headings need compatibility
aliases. Tests cold-load historical URLs and confirm the intended drawer or
heading, as well as checking the literal `?suite=…&run=…#summary-…` contract.

Archive validation follows every registry reference, including summary-only
older suites and each capture manifest. Summary, final output, design,
screenshot and declared favicon/social files must be nonempty and publishable.
Explicit missing/unavailable icons or social cards are allowed; a declared file
that is absent is not. Every published archive file is then fetched from the
production build: HTTP 404, HTML fallback disguised as HTTP 200, and wrong bytes
all fail. This checks the release candidate, not availability after a remote
hosting outage.

## Capture a suite

Write the suite's `summary.md`, final outputs, and recovered artwork before
registering it so an open local viewer cannot fetch a missing summary. Then
register the suite and its runs in `app/data.ts`, including public `deployment`
URLs and `finalOutput` paths under `public/suites/<suite-id>/runs/<run-id>/`.
Then, from `run_viewer`, run:

```bash
npx playwright install chromium
npm run capture -- --suite 20260905-minimal-high
```

Use `--browser chrome` to use an installed Google Chrome instead. The command
opens isolated browser contexts with a 1440 × 900 viewport, 1× pixel density,
light color preference, US English, and America/Los_Angeles timezone. It waits
for fonts and images (up to ten seconds), captures only the initial viewport,
and never clicks checkout controls. Dynamic timestamps reflect capture time.

Existing captures are preserved by default. Retry failed/missing runs with the
same command, select one with `--run <run-id>`, or deliberately refresh using
`--overwrite`. Each successful run updates the manifest atomically.
Use `--social-only --overwrite` to refresh just social previews without changing
the original screenshots or favicon capture metadata. Older manifests missing
social previews are backfilled automatically without recapturing screenshots.
Navigation failures are recorded in `capture-errors.json`; the command continues with other
runs and exits nonzero if any capture failed. HTTP error pages are captured with
their actual response status. Refresh the viewer after capturing (or reselect
the suite). Existing beauty artifacts are preserved when capturing minimal.

`npm run test:capture` exercises the reusable capture workflow against a local
fixture suite, including inline icons, missing icons, retries, and failed refreshes.
It requires Chromium, or `CAPTURE_BROWSER=chrome npm run test:capture` for Chrome.

## GitHub Pages

The Pages build is static React: no Worker, API server, or hosting credentials.
Local development above still works unchanged.

```bash
npm run build:pages
npm run preview:pages -- --port 4174
```

Open `http://localhost:4174/endless-tshirt-shops/`. `VIEWER_BASE_PATH` overrides
the default `/endless-tshirt-shops/` prefix (use `/` for a custom domain).
`npm run test:pages` checks redaction, exact image bytes, all three suites, Markdown,
downloads, and browser asset loading against the built static site.
Use `CAPTURE_BROWSER=chrome` if testing with installed Chrome.

To enable deployment, select **Settings → Pages → Build and deployment → Source:
GitHub Actions** in the repository. Push this configuration to `main`, or run
**Deploy benchmark viewer to GitHub Pages** from Actions. Subsequent changes
under `run_viewer/` on `main` deploy automatically. The workflow uses GitHub's
standard Pages actions and its scoped `GITHUB_TOKEN`; no custom secret is needed.
The default URL is `https://michelle.github.io/endless-tshirt-shops/`.

Treat Pages as public unless GitHub explicitly provides private access control
for this repository. Private repositories require a GitHub plan supporting Pages;
do not make the repository public just to enable hosting.

Only `out/` is uploaded. Its reports/final responses are **redacted public
copies**, visibly labeled when changed: sandbox claim links, payment client
secrets, signed/private links, recognized API keys, and email addresses are
removed. The original `public/` archive is not modified. Screenshots and raster
artwork are copied byte-for-byte, preserving alpha and placement. This is not a
general PII detector: review new screenshots/reports before publishing. Only
approved archive paths are copied; raw logs, capture errors, local credentials,
and unrelated repository files are excluded.
