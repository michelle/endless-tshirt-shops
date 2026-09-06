import Image from "next/image";
import Link from "next/link";
import { SHIRTS } from "@/lib/shirts";

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12 text-center">
        <p className="font-mono text-sm text-emerald-400 tracking-widest mb-4">
          HTTP/1.1 · APPAREL
        </p>
        <h1 className="font-mono text-4xl sm:text-6xl font-extrabold tracking-tight">
          Wear the response.
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-neutral-400 text-lg">
          Every shirt is a real HTTP status code, screen-printed the way your terminal
          would render it. For developers, sysadmins, and anyone who has personally
          been a 404, a 429, or occasionally a 500.
        </p>
        <p className="mt-3 max-w-2xl mx-auto text-neutral-600 text-sm font-mono">
          Printed on-demand and shipped worldwide by Prodigi. No inventory, no minimums.
        </p>
      </section>

      <section id="shop" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SHIRTS.map((shirt) => (
            <Link
              key={shirt.slug}
              href={`/product/${shirt.slug}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-white/25 transition-colors"
            >
              <div className="relative aspect-[4/5] bg-black">
                <Image
                  src={`/mockups/${shirt.slug}.png`}
                  alt={`HTTP ${shirt.code} ${shirt.title} t-shirt`}
                  fill
                  className="object-cover object-top group-hover:scale-[1.02] transition-transform duration-300"
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
              </div>
              <div className="p-5">
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-2xl font-extrabold">{shirt.code}</span>
                  <span className="text-neutral-400">${(shirt.priceCents / 100).toFixed(2)}</span>
                </div>
                <p className="font-mono text-sm text-neutral-300 mt-1">{shirt.title}</p>
                <p className="text-sm text-neutral-500 mt-2 line-clamp-2">{shirt.flavor}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
