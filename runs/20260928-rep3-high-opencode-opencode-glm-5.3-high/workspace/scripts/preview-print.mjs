/**
 * Local design iteration helper: renders the print PNG for one or more
 * example designs into out/ (uses the same code path as production).
 *
 *   APP_SECRET=dev-secret npm run preview:print
 *   node scripts/preview-print.mjs [outDir]
 *
 * Renders via a tiny Next.js-independent bundling: it uses tsx to import the
 * TypeScript lib directly (see scripts/preview-print.ts).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const outDir = process.argv[2] ?? "out";
mkdirSync(outDir, { recursive: true });

const script = path.join(process.cwd(), "scripts/preview-print.ts");
const child = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    script,
    outDir,
  ],
  { stdio: "inherit", env: process.env }
);

process.exit(child.status ?? 1);
