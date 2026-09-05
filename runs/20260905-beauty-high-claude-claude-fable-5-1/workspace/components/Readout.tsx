"use client";

import { useEffect, useState } from "react";

/** The human translation of the number on the shirt. */
export default function Readout({ frozenTs }: { frozenTs: number | null }) {
  const [now, setNow] = useState<number | null>(null);
  const [tz, setTz] = useState("your time zone");

  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " "));
    if (frozenTs !== null) {
      setNow(frozenTs);
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, [frozenTs]);

  if (now === null) return <div className="moment-readout">&nbsp;</div>;
  const d = new Date(now);
  const date = d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour12: false });
  const ms = String(now % 1000).padStart(3, "0");

  return (
    <div className="moment-readout">
      {frozenTs !== null ? "You froze " : "That's "}
      <span className="mono">
        {date}, {time}.{ms}
      </span>{" "}
      in {tz}.
      <small>{frozenTs !== null ? "It will never be this exact moment again." : "It keeps going. The shirt stops it."}</small>
    </div>
  );
}
