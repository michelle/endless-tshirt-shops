import { ImageResponse } from "next/og";

export const runtime = "edge";

// Print artwork is rendered at 300dpi for an 8in-wide chest print
// (matching the original datetime.store print spec: 8in wide, DTG).
const PRINT_WIDTH = 2400;
const PRINT_HEIGHT = 800;
const PREVIEW_SIZE = 600;

const chivo = fetch(new URL("./Chivo-Medium.ttf", import.meta.url)).then((r) =>
  r.arrayBuffer()
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tsRaw = searchParams.get("ts");
  const ts = tsRaw && /^\d{1,17}$/.test(tsRaw) ? tsRaw : null;
  if (!ts) {
    return new Response("ts query param (epoch milliseconds) is required", {
      status: 400,
    });
  }
  const variant = searchParams.get("variant") === "preview" ? "preview" : "print";
  const fontData = await chivo;

  if (variant === "preview") {
    // Square black tile with the datetime — used as the Stripe Checkout
    // product image so the white text is visible.
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#111",
            color: "#fff",
            fontFamily: "Chivo",
          }}
        >
          <div style={{ fontSize: 64, letterSpacing: 2 }}>{ts}</div>
          <div style={{ fontSize: 24, marginTop: 28, color: "#9ec9ef" }}>
            the datetime shirt
          </div>
        </div>
      ),
      {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        fonts: [{ name: "Chivo", data: fontData, weight: 500 }],
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      }
    );
  }

  // Print file: white datetime on a transparent background, sized to fill
  // the width so `fitPrintArea` produces a full-width chest print.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
          color: "#ffffff",
          fontFamily: "Chivo",
          fontSize: 240,
          letterSpacing: 5,
        }}
      >
        {ts}
      </div>
    ),
    {
      width: PRINT_WIDTH,
      height: PRINT_HEIGHT,
      fonts: [{ name: "Chivo", data: fontData, weight: 500 }],
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
