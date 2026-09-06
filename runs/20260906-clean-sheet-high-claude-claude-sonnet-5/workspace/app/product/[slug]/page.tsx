import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CLASS_COLORS, getShirt, SHIRTS } from "@/lib/shirts";
import BuyBox from "./BuyBox";

export function generateStaticParams() {
  return SHIRTS.map((shirt) => ({ slug: shirt.slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shirt = getShirt(slug);
  if (!shirt) notFound();

  const classInfo = CLASS_COLORS[shirt.statusClass];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/#shop" className="font-mono text-sm text-neutral-500 hover:text-neutral-300">
        ← All shirts
      </Link>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-black border border-white/10">
          <Image
            src={`/mockups/${shirt.slug}.png`}
            alt={`HTTP ${shirt.code} ${shirt.title} t-shirt`}
            fill
            className="object-cover object-top"
            sizes="(min-width: 768px) 50vw, 100vw"
            priority
          />
        </div>

        <div>
          <span
            className="inline-block font-mono text-xs px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: shirt.accent, color: shirt.bg }}
          >
            {shirt.statusClass.toUpperCase()} · {classInfo.label.toUpperCase()}
          </span>
          <h1 className="font-mono text-4xl font-extrabold">
            {shirt.code} <span className="text-neutral-400">{shirt.title}</span>
          </h1>
          <p className="mt-2 text-lg text-neutral-300">{shirt.flavor}</p>
          <p className="mt-4 text-neutral-400 leading-relaxed">{shirt.description}</p>

          <p className="mt-6 font-mono text-2xl font-bold">
            ${(shirt.priceCents / 100).toFixed(2)}
          </p>

          <div className="mt-8">
            <BuyBox slug={shirt.slug} />
          </div>

          <ul className="mt-8 space-y-1 text-sm text-neutral-500 font-mono">
            <li>· Unisex Gildan 64000 softstyle tee, black</li>
            <li>· Printed on-demand, ships worldwide via Prodigi</li>
            <li>· Front chest print, true to size</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
