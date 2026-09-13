import { buildDesign } from "@/lib/pattern";
import type { DesignSpec } from "@/lib/types";

// IMPORTANT: this component is rendered in two very different places with
// the exact same JSX tree:
//   1. In the browser, as a normal React component (live customizer preview).
//   2. On the server, fed directly into `satori` to rasterize the actual
//      print file sent to Prodigi.
// Because of (2) it may ONLY use inline `style` objects built from plain
// flexbox/box-model CSS (position/absolute, background, border-radius,
// transform) — no className, no external stylesheet, no hooks, no browser
// APIs. Keep it a pure function of props.
export default function DesignArt({
  spec,
  width,
  height,
}: {
  spec: DesignSpec;
  width: number;
  height: number;
}) {
  const design = buildDesign(spec);
  const circleSize = Math.min(width * 0.92, height * 0.72);
  const cx = circleSize / 2;
  const cy = circleSize / 2;
  const innerR = circleSize * 0.24;
  const maxLen = circleSize * 0.24;
  const barWidth = Math.max(2, (Math.PI * innerR * 2) / design.bars.length - 2);
  const discSize = circleSize * 0.62;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        width,
        height,
      }}
    >
      <div
        style={{
          display: "flex",
          position: "relative",
          width: circleSize,
          height: circleSize,
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: cx - discSize / 2,
            top: cy - discSize / 2,
            width: discSize,
            height: discSize,
            borderRadius: discSize / 2,
            background: design.discColor,
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: cx - (innerR + 2),
            top: cy - (innerR + 2),
            width: (innerR + 2) * 2,
            height: (innerR + 2) * 2,
            borderRadius: innerR + 2,
            border: `2px solid ${design.ringColor}`,
            opacity: 0.55,
          }}
        />
        {design.bars.map((bar, i) => {
          const len = 8 + bar.length * maxLen;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                position: "absolute",
                left: cx,
                top: cy,
                width: 0,
                height: 0,
                transform: `rotate(${bar.angle}deg)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  left: -barWidth / 2,
                  top: -(innerR + len),
                  width: barWidth,
                  height: len,
                  borderRadius: barWidth / 2,
                  background: bar.color,
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: height * 0.045,
          fontSize: Math.max(14, width * 0.062),
          fontWeight: 700,
          letterSpacing: 3,
          color: design.textColor,
          fontFamily: "Space Mono",
          textAlign: "center",
          maxWidth: width * 0.92,
        }}
      >
        {design.phraseDisplay}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: height * 0.018,
          fontSize: Math.max(10, width * 0.03),
          fontWeight: 400,
          letterSpacing: 4,
          color: design.textColor,
          opacity: 0.62,
          fontFamily: "Space Mono",
        }}
      >
        {`NO. ${design.patternCode}`}
      </div>
    </div>
  );
}
