import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import {
  ALLOWED_COUNTRIES,
  CLOCK_TOLERANCE_MS,
  CURRENCY,
  PRICE_CENTS,
  PRODIGI_PRODUCTS,
  PRODIGI_SIZES,
  SIZES,
  STYLES,
} from "@/lib/config";
import { artworkUrl } from "@/lib/site";
import { describeTimestamp } from "@/lib/time";

export const runtime = "nodejs";

const Body = z.object({
  style: z.enum(STYLES),
  size: z.enum(SIZES),
  timestamp: z.number().int().nonnegative(),
  email: z.string().trim().email().max(200),
  shipping: z.object({
    name: z.string().trim().min(1).max(120),
    address: z.object({
      line1: z.string().trim().min(1).max(200),
      line2: z.string().trim().max(200).optional().nullable(),
      city: z.string().trim().max(120).optional().nullable(),
      state: z.string().trim().max(120).optional().nullable(),
      postal_code: z.string().trim().min(1).max(20),
      country: z.enum(ALLOWED_COUNTRIES),
    }),
  }),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "That wasn't JSON. We only accept JSON and, separately, money." }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path?.join(".") || "somewhere";
    return NextResponse.json(
      { error: `Something is off with ${where}: ${issue?.message ?? "unknown"}` },
      { status: 400 },
    );
  }
  const { style, size, email, shipping } = parsed.data;

  // We sell the current datetime. If your clock disagrees with ours by more
  // than a few minutes, ours wins. It's nothing personal.
  const serverNow = Date.now();
  const drift = Math.abs(parsed.data.timestamp - serverNow);
  const timestamp = drift <= CLOCK_TOLERANCE_MS ? parsed.data.timestamp : serverNow;
  const clockCorrected = timestamp !== parsed.data.timestamp;

  const pi = await stripe().paymentIntents.create({
    amount: PRICE_CENTS,
    currency: CURRENCY,
    automatic_payment_methods: { enabled: true },
    receipt_email: email,
    description: `One (1) t-shirt bearing the datetime ${timestamp} (${describeTimestamp(timestamp)})`,
    statement_descriptor_suffix: "DATETIME",
    shipping: {
      name: shipping.name,
      address: {
        line1: shipping.address.line1,
        line2: shipping.address.line2 || undefined,
        city: shipping.address.city || undefined,
        state: shipping.address.state || undefined,
        postal_code: shipping.address.postal_code,
        country: shipping.address.country,
      },
    },
    metadata: {
      timestamp: String(timestamp),
      style,
      size,
      sku: PRODIGI_PRODUCTS[style].sku,
      prodigi_size: PRODIGI_SIZES[size],
      artwork_url: artworkUrl(timestamp),
      clock_corrected: clockCorrected ? "yes" : "no",
    },
  });

  return NextResponse.json({
    id: pi.id,
    clientSecret: pi.client_secret,
    timestamp,
    clockCorrected,
  });
}
