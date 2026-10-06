import path from "path"
import { Resvg } from "@resvg/resvg-js"
import { printSvg, shirtSvg, fontFiles } from "./artwork.js"

function fonts() {
  return fontFiles().map((file) => path.join(process.cwd(), file))
}

export function rasterize(svg, width) {
  const resvg = new Resvg(svg, {
    fitTo: width ? { mode: "width", value: width } : undefined,
    font: {
      fontFiles: fonts(),
      loadSystemFonts: false,
      defaultFontFamily: "Libre Baskerville",
    },
    shapeRendering: 2,
    textRendering: 1,
    imageRendering: 0,
  })
  return resvg.render().asPng()
}

export function renderPrintPng(spec) {
  return rasterize(printSvg(spec))
}

export function renderShirtPng(spec, width = 900) {
  return rasterize(shirtSvg(spec, { width }), width)
}
