import Link from "next/link";
import { COLORS, PRICE_CENTS, formatMoney, type Design } from "@/lib/catalog";
import { ShirtMockup } from "./ShirtMockup";

export function ProductCard({ design, index }: { design: Design; index: number }) {
  // Alternate default colours so the grid shows both ink variants.
  const color = COLORS[index % 2 === 0 ? 0 : 5];
  return (
    <Link href={`/shirts/${design.slug}`} className="group block">
      <div className="rounded-lg border border-ink/10 bg-paper-2/60 p-3 transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <ShirtMockup slug={design.slug} color={color} priority={index < 4} />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div>
          <div className="font-display text-lg leading-tight">{design.name}</div>
          <div className="font-mono text-xs uppercase tracking-widest text-ink/60">{design.local} · retired {design.obsoletedBy.split(",").pop()?.trim().toLowerCase()}</div>
        </div>
        <div className="shrink-0 font-medium">{formatMoney(PRICE_CENTS)}</div>
      </div>
      <p className="mt-1 text-sm italic text-ink/70">“{design.tagline}”</p>
    </Link>
  );
}
