// Pixel audit of a generated print file: verifies the composition landed
// where designed (ring, stars, title, subtitle, coordinates, transparency).
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { PRINT } from "../src/render.js";

const file = process.argv[2] || "data/print-files/37d48a1c-ca8f-4d42-aff9-e9bd78831805.png";
const img = await loadImage(file);
console.log("loaded:", img.width + "x" + img.height, file);
const c = createCanvas(img.width, img.height);
const ctx = c.getContext("2d");
ctx.drawImage(img, 0, 0);
const data = ctx.getImageData(0, 0, img.width, img.height).data;

const alphaAt = (x, y) => data[(Math.round(y) * img.width + Math.round(x)) * 4 + 3];
const inkNear = (x, y, radius = 12) => {
  for (let dy = -radius; dy <= radius; dy += 2)
    for (let dx = -radius; dx <= radius; dx += 2)
      if (alphaAt(x + dx, y + dy) > 30) return true;
  return false;
};

const cx = PRINT.w / 2, cy = 2880, R = 1650;
let pass = 0, fail = 0;
const check = (name, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  ok ? pass++ : fail++;
};

// ring: ink on the circle at 8 compass points
let ringOk = true;
for (let a = 0; a < 360; a += 45) {
  const x = cx + Math.sin((a * Math.PI) / 180) * R;
  const y = cy - Math.cos((a * Math.PI) / 180) * R;
  if (!inkNear(x, y, 10)) ringOk = false;
}
check("ring drawn on circle all around", ringOk);

// stars: count inked pixels inside the chart
let starPixels = 0;
for (let i = 3; i < data.length; i += 64) {
  const p = (i - 3) / 4;
  const x = p % img.width, y = Math.floor(p / img.width);
  if (Math.hypot(x - cx, y - cy) < R * 0.98 && data[i] > 30) starPixels++;
}
check(`star field present (${starPixels} sampled ink px, need > 2500)`, starPixels > 2500);

// title band around baseline 660
check("title text present near top", inkNear(cx, 660, 240));
// subtitle band around baseline 4820
check("place/date line present", inkNear(cx, 4820, 260));
// coordinates line around 5005
check("coordinates line present", inkNear(cx, 5005, 200));
// message line around 5300
check("message line present", inkNear(cx, 5300, 200));

// cardinal letters
check("N cardinal letter", inkNear(cx, cy - R - 72, 40));
check("E cardinal letter", inkNear(cx - R - 72, cy, 40));
check("S cardinal letter", inkNear(cx, cy + R + 72, 40));
check("W cardinal letter", inkNear(cx + R + 72, cy, 40));

// transparency: corners must be fully transparent (DTG: shirt shows through)
const corners = [
  [20, 20], [PRINT.w - 20, 20], [20, PRINT.h - 20], [PRINT.w - 20, PRINT.h - 20],
  [PRINT.w / 2, 20],
];
check(
  "background fully transparent (corners)",
  corners.every(([x, y]) => alphaAt(x, y) === 0)
);

// no ink bleeding into extreme side margins beyond ring
check("no stray ink at extreme left margin", !inkNear(30, PRINT.h / 2, 25));
check("no stray ink at extreme right margin", !inkNear(PRINT.w - 30, PRINT.h / 2, 25));

console.log(fail === 0 ? "\nPRINT FILE AUDIT PASSED" : `\n${fail} AUDIT FAILURES`);
process.exit(fail === 0 ? 0 : 1);
