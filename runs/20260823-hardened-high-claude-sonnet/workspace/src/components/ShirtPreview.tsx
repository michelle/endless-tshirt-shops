"use client";

import { useEffect, useState } from "react";
import { shirtDesignSvg } from "@/lib/design";
import type { ShirtStyle } from "@/lib/product";

/**
 * Renders the live (or frozen) on-shirt design. When `frozenAt` is omitted,
 * the clock ticks in real time; passing a date freezes the preview, used
 * once checkout has captured "this exact moment".
 */
export default function ShirtPreview({
  style,
  frozenAt,
}: {
  style: ShirtStyle;
  frozenAt?: Date | null;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (frozenAt) return;
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 33);
    return () => clearInterval(id);
  }, [frozenAt]);

  const date = frozenAt ?? now;

  return (
    <div className="w-full max-w-xl aspect-[16/10] rounded-3xl overflow-hidden shadow-2xl shadow-black/50 bg-[#101014] ring-1 ring-white/10">
      {date ? (
        <div
          className="h-full w-full"
          dangerouslySetInnerHTML={{ __html: shirtDesignSvg(date, style) }}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-white/5" />
      )}
    </div>
  );
}
