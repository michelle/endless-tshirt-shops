# Run viewer

The published archive browser for the benchmark:
**[michelle.github.io/endless-tshirt-shops](https://michelle.github.io/endless-tshirt-shops/)**

One page per suite. It shows every recovered print design at once, each run's
storefront screenshot, favicon and social preview, the agent's verbatim final
report, and the suite's audit summary rendered as Markdown. The newest suite
with recovered runs is the default; older suites that only have a written
summary are reachable by link. Requires Node.js 22.13+.

```sh
npm ci
npm run dev
```

`npm run predeploy` is the gate that must pass before pushing or deploying —
see [Before publishing](#before-publishing). Deliberately not shown: any
pass/fail grade. Cards state what a run did and leave the judgement to the
reader.

## Reading a suite

- **Suite picker** selects the suite and records it in the URL.
- **Show prompt** opens the archived task prompt for that suite.
- **T-shirt background** recolours only the artwork backdrop, for checking
  transparency. It never alters image placement or the images themselves.
- **Dark mode** changes the viewer's reading colours only, never screenshots or
  designs. Light mode is the default and the choice is saved in browser storage.
- Click a screenshot or **Details** for the run drawer. Inside: Left/Right or
  `h`/`l` move between runs, `j`/`k` scroll, Escape or a backdrop click closes.
  On a touchscreen, a deliberate horizontal swipe changes runs; vertical
  scrolling, pinch zoom and edge gestures stay native.
- Hover, focus or tap a status for a plain-English definition of each label.

Link to a suite with `?suite=<suite-id>`, and to an open drawer by adding
`&run=<short-run-id>`. Every summary heading is a `#summary-…` link. The drawer
has a **Copy permalink** button. Unknown IDs fall back to the default suite.

## What the archive holds

```text
public/suites/<suite-id>/
  summary.md                    the suite's audit write-up
  prompt.md                     the task prompt, at that suite's base commit
  storefronts.json              capture manifest, discovered by suite ID
  runs/<run-id>/
    final.md                    the agent's report, verbatim
    design.*                    print artwork, original bytes
    storefront.png              homepage capture
    favicon.*, social-preview.* as published by the deployed site
```

`app/data.ts` is the registry: it lists suites and runs and records each
prompt's original filename, source revision and SHA-256. The pre-deploy checks
follow the registry rather than the directory, so a referenced file that is
missing fails the build.

Two rules the archive depends on:

- **Artwork is evidence, so it is never repaired.** Original bytes, canvas,
  alpha and position are preserved; nothing is cropped, resized, re-encoded or
  substituted. A run with no trustworthy artwork shows none.
- **Provenance is labelled, not assumed.** The main image should represent the
  customer ordering path: preferably the exact asset a paid order sent to
  Prodigi, otherwise artwork recorded on a real Checkout Session, clearly
  labelled as undelivered. Separate smoke-test submissions are archived as
  `submitted.*` and described as test evidence, never as the customer's design.
  A social card is not print artwork.

Archive the prompt from the suite's recorded base commit, not today's working
copy, and verify its hash against run metadata. Preserve historical typos.

## Capture a suite

Write `summary.md`, the final reports and any recovered artwork first, then
register the suite and its runs in `app/data.ts`, then:

```sh
npx playwright install chromium
npm run capture -- --suite <suite-id>
```

Captures each registered deployment's initial viewport at 1440 × 900, 1× pixel
density, light mode, en-US, America/Los_Angeles. It waits for fonts and images,
never clicks checkout controls, and records capture time, URL, title, HTTP
status, favicon source and page errors in `storefronts.json`.

Existing captures are kept. Retry failures with the same command, target one run
with `--run <run-id>`, refresh deliberately with `--overwrite`, or refresh only
social previews with `--social-only --overwrite`. Failures land in
`capture-errors.json` and exit nonzero. `--browser chrome` uses installed Chrome.

## Before publishing

```sh
npm run predeploy
```

Lint, permalink and archive-registry contracts, heading tests, a clean static
build, HTTP asset checks, then browser tests for permalinks, drawers and
keyboard navigation, touch gestures, saved preferences and the capture
workflow. The Pages workflow runs the same gate. Use `CAPTURE_BROWSER=chrome` for installed Chrome,
or install Chromium once with `npx playwright install chromium`.

Install the local push gate once per clone:

```sh
npm run hooks:install
```

The hook validates **the exact commit being pushed** in a temporary directory
with clean dependencies, not the working tree, so an untracked file cannot hide
a missing committed one. It skips deletions, unchanged viewer trees and
`benchmark-results` artifact pushes, and refuses to overwrite an existing hook
configuration. Git hooks are local and bypassable; CI remains the mandatory
check.

`tests/fixtures/permalinks-v1.json` freezes published suite IDs, short run IDs
and summary fragments. Add new destinations after publishing; never delete old
entries to make a failing test pass, and give renamed headings an alias.

## GitHub Pages

The published build is static React — no server, no Worker, no hosting
credentials.

```sh
npm run build
npm run preview -- --port 4174    # http://localhost:4174/endless-tshirt-shops/
```

`VIEWER_BASE_PATH` overrides the `/endless-tshirt-shops/` prefix (use `/` for a
custom domain). To enable deployment once, set **Settings → Pages → Build and
deployment → Source: GitHub Actions**; after that, changes under `run_viewer/`
on `main` deploy through the workflow's scoped `GITHUB_TOKEN`.

Only `out/` is uploaded, and only approved archive paths are copied into it —
raw logs, capture errors and unrelated files are excluded. Text copies are
**redacted and visibly labelled** when changed: sandbox claim links, payment
client secrets, signed links, recognised API keys and email addresses are
removed. The `public/` originals are untouched, and images are copied
byte-for-byte. This is not a general PII detector, so review new screenshots and
reports before publishing. Treat Pages as public.

## Notes on the code

There is no scoring. An earlier version graded each run on three checks and
coloured the card green, yellow or red; that read as a verdict on the model,
when what the archive can actually show is evidence. Each card now states what
a run did, and the suite summary carries the judgement in prose.

Tailwind is present only for `preflight.css` as a CSS reset; every class in the
app is hand-written in `app/globals.css`.
