import { writeFileSync, mkdirSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { Resvg } from "@resvg/resvg-js"
import { altAz, gmstDegrees, project, zonedTimeToUtc, localSiderealDegrees } from "../lib/astronomy.js"
import { printSvg, shirtSvg, fontFiles, describeSky } from "../lib/artwork.js"
import { SAMPLE } from "../lib/products.js"
import catalog from "../lib/catalog.json" with { type: "json" }

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const out = path.join(root, "proof")
mkdirSync(out, { recursive: true })

function assert(cond, message) {
  if (!cond) throw new Error(message)
}

const j2000 = new Date("2000-01-01T12:00:00Z")
const gmst = gmstDegrees(j2000)
assert(Math.abs(gmst - 280.46061837) < 0.001, `GMST ${gmst}`)

const meridian = altAz(0, 0, 40, 0)
assert(Math.abs(meridian.alt * 180 / Math.PI - 50) < 0.2, "meridian altitude")
const south = Math.atan2(Math.sin(meridian.az), Math.cos(meridian.az))
assert(Math.abs(Math.abs(south) - Math.PI) < 0.02, `meridian az ${meridian.az}`)

const polaris = catalog.stars.find((s) => s[3] === "Polaris")
assert(polaris, "Polaris missing")
const polar = altAz(polaris[0], polaris[1], 40, 20)
const polarAlt = polar.alt * 180 / Math.PI
assert(Math.abs(polarAlt - 40) < 1.2, `Polaris alt ${polarAlt}`)

const when = zonedTimeToUtc(SAMPLE.date, SAMPLE.time, SAMPLE.timezone)
const lst = localSiderealDegrees(when, SAMPLE.lng)
const alnilam = catalog.stars.find((s) => s[3] === "Alnilam")
const belt = project(alnilam[0], alnilam[1], SAMPLE.lat, lst, 2332, 1760, 1008)
assert(belt, "Alnilam should be up over Paris on 14 Feb 2014 at 22:15")
assert(belt.y > 1760, `Alnilam should sit south of zenith, y=${belt.y}`)
assert(belt.altDeg > 20, `Alnilam altitude ${belt.altDeg}`)

const sky = describeSky(SAMPLE)
assert(sky.visible > 80 && sky.visible < 500, `visible stars ${sky.visible}`)
console.log("astronomy ok", { gmst: gmst.toFixed(3), polarAlt: polarAlt.toFixed(2), alnilamAlt: belt.altDeg.toFixed(1), visible: sky.visible, sidereal: sky.sidereal })

function raster(svg, file, width) {
  const resvg = new Resvg(svg, {
    fitTo: width ? { mode: "width", value: width } : undefined,
    font: {
      fontFiles: fontFiles().map((f) => path.join(root, f)),
      loadSystemFonts: false,
      defaultFontFamily: "Libre Baskerville",
    },
  })
  const png = resvg.render().asPng()
  writeFileSync(file, png)
  console.log("wrote", file, png.length)
}

for (const color of ["black", "sand", "white", "navy blue"]) {
  const spec = { ...SAMPLE, color }
  raster(shirtSvg(spec, { width: 900 }), path.join(out, `shirt-${color.replace(" ", "-")}.png`), 900)
}
raster(printSvg(SAMPLE), path.join(out, "print-black.png"))
raster(printSvg({ ...SAMPLE, color: "sand", style: "quiet", place: "our kitchen", names: ["Mara"], inscription: "still here" }), path.join(out, "print-sand-quiet.png"))
console.log("proofs ready")
