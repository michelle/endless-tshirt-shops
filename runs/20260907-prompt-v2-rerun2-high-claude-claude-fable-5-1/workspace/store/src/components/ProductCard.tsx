import Link from "next/link";
import { formatPrice, PRICE_CENTS, type Product } from "@/lib/catalog";
import { ShirtMockup } from "./ShirtMockup";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/shirts/${product.slug}`} className="card block p-4 hover:-translate-y-1 transition-transform">
      <ShirtMockup product={product} colorId={product.defaultColor} idPrefix={`card-${product.slug}`} className="w-full" />
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-slab text-lg leading-tight">{product.bureau}</p>
          <p className="text-xs text-ink-2 mt-1">Est. {product.established} · {product.colors.length} colours</p>
        </div>
        <p className="font-bold whitespace-nowrap">{formatPrice(PRICE_CENTS)}</p>
      </div>
    </Link>
  );
}
