import { bindings, reply } from "../../../lib/store";
export const runtime = "edge";
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId?.startsWith("cs_") || sessionId.length > 200) return reply({ status: "unknown" }, 400);
  const row = await bindings().DB.prepare("SELECT status FROM orders WHERE stripe_session_id=?").bind(sessionId).first<{ status: string }>();
  return reply({ status: row?.status || "unknown" });
}
