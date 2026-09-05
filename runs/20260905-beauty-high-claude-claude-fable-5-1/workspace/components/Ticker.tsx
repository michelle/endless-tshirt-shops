"use client";

import { useEffect, useState } from "react";

const ROUND = 1_800_000_000_000; // 2027-01-15T08:00:00Z — the next big round number

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Some numbers about time, for people who like numbers about time. */
export default function Ticker() {
  const [now, setNow] = useState<number | null>(null);
  const [claimed, setClaimed] = useState<number | null>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d: { claimed: number | null; more?: boolean }) => {
        setClaimed(d.claimed);
        setMore(Boolean(d.more));
      })
      .catch(() => {});
    return () => clearInterval(id);
  }, []);

  const secs = now === null ? null : Math.floor(now / 1000);
  const days = now === null ? null : Math.floor((ROUND - now) / 86_400_000);

  return (
    <section className="ticker" aria-label="Facts about now">
      <div className="stat">
        <div className="stat-k">Moments claimed</div>
        <div className="stat-v">
          {claimed === null ? "—" : `${fmt(claimed)}${more ? "+" : ""}`}
          <small>and counting</small>
        </div>
      </div>
      <div className="stat">
        <div className="stat-k">Seconds since the epoch</div>
        <div className="stat-v">{secs === null ? "—" : fmt(secs)}</div>
      </div>
      <div className="stat">
        <div className="stat-k">Next round moment</div>
        <div className="stat-v">
          {fmt(ROUND)}
          <small>{days === null ? "" : days > 0 ? `in ${fmt(days)} days` : "has passed"}</small>
        </div>
      </div>
      <div className="stat">
        <div className="stat-k">Shirts that match yours</div>
        <div className="stat-v">
          0<small>guaranteed</small>
        </div>
      </div>
    </section>
  );
}
