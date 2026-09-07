import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductConfigurator } from "@/components/ProductConfigurator";
import { ProductCard } from "@/components/ProductCard";
import { designs, getDesign } from "@/lib/catalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return designs.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = getDesign(slug);
  if (!d) return {};
  return { title: `${d.name} tee`, description: `${d.tagline}. ${d.blurb}`, openGraph: { images: [`/art/${d.slug}.png`] } };
}

export default async function ShirtPage({ params }: Props) {
  const { slug } = await params;
  const design = getDesign(slug);
  if (!design) notFound();
  const others = designs.filter((d) => d.slug !== slug).slice(0, 4);
  return (
    <>
      <nav className="crumbs">
        <Link href="/">Parks</Link> / {design.name}
      </nav>
      <ProductConfigurator design={design} />
      <section className="section">
        <h2>Other parks worth the drive</h2>
        <div className="grid">
          {others.map((d, i) => (
            <ProductCard key={d.slug} design={d} index={i + 1} />
          ))}
        </div>
      </section>
    </>
  );
}
