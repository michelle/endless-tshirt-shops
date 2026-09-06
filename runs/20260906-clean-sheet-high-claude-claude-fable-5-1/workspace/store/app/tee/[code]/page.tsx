import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Configurator } from "@/components/Configurator";
import { COLOR_BY_ID, STATUS_CODES, findCode, isDesignStyle, isSize, mockupFileName, statusClass, CLASS_LABELS, type DesignStyle, type Size } from "@/lib/catalog";

type Params = Promise<{ code: string }>;
type Search = Promise<{ style?: string; color?: string; size?: string }>;

export function generateStaticParams() {
  return STATUS_CODES.map((s) => ({ code: String(s.code) }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const status = findCode((await params).code);
  if (!status) return {};
  return {
    title: `${status.code} ${status.phrase} t-shirt`,
    description: status.blurb,
    openGraph: { images: [`/mockup/${mockupFileName(status.code, "big", "black")}`] },
  };
}

export default async function TeePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const status = findCode((await params).code);
  if (!status) notFound();
  const sp = await searchParams;
  const style: DesignStyle = isDesignStyle(sp.style) ? sp.style : "big";
  const color = sp.color && COLOR_BY_ID.has(sp.color) ? sp.color : "black";
  const size: Size = isSize(sp.size) ? sp.size : "l";

  const idx = STATUS_CODES.findIndex((s) => s.code === status.code);
  const prev = STATUS_CODES[(idx - 1 + STATUS_CODES.length) % STATUS_CODES.length];
  const next = STATUS_CODES[(idx + 1) % STATUS_CODES.length];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <nav className="font-mono text-xs text-muted flex items-center justify-between mb-6">
        <span><Link href="/" className="hover:text-paper">home</Link> / <Link href="/#codes" className="hover:text-paper">{CLASS_LABELS[statusClass(status.code)]}</Link> / {status.code}</span>
        <span className="flex gap-4">
          <Link href={`/tee/${prev.code}`} className="hover:text-paper">← {prev.code}</Link>
          <Link href={`/tee/${next.code}`} className="hover:text-paper">{next.code} →</Link>
        </span>
      </nav>
      <h1 className="font-mono font-extrabold text-3xl sm:text-5xl tracking-tight">
        {status.code} <span className="text-accent">{status.phrase}</span>
      </h1>
      <p className="text-muted mt-3 mb-10 max-w-2xl">{status.blurb}</p>
      <Configurator status={status} initial={{ style, color, size }} />
    </div>
  );
}
