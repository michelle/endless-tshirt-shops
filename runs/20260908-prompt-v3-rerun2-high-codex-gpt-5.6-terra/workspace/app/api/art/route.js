import { ImageResponse } from "next/og";

export const runtime = "edge";

function safe(value, max) { return String(value || "").replace(/[<>]/g, "").slice(0, max); }
function code(value) { return [...value].reduce((v, c) => ((v << 5) - v + c.charCodeAt(0)) | 0, 0) >>> 0; }

export async function GET(request) {
  let data = {};
  try { data = JSON.parse(atob(new URL(request.url).searchParams.get("d")?.replace(/-/g, "+").replace(/_/g, "/") || "")); } catch { return new Response("Invalid artwork", { status: 400 }); }
  const name = safe(data.name, 32).toUpperCase() || "YOUR NAME";
  const place = safe(data.place, 42).toUpperCase() || "SOMEWHERE TRUE";
  const mood = safe(data.mood, 16).toUpperCase() || "ELECTRIC";
  const seed = code(`${name}|${place}|${mood}`);
  const bars = Array.from({ length: 24 }, (_, i) => 95 + ((seed >> (i % 23)) & 31) * 11);
  const signal = (seed % 0xffffff).toString(16).padStart(6, "0").toUpperCase();
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#efe4c9", color: "#18241f", display: "flex", flexDirection: "column", padding: "170px 150px", fontFamily: "sans-serif", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 32, letterSpacing: 4 }}><span>SIGNAL FOUNDRY / 001</span><span>FIELD SIGNAL</span></div>
      <div style={{ fontSize: 220, fontWeight: 800, letterSpacing: -16, marginTop: 130, lineHeight: .9 }}>{name}</div>
      <div style={{ fontSize: 58, letterSpacing: 12, marginTop: 32 }}>{place}</div>
      <div style={{ height: 720, borderTop: "8px solid #18241f", borderBottom: "8px solid #18241f", display: "flex", alignItems: "center", gap: 24, marginTop: 180 }}>{bars.map((height, index) => <div key={index} style={{ width: 34, height, background: "#f07557" }} />)}</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 72, fontSize: 42, letterSpacing: 4 }}><span>STATE: {mood}</span><span>SF-{signal}</span></div>
      <div style={{ position: "absolute", right: 140, bottom: 120, color: "#f07557", fontSize: 190 }}>✦</div>
    </div>,
    { width: 2400, height: 3000, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
