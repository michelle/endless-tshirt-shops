import { shirtById, type DesignSpec } from "@/lib/catalog";
import { designFragment } from "@/lib/design";

const BODY = "M236 132C250 86 470 86 484 132L512 146C575 164 650 198 692 255L648 308C612 286 560 270 528 258L546 712C546 732 174 732 174 712L192 258C160 270 108 286 72 308L28 255C70 198 145 164 208 146Z";

function shade(hex: string, amt: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, v + amt));
  const r = ch(num >> 16);
  const g = ch((num >> 8) & 255);
  const b = ch(num & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function Shirt({ spec, mode }: { spec: DesignSpec; mode: "shirt" | "print" }) {
  const color = shirtById(spec.color) ?? shirtById("black")!;
  const fragment = designFragment(spec);
  if (mode === "print") {
    return (
      <div className="print-sheet" style={{ backgroundColor: "#1a1613" }}>
        <div className="sheet" style={{ background: color.hex }}>
          <svg viewBox="0 0 4665 5844" role="img" aria-label="Print file preview" dangerouslySetInnerHTML={{ __html: fragment }} />
        </div>
      </div>
    );
  }
  return (
    <svg className="tee" viewBox="0 0 720 820" role="img" aria-label={`${color.name} shirt with your chart`}>
      <defs>
        <filter id="cloth" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.16" />
          </feComponentTransfer>
        </filter>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="0.42" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
        </linearGradient>
        <clipPath id="tee-body">
          <path d={BODY} />
        </clipPath>
      </defs>
      <ellipse cx="360" cy="748" rx="190" ry="18" fill="#000" opacity="0.28" />
      <path d={BODY} fill={color.hex} />
      <path d={BODY} fill="url(#sheen)" />
      <path d={BODY} filter="url(#cloth)" opacity="0.55" />
      <path d="M292 136C304 178 416 178 428 136C408 154 312 154 292 136Z" fill={shade(color.hex, -28)} />
      <path d="M314 142C322 166 398 166 406 142C394 152 326 152 314 142Z" fill={shade(color.hex, -48)} />
      <path d="M72 300C108 278 160 262 192 252" fill="none" stroke={shade(color.hex, -35)} strokeWidth="8" />
      <path d="M648 300C612 278 560 262 528 252" fill="none" stroke={shade(color.hex, -35)} strokeWidth="8" />
      <g clipPath="url(#tee-body)">
        <svg x="178" y="176" width="364" height="456" viewBox="0 0 4665 5844" dangerouslySetInnerHTML={{ __html: fragment }} />
      </g>
    </svg>
  );
}
