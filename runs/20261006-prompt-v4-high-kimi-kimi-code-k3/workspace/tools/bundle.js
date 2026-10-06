// Bundles each src/api handler into a single self-contained file in api/,
// so Vercel's file tracer has nothing external to resolve. sharp stays external
// (native module, force-included via vercel.json includeFiles).
const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src", "api");
const OUT = path.join(__dirname, "..", "api");

fs.mkdirSync(OUT, { recursive: true });

(async () => {
  for (const f of fs.readdirSync(SRC)) {
    if (!f.endsWith(".js")) continue;
    await esbuild.build({
      entryPoints: [path.join(SRC, f)],
      outfile: path.join(OUT, f),
      bundle: true,
      platform: "node",
      format: "cjs",
      target: "node20",
      external: ["sharp"],
      loader: { ".ttf": "binary" },
      logLevel: "warning",
    });
    console.log("bundled api/" + f);
  }
})().catch((e) => { console.error(e); process.exit(1); });
