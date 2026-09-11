import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/site";
import { PALETTES, PaletteId } from "@/lib/constellation";
import { isColor, isSize, MAX_QUANTITY, SIZE_LABELS, UNIT_PRICE_CENTS } from "@/lib/product";

export const runtime = "nodejs";

interface CheckoutBody {
  title: string;
  dateLabel: string;
  subtitle?: string;
  palette: PaletteId;
  color: string;
  size: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  let body: CheckoutBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const title = (body.title || "").trim();
  const dateLabel = (body.dateLabel || "").trim();
  const subtitle = (body.subtitle || "").trim();
  const palette = body.palette;
  const color = body.color;
  const size = body.size;
  const quantity = Number(body.quantity) || 1;

  if (!title || title.length > 40) {
    return NextResponse.json({ error: "Title is required (max 40 characters)." }, { status: 400 });
  }
  if (!dateLabel || dateLabel.length > 40) {
    return NextResponse.json({ error: "Date is required (max 40 characters)." }, { status: 400 });
  }
  if (subtitle.length > 40) {
    return NextResponse.json({ error: "Subtitle must be 40 characters or fewer." }, { status: 400 });
  }
  if (!palette || !PALETTES[palette]) {
    return NextResponse.json({ error: "Invalid palette." }, { status: 400 });
  }
  if (!isColor(color)) {
    return NextResponse.json({ error: "Invalid shirt color." }, { status: 400 });
  }
  if (!isSize(size)) {
    return NextResponse.json({ error: "Invalid shirt size." }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return NextResponse.json({ error: `Quantity must be between 1 and ${MAX_QUANTITY}.` }, { status: 400 });
  }

  const baseUrl = getBaseUrl(req);
  const artworkParams = new URLSearchParams({ title, date: dateLabel, subtitle, palette });
  const previewImageUrl = `${baseUrl}/api/artwork?${artworkParams.toString()}&format=png`;

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity,
        price_data: {
          currency: "usd",
          unit_amount: UNIT_PRICE_CENTS,
          product_data: {
            name: `Constellate Tee — "${title}"`,
            description: `${SIZE_LABELS[size]} · ${color} · ${PALETTES[palette].name}`,
            images: [previewImageUrl],
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: ["US"] },
    phone_number_collection: { enabled: true },
    metadata: {
      design_title: title,
      design_date: dateLabel,
      design_subtitle: subtitle,
      design_palette: palette,
      shirt_color: color,
      shirt_size: size,
      quantity: String(quantity),
    },
    success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/design`,
  });

  return NextResponse.json({ url: session.url });
}
