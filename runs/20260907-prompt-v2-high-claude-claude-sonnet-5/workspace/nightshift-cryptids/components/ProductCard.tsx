import Link from "next/link";
import type { Design } from "@/lib/designs";

export function ProductCard({ design }: { design: Design }) {
  return (
    <Link
      href={`/shop/${design.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/25 hover:bg-white/[0.06]"
    >
      <div
        className="aspect-square w-full p-6"
        style={{ backgroundColor: design.ink }}
      >
        <img
          src={`/art/${design.slug}-preview.png`}
          alt={`${design.name} — ${design.jobTitle}`}
          className="h-full w-full object-contain transition group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-black tracking-tight text-white">
          {design.name}
        </h3>
        <p className="text-sm text-zinc-400">{design.jobTitle}</p>
        <p className="mt-2 font-semibold text-lime-300">${design.price}</p>
      </div>
    </Link>
  );
}
