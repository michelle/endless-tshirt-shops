"use client";

import { useEffect, useState } from "react";

/** The scrolling band across the top. Two copies, so the loop is seamless. */
export function Ticker({ items }: { items: string[] }) {
  const run = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-b border-ink/10 bg-ink text-paper">
      <div className="marquee-track flex w-max whitespace-nowrap py-2">
        {run.map((text, i) => (
          <span
            key={i}
            className="stamp flex items-center gap-6 px-6 text-[10px] opacity-90 sm:text-[11px]"
          >
            {text}
            <span className="text-flame">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** A quiet clock that only exists to prove the site is awake. */
export function LiveClock({ className = "" }: { className?: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setText(
        `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(
          d.getUTCSeconds(),
        ).padStart(2, "0")}`,
      );
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={`font-mono tabular-nums ${className}`} suppressHydrationWarning>
      {text || "--:--:--"} <span className="opacity-50">UTC</span>
    </span>
  );
}

export function Label({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <span className="stamp text-[10px] text-ink-soft">{children}</span>
      {note && <span className="font-mono text-[10px] text-ink-faint">{note}</span>}
    </div>
  );
}

/** Soft colour behind the paper, so the page is not a flat rectangle. */
export function Blooms() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-[15%] top-[-10%] h-[60vmax] w-[60vmax] rounded-full opacity-[0.28] blur-[80px]"
        style={{
          background: "radial-gradient(circle, #ffb199 0%, rgba(255,177,153,0) 66%)",
          animation: "bloom 26s ease-in-out infinite",
        }}
      />
      <div
        className="absolute right-[-18%] top-[22%] h-[55vmax] w-[55vmax] rounded-full opacity-[0.22] blur-[90px]"
        style={{
          background: "radial-gradient(circle, #9fb4ff 0%, rgba(159,180,255,0) 66%)",
          animation: "bloom 34s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute bottom-[-20%] left-[30%] h-[50vmax] w-[50vmax] rounded-full opacity-[0.18] blur-[90px]"
        style={{
          background: "radial-gradient(circle, #ffe08a 0%, rgba(255,224,138,0) 66%)",
          animation: "bloom 30s ease-in-out infinite",
        }}
      />
    </div>
  );
}
