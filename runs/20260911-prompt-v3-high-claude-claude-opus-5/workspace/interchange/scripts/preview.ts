import fs from "node:fs";
import sharp from "sharp";
import { defaultSpec, sanitizeSpec, Spec } from "../lib/spec";
import { renderFront, renderBack, atPixelSize, CANVAS } from "../lib/render";
import { GARMENTS } from "../lib/spec";

const specs: Record<string, Spec> = {
  demo: defaultSpec(),
  solo: sanitizeSpec({
    title: "MARCUS & JUNE",
    subtitle: "TEN YEARS, ONE NETWORK",
    motto: "no service replacement",
    garment: "white",
    variant: 1,
    lines: [
      { name: "The Us Line", color: "#E3559B", stations: [
        { label: "A Rooftop In Athens", note: "2015" },
        { label: "Long Distance", note: "2016" },
        { label: "One Apartment", note: "2018", major: true },
        { label: "The Dog", note: "2020" },
        { label: "Married", note: "2023" },
      ]},
      { name: "Detours", color: "#4A6BE8", stations: [
        { label: "The Big Argument" },
        { label: "One Apartment" },
        { label: "Therapy, Honestly", note: "2019" },
        { label: "Better", note: "now" },
      ]},
    ],
  }),
  four: sanitizeSpec({
    title: "DAD AT SIXTY",
    subtitle: "ALL LINES RUNNING ON TIME",
    motto: "still no delays",
    garment: "navy blue",
    variant: 2,
    lines: [
      { name: "Early Years", color: "#E8453C", stations: [
        { label: "Dundee", note: "1966" }, { label: "Paper Round", note: "1978" },
        { label: "The Blue Cortina", note: "1984" }, { label: "Art School", note: "1986", major: true },
        { label: "London", note: "1989" } ]},
      { name: "Family", color: "#F2A93B", stations: [
        { label: "Meeting Mum", note: "1991" }, { label: "London" },
        { label: "Me", note: "1995" }, { label: "Ellie", note: "1998" }, { label: "The Allotment", note: "2011" } ]},
      { name: "Work", color: "#37B98A", stations: [
        { label: "Art School" }, { label: "First Agency", note: "1990" },
        { label: "Redundancy", note: "2002" }, { label: "His Own Shop", note: "2004" }, { label: "Retired", note: "2026" } ]},
      { name: "Obsessions", color: "#9B6BE8", stations: [
        { label: "Vinyl" }, { label: "Bad Puns" }, { label: "Sourdough", note: "2020" }, { label: "Birdwatching" } ]},
    ],
  }),
};

async function main() {
  for (const [name, spec] of Object.entries(specs)) {
    const g = GARMENTS[spec.garment];
    for (const [side, svg] of [["front", renderFront(spec)], ["back", renderBack(spec)]] as const) {
      fs.writeFileSync(`out/${name}-${side}.svg`, svg);
      const scale = 0.8;
      const w = Math.round(CANVAS.w * scale);
      const h = Math.round(CANVAS.h * scale);
      await sharp(Buffer.from(atPixelSize(svg, w, h)))
        .flatten({ background: g.hex })
        .png()
        .toFile(`out/${name}-${side}.png`);
    }
    console.log("rendered", name, spec.garment);
  }
}
main();
