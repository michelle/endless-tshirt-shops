import { SAMPLE } from "../../../lib/products.js"
import { renderPrintPng, renderShirtPng } from "../../../lib/render.js"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(request) {
  const view = new URL(request.url).searchParams.get("view")
  const color = new URL(request.url).searchParams.get("color") || SAMPLE.color
  const spec = { ...SAMPLE, color }
  try {
    const png = view === "shirt" ? renderShirtPng(spec, 1000) : renderPrintPng(spec)
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error(error)
    return new Response(error?.message || "render failed", { status: 500 })
  }
}
