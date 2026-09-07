import { NextResponse } from "next/server";
import {
  buildProdigiOrderPayload,
  createProdigiOrder,
  ProdigiError,
  type CheckoutRecipient,
  type ShippingMethod,
} from "@/lib/prodigi";
import type { CartItem } from "@/lib/cart";

type CheckoutBody = {
  items: CartItem[];
  recipient: CheckoutRecipient;
  shippingMethod: ShippingMethod;
};

export async function POST(req: Request) {
  let body: CheckoutBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { items, recipient, shippingMethod } = body ?? {};

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }
  if (
    !recipient?.name ||
    !recipient?.email ||
    !recipient?.address?.line1 ||
    !recipient?.address?.townOrCity ||
    !recipient?.address?.postalOrZipCode ||
    !recipient?.address?.countryCode
  ) {
    return NextResponse.json(
      { error: "Please fill out all required shipping fields." },
      { status: 400 }
    );
  }
  if (!shippingMethod) {
    return NextResponse.json({ error: "Missing shipping method." }, { status: 400 });
  }

  const merchantReference = `NSC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const assetBaseUrl = new URL(req.url).origin;

  const payload = buildProdigiOrderPayload({
    items,
    recipient,
    shippingMethod,
    merchantReference,
    assetBaseUrl,
  });

  try {
    const result = await createProdigiOrder(payload);
    return NextResponse.json({
      merchantReference,
      prodigiOutcome: result.outcome,
      prodigiOrderId: result.order?.id ?? null,
      status: result.order?.status?.stage ?? "Unknown",
    });
  } catch (err) {
    if (err instanceof ProdigiError) {
      console.error("Prodigi order creation failed:", err.message, err.details);
      return NextResponse.json(
        {
          error:
            "We couldn't place your order with our print partner. Please double-check your shipping address and try again.",
          detail: err.message,
        },
        { status: 502 }
      );
    }
    console.error("Checkout failed:", err);
    return NextResponse.json(
      { error: "Something went wrong placing your order." },
      { status: 500 }
    );
  }
}
