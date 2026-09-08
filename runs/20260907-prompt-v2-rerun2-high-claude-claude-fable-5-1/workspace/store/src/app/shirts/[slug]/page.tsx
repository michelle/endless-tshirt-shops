import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getColor, getProduct, PRODUCTS } from "@/lib/catalog";
import { Configurator } from "@/components/Configurator";
import { ProductCard } from "@/components/ProductCard";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/shirts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  const ink = getColor(p.defaultColor)!.ink;
  return {
    title: `${p.bureau} Tee`,
    description: `${p.tagline} ${p.blurb}`,
    openGraph: { images: [`/designs/${p.slug}-${ink}-preview.png`] },
  };
}

export default async function ShirtPage({ params }: PageProps<"/shirts/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  const others = PRODUCTS.filter((p) => p.slug !== slug).slice(0, 3);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-widest text-ink-2 mb-6">
        <Link href="/" className="hover:underline">Home</Link> / <Link href="/#collection" className="hover:underline">Shirts</Link> / {product.bureau}
      </p>
      <Configurator product={product} />
      <section className="mt-20">
        <h2 className="font-slab text-2xl rule pt-4">Other bureaus</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-3">
          {others.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
