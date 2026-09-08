import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SAINTS, getSaint, mockupSrc } from "@/lib/catalog";
import { ProductView } from "@/components/ProductView";

export const dynamicParams = false;
export function generateStaticParams() {
  return SAINTS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const s = getSaint(slug);
  if (!s) return {};
  return {
    title: s.name,
    description: `${s.invocation.join(" ")} — a hand-drawn devotional tee from The Order of Small Disasters.`,
    openGraph: { title: s.name, images: [{ url: mockupSrc(s.slug, "black") }] },
  };
}

export default async function ShirtPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const saint = getSaint(slug);
  if (!saint) notFound();
  return <ProductView saint={saint} />;
}
