import fs from "node:fs";
import { svgToPng } from "../lib/render";
import { renderBadgeSvg, renderDesignSvg, normalizeDesign } from "../lib/design";
fs.mkdirSync("out", { recursive: true });
const combos: any[] = [
  { name: "Maya's Backyard", year: "1991", motto: "Wild, free & mostly supervised", scene: "mountains", palette: "golden" },
  { name: "Grandpa Joe's Garage", year: "1957", motto: "Home of the eternal project", scene: "desert", palette: "sage" },
  { name: "The Couch", year: "2019", motto: "", scene: "coast", palette: "night" },
  { name: "Camp Mom", year: "", motto: "Snacks available at ranger station", scene: "forest", palette: "alpine" },
  { name: "Lake Overthink", year: "1988", motto: "Elevation: 5’7", scene: "mountains", palette: "dusk" },
  { name: "Zoë", year: "2024", motto: "Protected since birth", scene: "coast", palette: "golden" },
];
(async () => {
  for (const [i, c] of combos.entries()) {
    const r = normalizeDesign({ ...c, v: 0 });
    if (!r.ok) throw new Error(r.error);
    fs.writeFileSync(`out/badge${i}.png`, await svgToPng(renderBadgeSvg(r.design, 900)));
  }
  const r = normalizeDesign({ ...combos[0], v: 0 });
  if (!r.ok) throw 0;
  const t1 = Date.now();
  const full = await svgToPng(renderDesignSvg(r.design));
  fs.writeFileSync("out/print.png", full);
  console.log("print ms", Date.now() - t1, "bytes", full.length);
})();
