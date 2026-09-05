"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { compose, DESIGN_WIDTH, type Block, type DialectId } from "@/lib/dialects";

const FONT_STACK: Record<string, string> = {
  mono: "var(--font-mono)",
  monoBold: "var(--font-mono)",
  serifItalic: "var(--font-display)",
};

/**
 * The artwork, live, in HTML — the same block list the 300dpi renderer reads,
 * measured into the same 1000-unit column. It ticks at frame rate by writing
 * straight into the DOM: React only re-renders when the shape of the
 * composition changes, not sixty times a second.
 */
export function PrintArt({
  dialect,
  timeZone,
  frozenMs,
  ink,
  className,
  hz = 60,
}: {
  dialect: DialectId;
  timeZone: string;
  frozenMs: number | null;
  ink: string;
  className?: string;
  /** Repaints per second. The hero runs flat out; specimens idle. */
  hz?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLSpanElement | null)[]>([]);
  const [scale, setScale] = useState(0);

  // Structure only — text is overwritten every frame below.
  const seed = frozenMs ?? 1_700_000_000_000;
  const { blocks } = compose(dialect, seed, timeZone);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / DESIGN_WIDTH);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const paint = (ms: number) => {
      const next = compose(dialect, ms, timeZone).blocks;
      for (let i = 0; i < next.length; i++) {
        const b = next[i];
        const node = slots.current[i];
        if (node && b.kind === "text" && node.textContent !== b.text) node.textContent = b.text;
      }
    };

    if (frozenMs !== null) {
      paint(frozenMs);
      return;
    }

    let raf = 0;
    let last = 0;
    const interval = 1000 / Math.max(1, hz);
    const loop = (t: number) => {
      if (t - last >= interval) {
        last = t;
        paint(Date.now());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [dialect, timeZone, frozenMs, hz]);

  return (
    <div ref={host} className={className} style={{ color: ink }} aria-hidden>
      {scale > 0 &&
        blocks.map((block, i) => <BlockView key={i} block={block} scale={scale} index={i} slots={slots} />)}
    </div>
  );
}

function BlockView({
  block,
  scale,
  index,
  slots,
}: {
  block: Block;
  scale: number;
  index: number;
  slots: React.RefObject<(HTMLSpanElement | null)[]>;
}) {
  const line = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState(1);

  // The print renderer shrinks any line that would run off the chest; do the
  // same here so the preview never lies about what gets printed.
  useLayoutEffect(() => {
    const node = line.current;
    const box = node?.parentElement;
    if (!node || !box) return;
    node.style.transform = "none";
    const available = box.clientWidth;
    const actual = node.getBoundingClientRect().width;
    setFit(actual > available && available > 0 ? available / actual : 1);
  }, [scale, block]);

  if (block.kind === "rule") {
    return (
      <div
        style={{
          width: block.width * scale,
          height: Math.max(1, 3.5 * scale),
          marginTop: block.gap * scale,
          marginInline: "auto",
          background: "currentColor",
          opacity: block.opacity,
        }}
      />
    );
  }

  const track = block.tracking * block.size * scale;
  return (
    <div
      style={{
        marginTop: block.gap * scale,
        textAlign: "center",
        opacity: block.opacity,
        lineHeight: 1,
      }}
    >
      <span
        ref={(node) => {
          line.current = node;
          slots.current[index] = node;
        }}
        style={{
          transform: fit < 1 ? `scale(${fit})` : undefined,
          transformOrigin: "center",
          display: "inline-block",
          fontFamily: FONT_STACK[block.font],
          fontWeight: block.font === "monoBold" ? 700 : 400,
          fontStyle: block.font === "serifItalic" ? "italic" : "normal",
          fontSize: block.size * scale,
          letterSpacing: track,
          textIndent: track,
          whiteSpace: "nowrap",
        }}
      >
        {block.text}
      </span>
    </div>
  );
}
