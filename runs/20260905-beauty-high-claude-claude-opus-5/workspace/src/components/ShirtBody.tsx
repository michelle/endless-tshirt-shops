"use client";

import { COLORWAYS, FITS, type ColorwayId, type FitId } from "@/lib/catalog";
import {
  bodyPath,
  chestBox,
  collarPath,
  foldPaths,
  seamPaths,
  SHIRT_VIEW,
  SILHOUETTES,
  stitchPaths,
} from "./shirt-geometry";

/**
 * One drawing of a t-shirt, used by both the shop floor and the receipt.
 * `children` are laid over the chest, where the print goes.
 */
export function ShirtBody({
  fit,
  colorway,
  children,
  className = "",
}: {
  fit: FitId;
  colorway: ColorwayId;
  children?: React.ReactNode;
  className?: string;
}) {
  const s = SILHOUETTES[fit];
  const c = COLORWAYS[colorway];
  const chest = chestBox(s);
  const id = `tee-${fit}-${colorway}`;
  const body = bodyPath(s);

  return (
    <div className={`relative w-full ${className}`}>
      <svg
        viewBox={`0 0 ${SHIRT_VIEW.width} ${SHIRT_VIEW.height}`}
        className="w-full drop-shadow-[0_26px_34px_rgba(22,19,15,0.14)]"
        role="img"
        aria-label={`${c.name} ${FITS[fit].name} t-shirt`}
      >
        <defs>
          {/* Across the body: shadow, cloth, the light down the middle, back to shadow. */}
          <linearGradient id={`${id}-across`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={c.clothShade} />
            <stop offset="9%" stopColor={c.cloth} />
            <stop offset="40%" stopColor={c.clothLight} />
            <stop offset="62%" stopColor={c.cloth} />
            <stop offset="91%" stopColor={c.cloth} />
            <stop offset="100%" stopColor={c.clothShade} />
          </linearGradient>
          {/* Down the body: cotton falls away from the light towards the hem. */}
          <linearGradient id={`${id}-down`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
            <stop offset="34%" stopColor="#ffffff" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.16" />
          </linearGradient>
          <filter id={`${id}-soft`} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <clipPath id={`${id}-clip`}>
            <path d={body} />
          </clipPath>
        </defs>

        <path d={body} fill={`url(#${id}-across)`} />

        <g clipPath={`url(#${id}-clip)`}>
          <path d={body} fill={`url(#${id}-down)`} />
          <g stroke={c.clothShade} fill="none" filter={`url(#${id}-soft)`} opacity="0.34">
            {foldPaths(s).map((d, i) => (
              <path key={i} d={d} strokeWidth="13" strokeLinecap="round" />
            ))}
          </g>
          {/* A whisper of light down the centre front. */}
          <path
            d={`M300 ${s.neckY + s.neckDepth + 10}L300 ${s.hemY}`}
            stroke={c.clothLight}
            strokeWidth="46"
            filter={`url(#${id}-soft)`}
            opacity="0.2"
          />
        </g>

        <g stroke={c.dark ? c.clothLight : c.clothShade} fill="none" strokeWidth="1.8" opacity="0.55">
          {seamPaths(s).map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        <g
          stroke={c.dark ? c.clothLight : c.clothShade}
          fill="none"
          strokeWidth="1.5"
          strokeDasharray="5 7"
          opacity="0.42"
        >
          {stitchPaths(s).map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* The ribbed collar. Clipped to the body, so only the half of the
            stroke that lies on cloth shows and the neckline stays a clean hole. */}
        <g clipPath={`url(#${id}-clip)`}>
          <path d={collarPath(s)} fill="none" stroke={c.clothLight} strokeWidth="30" opacity="0.75" />
          <path d={collarPath(s)} fill="none" stroke={c.clothShade} strokeWidth="34" opacity="0.22" />
          <path d={collarPath(s)} fill="none" stroke={c.clothLight} strokeWidth="19" opacity="0.85" />
        </g>

        {/* A hairline all the way round, so pale garments still have an edge. */}
        <path d={body} fill="none" stroke={c.clothShade} strokeWidth="1.4" opacity="0.5" />
      </svg>

      {children && (
        <div
          className="absolute"
          style={{
            left: `${chest.left * 100}%`,
            top: `${chest.top * 100}%`,
            width: `${chest.width * 100}%`,
          }}
        >
          <div
            style={{
              // Cotton eats a little ink; nothing prints as pure as it looks.
              opacity: 0.94,
              mixBlendMode: c.dark ? "screen" : "multiply",
              filter: "contrast(0.97)",
            }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/** The print file, scaled so its design column lines up with the chest box. */
export function PrintImage({ src, onLoad, hidden }: { src: string; onLoad?: () => void; hidden?: boolean }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt="The print on your shirt"
      onLoad={onLoad}
      style={{
        display: hidden ? "none" : "block",
        width: "125%",
        marginLeft: "-12.5%",
        marginTop: "-20.9%",
      }}
    />
  );
}
