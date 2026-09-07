import { notFound } from "next/navigation";
import { DESIGNS, getDesign } from "@/lib/catalog";
import { ProductConfigurator } from "@/components/ProductConfigurator";

export function generateStaticParams() {
  return DESIGNS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = getDesign(slug);
  return { title: d ? `${d.name} tee — The Obsolete Guild` : "Not found" };
}

export default async function ShirtPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const design = getDesign(slug);
  if (!design) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <ProductConfigurator design={design} />
      <section className="mt-16 grid gap-8 border-t border-ink/15 pt-10 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl">Obituary for the trade</h2>
          <p className="mt-3 text-ink/85">{design.blurb}</p>
          <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ink/60">Retired by: {design.obsoletedBy}</p>
        </div>
        <div>
          <h2 className="font-display text-2xl">The shirt</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-ink/85">
            <li>Bella + Canvas 3001 unisex crew, 100% ring-spun cotton (heathers blended)</li>
            <li>Direct-to-garment print, roughly 11 inches tall on the chest</li>
            <li>Badge ink switches between cream and charcoal to suit the shirt colour</li>
            <li>Printed to order in the lab nearest you, ships in 2–4 working days</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
