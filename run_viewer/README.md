# Benchmark run viewer

A deliberately simple viewer for the `20260905-beauty-high` and
`20260905-minimal-high` benchmark suites.

It shows every recovered design for the selected suite at once, includes all 14
agent final responses, and renders all six generated suite summaries as rich
Markdown. The shared artwork background color can be changed to inspect
transparency without altering image placement.

All suite reports live at `public/suites/<suite-id>/summary.md`. Suites with
recovered run artifacts use
`public/suites/<suite-id>/runs/<run-id>/{final.md,design.*}`. The archive also
contains the four earlier generated suite reports in the same layout.

The beauty and minimal suites also include `storefront.png` and, where published,
`favicon.*` beside each run's artwork. These are fresh 1440 × 900 desktop
viewport captures of the deployed homepages, not screenshots from the original
benchmark. `public/suites/<suite-id>/storefronts.json` records the
capture time, page URL/title, response status, favicon source, and observed
page errors. The viewer discovers this file by suite ID; no per-suite screenshot
imports or component changes are required. Absent captures leave artwork and
reports available. Missing icons and icons that could not be downloaded are
distinguished. Inline data-URL favicons are archived too.

Click a screenshot or Details to open the run drawer. Use Left/Right or its
arrow buttons to navigate within the selected suite; Escape closes it. Hover
or focus a status (or tap its question mark) for plain-English definitions.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Use `npm run lint` and `npm test` for validation.

## Capture a suite

Register the suite and its runs in `app/data.ts`, including public `deployment`
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
`--overwrite`. Each successful run updates the manifest atomically. Navigation
failures are recorded in `capture-errors.json`; the command continues with other
runs and exits nonzero if any capture failed. HTTP error pages are captured with
their actual response status. Refresh the viewer after capturing (or reselect
the suite). Existing beauty artifacts are preserved when capturing minimal.

`npm run test:capture` exercises the reusable capture workflow against a local
fixture suite, including inline icons, missing icons, retries, and failed refreshes.
It requires Chromium, or `CAPTURE_BROWSER=chrome npm run test:capture` for Chrome.

This viewer is local-only and has no deployment configuration.
