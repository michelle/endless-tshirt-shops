import { NextRequest } from "next/server";
import { fulfil } from "@/lib/fulfil";
import { COUNTRY_CODES } from "@/lib/geo";
import { ShippingOptionId, totals } from "@/lib/pricing";
import { authorize } from "@/lib/sandboxPay";
import { unpack } from "@/lib/sign";
import { sanitizeSpec, Spec } from "@/lib/spec";
import { stripeEnabled } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 60;

type DemoSession = {
  k: string;
  ref: string;
  spec: Spec;
  qty: number;
  shipping: ShippingOptionId;
  origin: string;
  amount: number;
  iat: number;
};

const req0 = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(req: NextRequest) {
  if (stripeEnabled()) {
    return Response.json({ error: "This deployment takes real payments through Stripe." }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const session = unpack<DemoSession>(req0(body?.token));
  if (!session || session.k !== "demo") {
    return Response.json({ error: "This checkout link is not valid." }, { status: 400 });
  }
  if (Date.now() - session.iat > 24 * 3600 * 1000) {
    return Response.json({ error: "This checkout link has expired. Please start again." }, { status: 400 });
  }

  const name = req0(body?.address?.name);
  const email = req0(body?.email);
  const line1 = req0(body?.address?.line1);
  const city = req0(body?.address?.city);
  const postal = req0(body?.address?.postal);
  const country = req0(body?.address?.country).toUpperCase();

  if (!name) return Response.json({ error: "Enter the delivery name." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!line1) return Response.json({ error: "Enter a street address." }, { status: 400 });
  if (!city) return Response.json({ error: "Enter a town or city." }, { status: 400 });
  if (!postal) return Response.json({ error: "Enter a postal or ZIP code." }, { status: 400 });
  if (!COUNTRY_CODES.includes(country)) return Response.json({ error: "We do not ship to that country yet." }, { status: 400 });

  const auth = authorize({
    number: req0(body?.card?.number),
    exp: req0(body?.card?.exp),
    cvc: req0(body?.card?.cvc),
    name: req0(body?.card?.name),
  });
  if (!auth.ok) return Response.json({ error: auth.message, code: auth.code }, { status: 402 });

  // Payment has succeeded; only now do we send anything to the printer.
  const spec = sanitizeSpec(session.spec);
  const t = totals(spec, session.qty, session.shipping);

  try {
    const { order, alreadyExisted } = await fulfil({
      ref: session.ref,
      spec,
      qty: t.qty,
      shipping: session.shipping,
      origin: session.origin,
      email,
      recipient: {
        name,
        phone: req0(body?.phone) || undefined,
        address: {
          line1,
          line2: req0(body?.address?.line2) || null,
          townOrCity: city,
          stateOrCounty: req0(body?.address?.state) || null,
          postalOrZipCode: postal,
          countryCode: country,
        },
      },
      paymentRef: auth.authId,
      amountCents: t.total,
    });

    return Response.json({
      ref: session.ref,
      prodigiOrderId: order.id,
      deduplicated: alreadyExisted,
      paid: { brand: auth.brand, last4: auth.last4, amount: t.total },
    });
  } catch (err: any) {
    console.error("sandbox fulfilment failed", err);
    return Response.json(
      { error: `Payment was authorised but the print order failed: ${err.message}` },
      { status: 502 },
    );
  }
}
