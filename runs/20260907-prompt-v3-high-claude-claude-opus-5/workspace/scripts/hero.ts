import fs from "node:fs";
import { normalizeSpec } from "../lib/spec";
import { generateCryptid } from "../lib/genome";
import { plateSvg } from "../lib/art/plate";
import { rasterize } from "../lib/render";

const cands = [
  { keeper: "Marisol", place: "Oakland, CA", hour: 2, appetite: "the last slice, always", temperament: "devoted", twist: 4 },
  { keeper: "Marisol", place: "Oakland, CA", hour: 2, appetite: "the last slice, always", temperament: "devoted", twist: 7 },
  { keeper: "June", place: "Portland, OR", hour: 3, appetite: "unread group chats", temperament: "feral", twist: 1 },
  { keeper: "Otto", place: "Berlin", hour: 4, appetite: "other people's leftovers", temperament: "vengeful", twist: 3 },
  { keeper: "Sena", place: "Seoul", hour: 1, appetite: "the good hangers", temperament: "mischievous", twist: 5 },
  { keeper: "Cal", place: "Dublin", hour: 23, appetite: "warm beer and old grudges", temperament: "melancholic", twist: 2 },
  { keeper: "Rae", place: "Austin, TX", hour: 5, appetite: "the snooze button", temperament: "skittish", twist: 6 },
  { keeper: "Nadia", place: "Cairo", hour: 0, appetite: "unfinished crosswords", temperament: "devoted", twist: 9 },
];
fs.mkdirSync("/tmp/hero", { recursive: true });
cands.forEach((s, i) => {
  const c = generateCryptid(normalizeSpec(s as never));
  const svg = plateSvg(c, "bone", `h${i}`).replace(/(viewBox="[^"]*"[^>]*>)/, `$1<rect width="1200" height="1600" fill="#1a1a1c"/>`);
  fs.writeFileSync(`/tmp/hero/h${i}.png`, rasterize(svg, 400));
  console.log(i, c.genome.archetype, c.genome.palette.name, c.commonName);
});
