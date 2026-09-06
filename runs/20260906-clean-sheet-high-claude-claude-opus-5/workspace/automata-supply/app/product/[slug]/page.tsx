import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CATALOG, CATALOG_BY_SLUG } from "@/lib/catalog";
import { Configurator } from "@/components/Configurator";

export function generateStaticParams() {
  return CATALOG.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = CATALOG_BY_SLUG[slug];
  if (!item) return { title: "Not found — Automata Supply" };
  return {
    title: `${item.name} — ${item.tagline} — Automata Supply`,
    description: item.note,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = CATALOG_BY_SLUG[slug];
  if (!item) notFound();

  return (
    <div className="wrap">
      <Configurator design={item.design} garmentId={item.garmentId} title={item.name} />
      <section style={{ paddingBottom: 80, maxWidth: 640 }}>
        <h2 className="section-title" style={{ marginBottom: 14 }}>
          Why this rule
        </h2>
        <p className="product-note">{item.note}</p>
      </section>
    </div>
  );
}
