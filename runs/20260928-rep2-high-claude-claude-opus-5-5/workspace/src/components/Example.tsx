"use client";
import { ShirtMockup, useChart } from "./Shirt";
import { encodeDesign, type Design } from "@/lib/design";
import Link from "next/link";

export default function Example({ design, caption, link = true }: { design: Design; caption?: string; link?: boolean }) {
  const { svg } = useChart(design);
  const mock = <ShirtMockup design={design} svg={svg} />;
  if (!link) return mock;
  return (
    <div className="card">
      <Link href={`/design?d=${encodeDesign(design)}`}>{mock}</Link>
      <h3>{design.title}</h3>
      <div className="muted" style={{ fontSize: 15 }}>{caption}</div>
    </div>
  );
}
