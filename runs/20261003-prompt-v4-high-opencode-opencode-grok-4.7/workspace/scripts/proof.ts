import { mkdirSync, writeFileSync } from "fs";
import { STORIES } from "../lib/catalog";
import { designSvg } from "../lib/design";
import { renderPrintPng } from "../lib/render";

mkdirSync("proofs", { recursive: true });
for (const story of STORIES) {
  const png = renderPrintPng(story);
  const name = story.place.toLowerCase();
  writeFileSync(`proofs/${name}.png`, png);
  writeFileSync(`proofs/${name}.svg`, designSvg(story));
  console.log(name, png.length);
}
