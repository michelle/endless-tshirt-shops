import { fulfillPaidSession } from "../../../lib/fulfill.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ status: "error", message: "Invalid JSON" }, { status: 400 });
  }
  try {
    const result = await fulfillPaidSession(body.sessionId);
    const code = result.status === "error" ? 422 : 200;
    return Response.json(result, { status: code });
  } catch (err) {
    console.error("[meridian] fulfill", err);
    return Response.json({ status: "error", message: err.message || "Fulfillment failed." }, { status: 500 });
  }
}
