const sharp = require("sharp");
const StarMap = require("../shared/starmap");
const data = require("../lib/skydata.json");

const svg = StarMap.generate({
  date: new Date(Date.UTC(1997, 2, 14, 21, 30)),
  lat: 40.7128,
  lon: -74.006,
  title: "Amelia & Noah",
  subtitle: "the night everything began",
  place: "New York",
  ink: process.argv[3] || "#f2ead8",
  data,
});

sharp(Buffer.from(svg), { density: 216 })
  .resize(4500, 5400)
  .png()
  .toFile(process.argv[2] || "test-print.png")
  .then((info) => console.log("rendered", info.width + "x" + info.height))
  .catch((e) => { console.error(e); process.exit(1); });
