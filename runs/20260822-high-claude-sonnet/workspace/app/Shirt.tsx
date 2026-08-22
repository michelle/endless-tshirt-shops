"use client";

import { useEffect, useState } from "react";
import type { ShirtStyle } from "@/lib/products";

const FITTED_PATH =
  "M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721 s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875 c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117 C92.185,29.288,80.945,16.781,79.312,15.149z";

const UNISEX_PATH =
  "M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724 C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06 l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z";

export default function Shirt({ style }: { style: ShirtStyle }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 47);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-md select-none">
      <svg viewBox="0 0 100 125" width="100%" className="drop-shadow-sm">
        <g>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            fill="#0b0b0c"
            d={style === "fitted" ? FITTED_PATH : UNISEX_PATH}
          />
        </g>
      </svg>
      <div
        className="tabular absolute left-0 top-[26%] w-full text-center text-white"
        style={{ fontFamily: "Chivo, sans-serif" }}
      >
        <div className="text-[6.5vw] font-medium leading-none sm:text-2xl">
          {now !== null ? now : " "}
        </div>
      </div>
      <div className="absolute left-[12%] top-[68%]">
        <span className="rounded bg-accent px-2 py-1 text-sm font-semibold text-white">
          <span className="mr-1 text-white/70 line-through">$30.00</span>
          $22.50
        </span>
      </div>
    </div>
  );
}
