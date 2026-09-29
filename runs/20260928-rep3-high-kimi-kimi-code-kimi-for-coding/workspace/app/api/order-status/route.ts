import { orderStatus, fulfillOrder } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PI_RE = /^pi_[A-Za-z0-9_]+$/;

export async function GET(req: Request) {
  const piId = new URL(req.url).searchParams.get("pi");
  if (!piId || !PI_RE.test(piId)) {
    return Response.json({ error: "Invalid payment reference." }, { status: 400 });
  }
  try {
    const status = await orderStatus(piId);
    return Response.json(status);
  } catch (err: any) {
    return Response.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}

// Self-healing retry: if payment succeeded but the webhook never fulfilled
// (e.g. deploy gap), the confirmation page calls this to submit to Prodigi.
export async function POST(req: Request) {
  let piId: string | undefined;
  try {
    const body = await req.json();
    piId = String(body.pi ?? "");
  } catch {
    /* fallthrough */
  }
  if (!piId || !PI_RE.test(piId)) {
    return Response.json({ error: "Invalid payment reference." }, { status: 400 });
  }
  try {
    const result = await fulfillOrder(piId);
    return Response.json(result, { status: result.ok ? 200 : 409 });
  } catch (err: any) {
    return Response.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
