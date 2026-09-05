"use client";

import type { StyleId } from "@/lib/products";

const CLIP_PATHS: Record<StyleId, string> = {
  // Boxier body, straight sides.
  unisex:
    "polygon(22% 0%, 38% 0%, 50% 9%, 62% 0%, 78% 0%, 100% 19%, 86% 34%, 78% 27%, 78% 100%, 22% 100%, 22% 27%, 14% 34%, 0% 19%)",
  // Tapered waist for a fitted silhouette.
  fitted:
    "polygon(22% 0%, 38% 0%, 50% 9%, 62% 0%, 78% 0%, 100% 19%, 86% 34%, 78% 27%, 82% 62%, 76% 100%, 24% 100%, 18% 62%, 22% 27%, 14% 34%, 0% 19%)",
};

const ACCENTS: Record<StyleId, string> = {
  fitted: "#ff6ad5",
  unisex: "#7cf7ff",
};

function pad(n: number, width: number) {
  return n.toString().padStart(width, "0");
}

interface ShirtPreviewProps {
  style: StyleId;
  timestampMs: number;
  frozen: boolean;
}

export default function ShirtPreview({ style, timestampMs, frozen }: ShirtPreviewProps) {
  const date = new Date(timestampMs);
  const dateLabel = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
  const timeLabel = `${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)}.${pad(date.getUTCMilliseconds(), 3)} UTC`;
  const accent = ACCENTS[style];

  return (
    <div className="relative mx-auto w-full max-w-sm select-none">
      <div
        className="relative aspect-[4/5] w-full bg-gradient-to-b from-neutral-800 to-black shadow-2xl transition-[clip-path] duration-300"
        style={{ clipPath: CLIP_PATHS[style] }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_60%)]" />
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 pt-6">
        <span
          className="text-[10px] tracking-[0.5em] uppercase"
          style={{ color: accent }}
        >
          datetime.store
        </span>
        <span
          className="mt-3 block w-full break-all text-center font-mono text-2xl font-bold text-white sm:text-3xl"
          style={{ textShadow: `0 0 24px ${accent}55` }}
        >
          {timestampMs}
        </span>
        <span className="mt-3 font-mono text-xs text-white/80 sm:text-sm">
          {dateLabel}
        </span>
        <span className="mt-1 font-mono text-[11px]" style={{ color: accent }}>
          {timeLabel}
        </span>
      </div>

      {frozen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <span className="rounded-full border border-white/20 bg-black/60 px-4 py-1.5 text-xs font-medium tracking-wide text-white">
            Design locked in for your order
          </span>
        </div>
      )}
    </div>
  );
}
