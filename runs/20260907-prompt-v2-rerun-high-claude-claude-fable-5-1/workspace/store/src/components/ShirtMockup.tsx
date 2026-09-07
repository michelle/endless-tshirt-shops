import { ShirtColor } from "@/lib/catalog";

/**
 * A flat t-shirt illustration with the poster artwork placed on the chest.
 * Pure SVG so it recolours instantly when the customer picks a shirt colour.
 */
export function ShirtMockup({ slug, color, className, priority }: { slug: string; color: ShirtColor; className?: string; priority?: boolean }) {
  const shade = color.dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const seam = color.dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";
  return (
    <svg viewBox="0 0 400 440" className={className} role="img" aria-label={`${slug} design on a ${color.name} shirt`}>
      <defs>
        <clipPath id={`body-${slug}-${color.id}`}>
          <path d="M120 52 L38 96 L70 168 L116 152 L116 404 L284 404 L284 152 L330 168 L362 96 L280 52 C264 78 136 78 120 52 Z" />
        </clipPath>
      </defs>
      {/* drop shadow */}
      <path d="M124 60 L44 104 L76 174 L122 158 L122 410 L290 410 L290 158 L336 174 L368 104 L286 60 C270 86 140 86 124 60 Z" fill="rgba(0,0,0,0.12)" />
      {/* body */}
      <path d="M120 52 L38 96 L70 168 L116 152 L116 404 L284 404 L284 152 L330 168 L362 96 L280 52 C264 78 136 78 120 52 Z" fill={color.hex} />
      {/* subtle shading on the sleeves and side */}
      <g clipPath={`url(#body-${slug}-${color.id})`}>
        <path d="M38 96 L70 168 L116 152 L116 404 L100 404 L80 180 L60 172 Z" fill={shade} />
        <path d="M362 96 L330 168 L284 152 L284 200 L300 176 L340 172 Z" fill={shade} />
        <path d="M116 150 L118 404 L124 404 L122 150 Z" fill={seam} />
        <path d="M284 150 L282 404 L276 404 L278 150 Z" fill={seam} />
      </g>
      {/* collar */}
      <path d="M120 52 C136 78 264 78 280 52" fill="none" stroke={seam} strokeWidth="9" strokeLinecap="round" />
      <path d="M120 52 C136 78 264 78 280 52" fill="none" stroke={color.hex} strokeWidth="5" strokeLinecap="round" />
      {/* artwork: print is ~11in wide on a ~20in wide shirt */}
      <image
        href={`/art/${slug}.png`}
        x="140"
        y="112"
        width="120"
        height="160"
        preserveAspectRatio="xMidYMid meet"
        {...(priority ? { fetchPriority: "high" as const } : {})}
      />
    </svg>
  );
}
