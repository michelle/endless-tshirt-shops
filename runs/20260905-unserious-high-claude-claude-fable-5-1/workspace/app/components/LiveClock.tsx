"use client";

import { useEffect, useRef } from "react";

/** The current datetime, in milliseconds, relentlessly. */
export function LiveClock({ className, interval = 50 }: { className?: string; interval?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tick = () => {
      el.textContent = String(Date.now());
    };
    tick();
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval]);
  return (
    <span className={className} ref={ref} suppressHydrationWarning>
      …
    </span>
  );
}

/** Puts the current datetime in the tab title, because why not. */
export function LiveTitle({ suffix = "datetime.store" }: { suffix?: string }) {
  useEffect(() => {
    const original = document.title;
    const tick = () => {
      document.title = `${Date.now()} · ${suffix}`;
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
      document.title = original;
    };
  }, [suffix]);
  return null;
}
