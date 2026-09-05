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

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Use `npm run lint` and `npm test` for validation.

This viewer is local-only and has no deployment configuration.
