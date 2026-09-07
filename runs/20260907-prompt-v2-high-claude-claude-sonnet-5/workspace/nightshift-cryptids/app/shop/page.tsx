import type { Metadata } from "next";
import { DESIGNS } from "@/lib/designs";
import { ProductCard } from "@/components/ProductCard";

export const metadata: Metadata = {
  title: "Shop — Night Shift Cryptids",
};

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="text-3xl font-black tracking-tight text-white">
        The Collection
      </h1>
      <p className="mt-2 max-w-xl text-zinc-400">
        Unisex softstyle tees, printed on demand. Six creatures, six jobs
        nobody else wanted.
      </p>
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {DESIGNS.map((d) => (
          <ProductCard key={d.slug} design={d} />
        ))}
      </div>
    </div>
  );
}
