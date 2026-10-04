import { shirtById } from "@/lib/catalog";

/**
 * A flat tee silhouette with the artwork placed where the DTG front print
 * area sits on a Gildan 64000 (15.6 x 19.3 in, starting just below the collar).
 */
export function ShirtMockup({ svg, shirtId }: { svg: string; shirtId: string }) {
  const shirt = shirtById(shirtId);
  const seam = shirt.light ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.14)";
  // print area box in mockup units
  const pw = 172;
  const ph = (pw * 5844) / 4665;
  const px = 200 - pw / 2;
  const py = 92;
  const inner = svg.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return (
    <svg viewBox="0 0 400 430" className="w-full h-auto" role="img" aria-label={`${shirt.label} t-shirt preview`}>
      <defs>
        <clipPath id="tee-clip">
          <path d="M122 38 L36 78 L8 160 L76 188 L76 404 L324 404 L324 188 L392 160 L364 78 L278 38 C262 74 138 74 122 38 Z" />
        </clipPath>
        <filter id="tee-shade" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <path
        d="M122 38 L36 78 L8 160 L76 188 L76 404 L324 404 L324 188 L392 160 L364 78 L278 38 C262 74 138 74 122 38 Z"
        fill={shirt.hex}
        stroke={seam}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* collar rib */}
      <path d="M122 38 C138 74 262 74 278 38" fill="none" stroke={seam} strokeWidth="5" />
      <path d="M118 36 C136 86 264 86 282 36" fill="none" stroke={seam} strokeWidth="1.5" />
      {/* sleeve seams */}
      <path d="M76 188 L100 70" fill="none" stroke={seam} strokeWidth="1.5" />
      <path d="M324 188 L300 70" fill="none" stroke={seam} strokeWidth="1.5" />
      {/* soft fabric shading */}
      <g clipPath="url(#tee-clip)" opacity={shirt.light ? 0.25 : 0.35} filter="url(#tee-shade)">
        <ellipse cx="60" cy="250" rx="30" ry="170" fill="black" />
        <ellipse cx="340" cy="250" rx="30" ry="170" fill="black" />
      </g>
      <svg x={px} y={py} width={pw} height={ph} viewBox="0 0 4665 5844" dangerouslySetInnerHTML={{ __html: inner }} />
    </svg>
  );
}
