import { fulfillPaidSession } from "../../../lib/fulfill.js"
import { publicOrigin } from "../../../lib/origin.js"

export const dynamic = "force-dynamic"

export async function GET(request) {
  const sessionId = new URL(request.url).searchParams.get("session_id")
  try {
    const result = await fulfillPaidSession(sessionId, publicOrigin(request))
    if (!result.ok) {
      return Response.json({ error: result.error || "Order not found." }, { status: result.status || 400 })
    }
    return Response.json(result)
  } catch (error) {
    console.error("fulfill failed", error?.message)
    return Response.json(
      { error: "Payment was received, but the print order could not be submitted. Refresh to retry — it won't double-charge or double-print." },
      { status: 502 }
    )
  }
}
