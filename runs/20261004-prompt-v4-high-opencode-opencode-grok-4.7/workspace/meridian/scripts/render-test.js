import fs from "fs";
import path from "path";
import sharp from "sharp";
import { describeSky, renderDesignSVG, renderMockupSVG } from "../lib/starmap.js";

const out = path.join(process.cwd(), "qa");
fs.mkdirSync(out, { recursive: true });

const june = {
  title: "The night we met",
  dedication: "For Amina",
  date: "2019-06-14",
  time: "21:30",
  tz: "America/New_York",
  lat: 40.6782,
  lon: -73.9442,
  place: "Brooklyn, New York",
  color: "black",
  size: "m",
  qty: 1,
};
const winter = {
  ...june,
  title: "The longest night",
  dedication: "",
  date: "2019-12-21",
  time: "22:00",
  color: "white",
};
const sydney = {
  title: "First night home",
  dedication: "",
  date: "2020-01-18",
  time: "21:15",
  tz: "Australia/Sydney",
  lat: -33.8688,
  lon: 151.2093,
  place: "Sydney, Australia",
  color: "navy blue",
  size: "l",
  qty: 1,
};

for (const [name, spec] of [
  ["june", june],
  ["winter", winter],
  ["sydney", sydney],
]) {
  console.log(name, JSON.stringify(describeSky(spec)));
}

const t0 = Date.now();
const design = renderDesignSVG(june);
fs.writeFileSync(path.join(out, "june-design.svg"), design);
console.log("svg ms", Date.now() - t0, "bytes", design.length);

const t1 = Date.now();
const png = await sharp(Buffer.from(design)).png().toBuffer();
console.log("png ms", Date.now() - t1, "bytes", png.length, "meta", await sharp(png).metadata());
fs.writeFileSync(path.join(out, "june-design.png"), png);

const onShirt = await sharp(png).flatten({ background: "#171717" }).resize(980).png().toBuffer();
fs.writeFileSync(path.join(out, "june-on-black.png"), onShirt);

const winterPng = await sharp(Buffer.from(renderDesignSVG(winter))).png().toBuffer();
const onWhite = await sharp(winterPng).flatten({ background: "#f4f4f2" }).resize(980).png().toBuffer();
fs.writeFileSync(path.join(out, "winter-on-white.png"), onWhite);

fs.writeFileSync(
  path.join(out, "june-mockup.png"),
  await sharp(Buffer.from(renderMockupSVG(june))).png().resize(760).toBuffer()
);
fs.writeFileSync(
  path.join(out, "sydney-mockup.png"),
  await sharp(Buffer.from(renderMockupSVG(sydney))).png().resize(760).toBuffer()
);
const cream = renderMockupSVG({
  ...june,
  color: "cream",
  title: "When you arrived",
  dedication: "June, 3:12am",
  date: "2021-03-02",
  time: "03:12",
});
fs.writeFileSync(
  path.join(out, "cream-mockup.png"),
  await sharp(Buffer.from(cream)).png().resize(760).toBuffer()
);
console.log("wrote qa images");
