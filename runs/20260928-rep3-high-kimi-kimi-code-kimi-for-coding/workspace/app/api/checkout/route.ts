import { createPayment } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  try {
    const result = await createPayment(body);
    if ("error" in result) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json(result);
  } catch (err: any) {
    console.error("checkout error", err?.message ?? err);
    return Response.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
