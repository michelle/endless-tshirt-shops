import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DESIGNS, getDesign } from "@/lib/designs";
import { ProductOptions } from "@/components/ProductOptions";

export function generateStaticParams() {
  return DESIGNS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const design = getDesign(slug);
  if (!design) return {};
  return {
    title: `${design.name} — ${design.jobTitle} | Night Shift Cryptids`,
    description: design.blurb,
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const design = getDesign(slug);
  if (!design) notFound();

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <ProductOptions design={design} />
    </div>
  );
}
