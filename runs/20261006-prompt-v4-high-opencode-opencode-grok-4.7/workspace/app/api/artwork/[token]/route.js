import { readToken } from "../../../../lib/token.js"
import { renderPrintPng } from "../../../../lib/render.js"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(_request, context) {
  const params = await context.params
  const token = decodeURIComponent(params.token || "").replace(/\.png$/, "")
  const spec = readToken(token)
  if (!spec) return new Response("Not found", { status: 404 })
  try {
    const png = renderPrintPng(spec)
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("render failed", error?.message)
    return new Response("Could not render print file", { status: 500 })
  }
}
