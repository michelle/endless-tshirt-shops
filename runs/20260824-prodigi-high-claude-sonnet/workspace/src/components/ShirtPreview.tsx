"use client";

import { useEffect, useRef, useState } from "react";
import type { ShirtColor, ShirtStyle } from "@/lib/product";
import { COMPARE_AT_USD_CENTS, PRICE_USD_CENTS } from "@/lib/product";

const PATHS: Record<ShirtStyle, string> = {
  fitted:
    "M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721   s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875   c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117   C92.185,29.288,80.945,16.781,79.312,15.149z",
  unisex:
    "M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724   C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06   l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z",
};

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ShirtPreview({
  style,
  color,
  disabled,
}: {
  style: ShirtStyle;
  color: ShirtColor;
  disabled?: boolean;
}) {
  const [nowMs, setNowMs] = useState<number | null>(null);
  const frame = useRef<number>(0);

  useEffect(() => {
    setNowMs(Date.now());
    if (disabled) return;
    const tick = () => {
      setNowMs(Date.now());
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [disabled]);

  const garmentFill = color === "white" ? "#f5f4f0" : "#171716";
  const garmentStroke = color === "white" ? "#d8d6cd" : "#000000";
  const textColor = color === "white" ? "#0a0a0a" : "#f5f4f0";

  return (
    <div className="relative w-full max-w-md select-none">
      <svg viewBox="0 0 100 125" className="w-full drop-shadow-2xl">
        <path
          d={PATHS[style]}
          fill={garmentFill}
          stroke={garmentStroke}
          strokeWidth={0.5}
        />
      </svg>

      <div
        className="absolute inset-x-0 top-[18%] flex flex-col items-center gap-0.5 font-mono"
        style={{ color: textColor }}
      >
        <div className="text-[10px] tracking-[0.3em] opacity-60">LIVE PREVIEW</div>
        <div className="text-lg sm:text-xl font-bold tabular-nums tracking-tight">
          {nowMs === null ? "—" : nowMs.toLocaleString("en-US").replace(/,/g, "")}
        </div>
        <div className="text-[9px] tracking-widest opacity-50">MS SINCE EPOCH</div>
      </div>

      <div className="absolute left-[8%] top-[68%]">
        <div className="rounded-full bg-orange-500/90 px-3 py-1 text-xs font-semibold text-neutral-950 shadow-lg font-mono">
          <span className="line-through opacity-60 mr-1.5">
            {formatMoney(COMPARE_AT_USD_CENTS)}
          </span>
          {formatMoney(PRICE_USD_CENTS)}
        </div>
      </div>
    </div>
  );
}
