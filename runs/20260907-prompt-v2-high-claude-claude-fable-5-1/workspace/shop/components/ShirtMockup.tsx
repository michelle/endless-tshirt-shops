import { previewUrl, type ShirtColor } from "@/lib/catalog";

// A flat tee silhouette in the chosen colour with the badge composited on the chest.
export function ShirtMockup({ slug, color, className = "", priority = false }: { slug: string; color: ShirtColor; className?: string; priority?: boolean }) {
  const shade = color.ink === "light" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  const outline = color.ink === "light" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.22)";
  return (
    <div className={`relative aspect-[5/6] w-full ${className}`}>
      <svg viewBox="0 0 500 600" className="absolute inset-0 h-full w-full" aria-hidden>
        <path
          d="M160 40 C190 20 310 20 340 40 L470 100 L440 200 L385 180 L385 570 L115 570 L115 180 L60 200 L30 100 Z"
          fill={color.hex}
          stroke={outline}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M195 42 C215 78 285 78 305 42" fill="none" stroke={shade} strokeWidth="10" strokeLinecap="round" />
        <path d="M115 180 L60 200" stroke={shade} strokeWidth="3" />
        <path d="M385 180 L440 200" stroke={shade} strokeWidth="3" />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewUrl(slug, color.ink)}
        alt={`${slug} badge on a ${color.label.toLowerCase()} shirt`}
        loading={priority ? "eager" : "lazy"}
        className="absolute left-1/2 top-[18%] w-[50%] -translate-x-1/2"
      />
    </div>
  );
}
