import fs from "node:fs";
import { normalizeSpec } from "../lib/spec";
import { generateCryptid } from "../lib/genome";
import { renderPrintPng } from "../lib/render";

const t0 = Date.now();
const spec = normalizeSpec({ keeper: "Michael", place: "Brooklyn, NY", hour: 3, appetite: "unsent text messages", temperament: "mischievous" } as never);
const c = generateCryptid(spec);
const png = renderPrintPng(c, "bone");
fs.writeFileSync("/tmp/print.png", png);
console.log("bytes", png.length, "=", (png.length / 1024 / 1024).toFixed(2), "MB", "in", Date.now() - t0, "ms");
console.log("heap", (process.memoryUsage().rss / 1024 / 1024).toFixed(0), "MB rss");
