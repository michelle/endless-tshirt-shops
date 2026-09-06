import { GARMENT_BY_ID } from "@/lib/design";

/**
 * Garment + artwork preview. The tee is inline SVG (so it recolours instantly
 * and needs no image assets) and the print is the same transparent PNG we send
 * to Prodigi, positioned over the chest at roughly the real print placement.
 */
export function ShirtMockup({
  artUrl,
  garmentId,
  alt,
}: {
  artUrl: string;
  garmentId: string;
  alt: string;
}) {
  const garment = GARMENT_BY_ID[garmentId] ?? GARMENT_BY_ID["black"];
  const shade = garment.dark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.13)";

  return (
    <div className="mockup">
      <svg viewBox="0 0 400 460" aria-hidden="true">
        <defs>
          <linearGradient id={`fold-${garment.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={shade} />
            <stop offset="18%" stopColor="rgba(0,0,0,0)" />
            <stop offset="82%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor={shade} />
          </linearGradient>
        </defs>
        <path
          d="M140,20 C160,50 240,50 260,20 L302,34 L364,78 L384,152 L330,178 L316,144 L316,438 L84,438 L84,144 L70,178 L16,152 L36,78 L98,34 Z"
          fill={garment.hex}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="1"
        />
        <path
          d="M140,20 C160,50 240,50 260,20 L302,34 L364,78 L384,152 L330,178 L316,144 L316,438 L84,438 L84,144 L70,178 L16,152 L36,78 L98,34 Z"
          fill={`url(#fold-${garment.id})`}
        />
        {/* Collar rib */}
        <path
          d="M143,25 C163,55 237,55 257,25"
          fill="none"
          stroke="rgba(0,0,0,0.28)"
          strokeWidth="6"
        />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mockup-print" src={artUrl} alt={alt} />
    </div>
  );
}
