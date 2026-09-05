"use client";

import { useEffect, useMemo, useState } from "react";

/** A sky that knows what time it is where you are. */
export default function Sky() {
  const [seed] = useState(() => 7);
  const stars = useMemo(() => {
    let s = seed;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: 90 }, (_, i) => ({
      id: i,
      left: rnd() * 100,
      top: rnd() * 80,
      dur: 2.5 + rnd() * 5,
      delay: rnd() * 6,
      big: rnd() > 0.85,
    }));
  }, [seed]);

  useEffect(() => {
    const apply = () => {
      const h = new Date().getHours();
      const d = h < 5 ? "night" : h < 8 ? "dawn" : h < 17 ? "day" : h < 20 ? "dusk" : "night";
      document.documentElement.setAttribute("data-daypart", d);
    };
    apply();
    const id = setInterval(apply, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="sky" aria-hidden="true">
      {stars.map((s) => (
        <span
          key={s.id}
          className={`sky-star${s.big ? " big" : ""}`}
          style={{ left: `${s.left}%`, top: `${s.top}%`, ["--dur" as string]: `${s.dur}s`, ["--delay" as string]: `${s.delay}s` }}
        />
      ))}
      <span className="sky-shooter" />
      <Cloud style={{ top: "18%", ["--dur" as string]: "110s", ["--delay" as string]: "-40s" }} scale={1} />
      <Cloud style={{ top: "34%", ["--dur" as string]: "150s", ["--delay" as string]: "-90s" }} scale={0.7} />
      <div className="sky-orb" />
      <div className="sky-horizon" />
    </div>
  );
}

function Cloud({ style, scale }: { style: React.CSSProperties; scale: number }) {
  return (
    <svg className="sky-cloud" style={style} width={220 * scale} height={70 * scale} viewBox="0 0 220 70">
      <g fill="rgba(255,255,255,0.75)">
        <ellipse cx="60" cy="45" rx="50" ry="22" />
        <ellipse cx="110" cy="35" rx="45" ry="28" />
        <ellipse cx="160" cy="45" rx="50" ry="22" />
      </g>
    </svg>
  );
}
