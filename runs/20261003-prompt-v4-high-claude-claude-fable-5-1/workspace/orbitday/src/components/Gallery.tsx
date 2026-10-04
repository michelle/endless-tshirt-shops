"use client";
import Link from "next/link";
import { DesignPreview } from "./DesignPreview";
import { designSchema, encodeDesign, formatDateLong, type Design } from "@/lib/design";

const EXAMPLES: Design[] = [
  { date: "1969-07-20", name: "One small step", subtitle: "Sea of Tranquility", shirt: "black", accent: "gold", style: "classic", size: "m" },
  { date: "2015-09-12", name: "Noor & Idris", subtitle: "The day we met", shirt: "natural", accent: "coral", style: "annotated", size: "m" },
  { date: "2024-04-08", name: "Theodore", subtitle: "7 lb 4 oz · 03:14", shirt: "navy blue", accent: "mint", style: "minimal", size: "m" },
].map((d) => designSchema.parse(d));

export function Gallery() {
  return (
    <div className="gallery">
      {EXAMPLES.map((d) => (
        <Link key={d.date} href={`/design?d=${encodeDesign(d)}`} className="gallery-item">
          <DesignPreview design={d} mode="mockup" />
          <div className="gallery-caption">
            <strong>{d.name}</strong>
            <span>{formatDateLong(d.date)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
