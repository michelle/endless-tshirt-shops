import { getColor, type Product } from "@/lib/catalog";
import { designSvg } from "@/lib/designs";

/** A t-shirt silhouette in the chosen colour with the seal printed at chest height. */
export function ShirtMockup({
  product,
  colorId,
  idPrefix,
  className = "",
}: {
  product: Product;
  colorId: string;
  idPrefix: string;
  className?: string;
}) {
  const color = getColor(colorId) ?? getColor(product.defaultColor)!;
  const inner = designSvg(product, { ink: color.ink, idPrefix })
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");
  const dark = color.ink === "light";
  const shade = dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.22)";
  return (
    <svg viewBox="0 0 400 480" className={className} role="img" aria-label={`${product.bureau} tee in ${color.label}`}>
      <path
        d="M140,34 C160,62 240,62 260,34 L332,62 L392,152 L334,192 L318,172 L318,452 L82,452 L82,172 L66,192 L8,152 L68,62 Z"
        fill={color.hex}
        stroke={shade}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M140,34 C160,62 240,62 260,34 C245,78 155,78 140,34 Z" fill={shade} opacity="0.6" />
      <path d="M318,172 L334,192 M82,172 L66,192" stroke={shade} strokeWidth="3" />
      <svg x="132" y="96" width="136" height="163.2" viewBox="0 0 1000 1200" dangerouslySetInnerHTML={{ __html: inner }} />
    </svg>
  );
}

/** The seal alone, on a background matching the shirt colour. */
export function DesignPreview({ product, colorId, idPrefix, className = "" }: { product: Product; colorId: string; idPrefix: string; className?: string }) {
  const color = getColor(colorId) ?? getColor(product.defaultColor)!;
  return (
    <div className={className} style={{ background: color.hex }}>
      <div dangerouslySetInnerHTML={{ __html: designSvg(product, { ink: color.ink, idPrefix }).replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"') }} />
    </div>
  );
}
