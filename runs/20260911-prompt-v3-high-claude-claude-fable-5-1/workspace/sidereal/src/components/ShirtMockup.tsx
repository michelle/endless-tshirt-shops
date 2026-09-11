import { getGarment } from "@/lib/catalog";

/**
 * A simple flat-lay t-shirt with the design SVG placed on the chest print area.
 * `svg` is the raw (transparent) design SVG markup produced by buildSkyMapSvg.
 */
export function ShirtMockup({
  garment,
  svg,
  src,
  className = "",
}: {
  garment: string;
  /** Inline SVG markup (live studio preview) … */
  svg?: string | null;
  /** … or an image URL (transparent PNG) for static pages. */
  src?: string;
  className?: string;
}) {
  const g = getGarment(garment);
  const shade = g.dark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)";
  const light = g.dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.45)";
  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio: "400 / 440" }}>
      <svg viewBox="0 0 400 440" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="tee-shade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={shade} />
            <stop offset="0.18" stopColor="transparent" />
            <stop offset="0.82" stopColor="transparent" />
            <stop offset="1" stopColor={shade} />
          </linearGradient>
        </defs>
        <path
          d="M128,38 L44,74 L8,168 L82,196 L84,418 Q200,436 316,418 L318,196 L392,168 L356,74 L272,38 Q246,82 200,82 Q154,82 128,38 Z"
          fill={g.hex}
        />
        <path
          d="M128,38 L44,74 L8,168 L82,196 L84,418 Q200,436 316,418 L318,196 L392,168 L356,74 L272,38 Q246,82 200,82 Q154,82 128,38 Z"
          fill="url(#tee-shade)"
        />
        {/* sleeve seams */}
        <path d="M82,196 L96,120" fill="none" stroke={shade} strokeWidth="1.5" />
        <path d="M318,196 L304,120" fill="none" stroke={shade} strokeWidth="1.5" />
        {/* collar */}
        <path d="M128,38 Q154,82 200,82 Q246,82 272,38" fill="none" stroke={shade} strokeWidth="6" />
        <path d="M132,44 Q156,86 200,86 Q244,86 268,44" fill="none" stroke={light} strokeWidth="1.5" />
      </svg>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute" style={{ left: "28%", width: "44%", top: "24%" }} loading="lazy" />
      ) : (
        <div
          className="sky-svg absolute"
          style={{ left: "28%", width: "44%", top: "24%" }}
          dangerouslySetInnerHTML={{ __html: svg ?? "" }}
        />
      )}
    </div>
  );
}
