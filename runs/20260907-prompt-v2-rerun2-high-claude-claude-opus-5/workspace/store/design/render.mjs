import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { plate, INK } from "./art.mjs";
import { teeSvg, GARMENTS, PRINT_BOX, CANVAS } from "./mockup.mjs";

const root = path.resolve(import.meta.dirname, "..");
const saints = JSON.parse(await fs.readFile(path.join(root, "data/saints.json"), "utf8"));
const out = (...p) => path.join(root, "public", ...p);

await fs.mkdir(out("print"), { recursive: true });
await fs.mkdir(out("mock"), { recursive: true });
await fs.mkdir(out("art"), { recursive: true });

const PRINT_W = 3600; // ~300dpi across a 12in chest print
const only = process.argv[2];

for (const s of saints) {
  if (only && s.slug !== only) continue;
  for (const tone of ["dark", "light"]) {
    const ink = tone === "dark" ? INK.dark : INK.light;
    const svg = Buffer.from(plate(s, { ink }));

    // print-ready transparent PNG
    await sharp(svg, { density: 300 })
      .resize({ width: PRINT_W })
      .png({ compressionLevel: 9, palette: false })
      .toFile(out("print", `${s.slug}-${tone}.png`));

    // web art (transparent, for the detail view)
    await sharp(svg, { density: 300 }).resize({ width: 900 }).png()
      .toFile(out("art", `${s.slug}-${tone}.png`));
  }

  for (const [color, g] of Object.entries(GARMENTS)) {
    const ink = g.tone === "dark" ? INK.dark : INK.light;
    const art = await sharp(Buffer.from(plate(s, { ink })), { density: 300 })
      .resize({ width: PRINT_BOX.w }).png().toBuffer();
    const tee = await sharp(Buffer.from(teeSvg(g.hex, g.tone)), { density: 300 }).resize({ width: 1200 }).extract({ left: 0, top: -CANVAS.offsetY, width: CANVAS.w, height: CANVAS.h }).png().toBuffer();
    const bg = "#efe8da";
    await sharp({ create: { width: CANVAS.w, height: CANVAS.h, channels: 4, background: bg } })
      .composite([{ input: tee, top: 0, left: 0 },
                  { input: art, top: PRINT_BOX.y + CANVAS.offsetY, left: PRINT_BOX.x }])
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(out("mock", `${s.slug}--${color.replace(/ /g, "-")}.jpg`));
  }
  console.log("✓", s.slug);
}
