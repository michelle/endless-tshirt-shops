import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DESIGNS, getDesign } from '@/lib/catalog';
import ProductView from './ProductView';

export function generateStaticParams() {
  return DESIGNS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = getDesign(slug);
  if (!d) return { title: 'Not found — Last Shift' };
  return {
    title: `${d.trade} tee — Last Shift`,
    description: `${d.motto}. ${d.blurb.slice(0, 140)}…`,
  };
}

export default async function ShirtPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const design = getDesign(slug);
  if (!design) notFound();

  const idx = DESIGNS.findIndex((d) => d.slug === slug);
  const next = DESIGNS[(idx + 1) % DESIGNS.length];

  return (
    <div className="wrap">
      <ProductView design={design} />
      <div style={{ borderTop: '1px solid var(--rule)', padding: '30px 0 70px', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <Link href="/#shirts" className="eyebrow">← All six trades</Link>
        <Link href={`/shirt/${next.slug}`} className="eyebrow">Next: {next.trade} →</Link>
      </div>
    </div>
  );
}
