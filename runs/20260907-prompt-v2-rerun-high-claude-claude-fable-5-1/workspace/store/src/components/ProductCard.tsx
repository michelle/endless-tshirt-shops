import Link from "next/link";
import { BASE_PRICE_CENTS, Design, colors, formatMoney } from "@/lib/catalog";
import { ShirtMockup } from "./ShirtMockup";

export function ProductCard({ design, index }: { design: Design; index: number }) {
  // Rotate through the darker shirt colours so the grid has some variety.
  const palette = colors.filter((c) => c.dark);
  const color = palette[index % palette.length];
  return (
    <Link href={`/shirts/${design.slug}`} className="card">
      <div className="card-art" style={{ background: design.paper }}>
        <ShirtMockup slug={design.slug} color={color} className="card-shirt" />
      </div>
      <div className="card-body">
        <div className="card-title">{design.name}</div>
        <div className="card-tag">{design.tagline}</div>
        <div className="card-meta">
          <span>Est. {design.est}</span>
          <span className="price">{formatMoney(BASE_PRICE_CENTS)}</span>
        </div>
      </div>
    </Link>
  );
}
