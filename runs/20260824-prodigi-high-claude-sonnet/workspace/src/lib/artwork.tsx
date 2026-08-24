import type { ReactElement } from "react";

export const ARTWORK_WIDTH = 2000;
export const ARTWORK_HEIGHT = 2500;

export type GarmentColor = "white" | "black";

export function formatArtworkFields(epochMs: number) {
  const d = new Date(epochMs);
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(d)
    .toUpperCase();

  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(d);

  const ms = String(epochMs % 1000).padStart(3, "0");

  return { date, time, ms, epoch: String(epochMs) };
}

export function buildArtworkElement(epochMs: number, garment: GarmentColor): ReactElement {
  const { date, time, ms, epoch } = formatArtworkFields(epochMs);

  // Choose card colors for print contrast against the garment.
  const isDarkCard = garment === "white";
  const cardBg = isDarkCard ? "#0a0a0f" : "#f6f5f1";
  const fg = isDarkCard ? "#f6f5f1" : "#0a0a0f";
  const accent = "#ff5a36";
  const dim = isDarkCard ? "#8a8a94" : "#6b6b70";
  const border = isDarkCard ? "#25252c" : "#dcdad2";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        fontFamily: "SpaceMono",
      }}
    >
      <div
        style={{
          width: "88%",
          height: "72%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          background: cardBg,
          border: `6px solid ${border}`,
          borderRadius: 48,
          padding: "72px 56px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ width: 20, height: 20, borderRadius: 20, background: accent, display: "flex" }} />
          <div
            style={{
              color: dim,
              fontSize: 34,
              letterSpacing: 10,
            }}
          >
            ORDERED AT THIS EXACT MOMENT
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              color: fg,
              fontSize: 92,
              letterSpacing: 6,
              display: "flex",
            }}
          >
            {date}
          </div>
          <div
            style={{
              color: fg,
              fontSize: 220,
              lineHeight: 1,
              display: "flex",
              alignItems: "baseline",
              marginTop: 12,
            }}
          >
            <span style={{ display: "flex" }}>{time}</span>
            <span style={{ display: "flex", color: accent, fontSize: 110, marginLeft: 8 }}>.{ms}</span>
          </div>
          <div
            style={{
              color: dim,
              fontSize: 40,
              letterSpacing: 14,
              marginTop: 18,
              display: "flex",
            }}
          >
            UTC
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              color: dim,
              fontSize: 28,
              letterSpacing: 4,
              display: "flex",
            }}
          >
            {epoch} MS SINCE EPOCH
          </div>
          <div
            style={{
              color: fg,
              fontSize: 44,
              letterSpacing: 12,
              display: "flex",
            }}
          >
            DATETIME.STORE
          </div>
        </div>
      </div>
    </div>
  );
}
