import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

const chivoRegular = readFile(
  join(process.cwd(), "assets/fonts/Chivo-Regular.ttf")
);
const chivoBold = readFile(join(process.cwd(), "assets/fonts/Chivo-Bold.ttf"));
const chivoBlack = readFile(
  join(process.cwd(), "assets/fonts/Chivo-Black.ttf")
);

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/artwork/[stamp]">
) {
  const { stamp } = await ctx.params;
  const parsed = Number(stamp);
  const ms = Number.isFinite(parsed) ? parsed : Date.now();
  const date = new Date(ms);

  const dateLabel = date
    .toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();

  const timeLabel = `${date.toLocaleTimeString("en-US", {
    hour12: false,
    timeZone: "UTC",
  })}.${String(((ms % 1000) + 1000) % 1000).padStart(3, "0")}`;

  const [regular, bold, black] = await Promise.all([
    chivoRegular,
    chivoBold,
    chivoBlack,
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            fontSize: 32,
            letterSpacing: 12,
            color: "#ffffff",
            fontWeight: 400,
          }}
        >
          DATETIME.STORE
        </div>
        <div
          style={{
            fontSize: 44,
            color: "#ffffff",
            fontWeight: 700,
            letterSpacing: 3,
          }}
        >
          {dateLabel}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 92,
            color: "#ffffff",
            fontWeight: 900,
            letterSpacing: 1,
          }}
        >
          {timeLabel}
        </div>
        <div
          style={{
            fontSize: 26,
            letterSpacing: 8,
            color: "#ffffff",
            fontWeight: 400,
          }}
        >
          UTC
        </div>
      </div>
    ),
    {
      width: 1000,
      height: 1000,
      fonts: [
        { name: "Chivo", data: regular, style: "normal", weight: 400 },
        { name: "Chivo", data: bold, style: "normal", weight: 700 },
        { name: "Chivo", data: black, style: "normal", weight: 900 },
      ],
    }
  );
}
