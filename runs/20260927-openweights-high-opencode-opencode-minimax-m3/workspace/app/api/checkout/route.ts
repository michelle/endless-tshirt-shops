import { NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutSession, stripeReady } from "@/lib/stripe";
import { sign } from "@/lib/tokens";
import type { Customization } from "@/lib/render";

export const runtime = "nodejs";

const VALID_COLOR = z.enum(["navy", "black", "forest", "charcoal", "white"]);
const VALID_SIZE = z.enum(["xs", "s", "m", "l", "xl", "xxl", "3xl", "4xl"]);
const Schema = z.object({
  phrase: z.string().min(1).max(28),
  phrase2: z.string().max(28).optional().default(""),
  date: z.string().min(10),
  place: z.string().min(1).max(32),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  color: VALID_COLOR,
  size: VALID_SIZE,
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const customization = parsed.data as Customization;
  const token = sign(customization);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    new URL(req.url).origin;

  if (!stripeReady() || new URL(req.url).searchParams.get("demo") === "1") {
    // No Stripe key configured — return a "demo" redirect so the storefront
    // can show off the full UX without making a real charge. The demo
    // path also queues a synthetic Prodigi order so the entire pipeline
    // can be inspected in the sandbox dashboard. We also honour ?demo=1
    // so a sandbox test run can still exercise the entire pipeline.
    const demoUrl =
      `${baseUrl}/demo-checkout?` +
      new URLSearchParams({
        session_id: token.slice(0, 32),
        token,
      }).toString();
    return NextResponse.json({ mode: "demo", redirect: demoUrl });
  }

  const session = await createCheckoutSession({
    customization,
    designToken: token,
    successUrl: `${baseUrl}/success`,
    cancelUrl: `${baseUrl}/?canceled=1`,
  });

  return NextResponse.json({
    mode: "stripe",
    id: session.id,
    url: session.url,
  });
}
