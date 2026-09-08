import { ImageResponse } from "@vercel/og";
import { NextRequest, NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripeServer";
import { parseMetadata } from "@/lib/orderData";
import { DESIGN_SPACE, generateSkyDesign } from "@/lib/sky";

// This route renders the ACTUAL print file we hand to Prodigi: a self
// contained dark "poster" panel (so it reads correctly printed on any
// garment color) generated deterministically from the order's stored
// design inputs. Prodigi fetches this URL directly, so it must be public
// and stable -- we gate it on the payment having succeeded rather than on
// any secret, since the PaymentIntent id itself is unguessable.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }
  const { id } = await params;

  const stripe = getStripe();
  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(id);
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (intent.status !== "succeeded") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
  }

  const order = parseMetadata(intent.metadata);
  if (!order) {
    return NextResponse.json({ error: "Missing design data" }, { status: 400 });
  }

  const design = generateSkyDesign({
    dateISO: order.skyDateISO,
    lat: order.skyLat,
    lon: order.skyLon,
    locationLabel: order.skyLocation,
    caption: order.skyCaption,
  });
  const { W, H } = DESIGN_SPACE;
  const moonLit = design.moon.illumination;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          position: "relative",
          background: "#070b1e",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 24,
            top: 24,
            width: W - 48,
            height: H - 48,
            border: "2px solid rgba(255,255,255,0.15)",
            borderRadius: 28,
            display: "flex",
          }}
        />

        {design.lines.map((l, i) => {
          const dx = l.x2 - l.x1;
          const dy = l.y2 - l.y1;
          const len = Math.hypot(dx, dy);
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <div
              key={`l${i}`}
              style={{
                position: "absolute",
                left: l.x1,
                top: l.y1,
                width: len,
                height: 2,
                background: "rgba(255,255,255,0.35)",
                transform: `rotate(${angle}deg)`,
                transformOrigin: "0 0",
                display: "flex",
              }}
            />
          );
        })}

        {design.stars.map((s, i) => (
          <div
            key={`s${i}`}
            style={{
              position: "absolute",
              left: s.x - s.r,
              top: s.y - s.r,
              width: s.r * 2,
              height: s.r * 2,
              borderRadius: s.r,
              background: `rgba(255,255,255,${s.o.toFixed(2)})`,
              display: "flex",
            }}
          />
        ))}

        <div
          style={{
            position: "absolute",
            left: design.moon.cx - design.moon.r,
            top: design.moon.cy - design.moon.r,
            width: design.moon.r * 2,
            height: design.moon.r * 2,
            borderRadius: design.moon.r,
            background: "#fdf6e3",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            left:
              design.moon.cx -
              design.moon.r +
              design.moon.r * (1.15 - moonLit * 2.3),
            top: design.moon.cy - design.moon.r * 1.02,
            width: design.moon.r * 2.04,
            height: design.moon.r * 2.04,
            borderRadius: design.moon.r * 1.02,
            background: "#070b1e",
            display: "flex",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 0,
            top: H - 300,
            width: W,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", color: "#ffffff", fontSize: 40, letterSpacing: 2 }}>
            {design.dateLabel.toUpperCase()}
          </div>
          <div style={{ display: "flex", color: "rgba(255,255,255,0.7)", fontSize: 28, marginTop: 14 }}>
            {design.timeLabel} · {design.coordLabel}
          </div>
          <div style={{ display: "flex", color: "rgba(255,255,255,0.7)", fontSize: 28, marginTop: 10 }}>
            {design.locationLabel}
          </div>
          {design.caption && (
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: 34,
                marginTop: 26,
                fontStyle: "italic",
              }}
            >
              {design.caption}
            </div>
          )}
        </div>
      </div>
    ),
    { width: W, height: H }
  );
  // @vercel/og's ImageResponse is a real Response (it extends the platform
  // Response used by Next's edge runtime) but its TS types are structurally
  // narrower than the `Response` the route-handler validator expects.
  return image as unknown as Response;
}
