import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const stamp = new URL(request.url).searchParams.get("stamp");
  const date = stamp ? new Date(stamp) : new Date();
  const moment = Number.isNaN(date.getTime()) ? "THE MOMENT GOT AWAY" : date.toISOString().replace("T", " ").replace("Z", " UTC");
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "transparent", color: "white", fontFamily: "monospace", textAlign: "center", padding: 190 }}>
      <div style={{ fontSize: 76, letterSpacing: 18, marginBottom: 90 }}>THE INSTANT WAS</div>
      <div style={{ fontSize: 172, fontWeight: 700, letterSpacing: -12, whiteSpace: "nowrap" }}>{moment}</div>
      <div style={{ fontSize: 76, letterSpacing: 13, marginTop: 90 }}>AND THEN IT WASN&apos;T.</div>
    </div>,
    { width: 4688, height: 5881 },
  );
}
