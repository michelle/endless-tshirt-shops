import Link from "next/link";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border-2 border-ink bg-paper-dark/40 transition hover:-translate-y-1 hover:shadow-[6px_6px_0_var(--ink)]"
    >
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ background: product.bgColor }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/art/${product.slug}?w=700`}
          alt={`${product.name} employee badge`}
          className="h-64 w-full object-contain transition group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="font-type text-[11px] uppercase tracking-wide text-ink/60">
          {product.dept}
        </div>
        <div className="font-display text-xl tracking-wide">{product.name}</div>
        <div className="font-display text-xs uppercase tracking-wide text-stamp">
          {product.role}
        </div>
        <p className="mt-1 flex-1 text-sm text-ink/70">{product.tagline}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-display text-lg">{formatPrice(product.price)}</span>
          <span className="font-display text-xs uppercase tracking-wide underline decoration-2 underline-offset-4 group-hover:text-stamp">
            View File →
          </span>
        </div>
      </div>
    </Link>
  );
}
