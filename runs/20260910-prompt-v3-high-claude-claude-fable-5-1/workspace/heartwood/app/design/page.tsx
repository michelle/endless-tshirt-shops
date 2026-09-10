import type { Metadata } from "next";
import { Designer } from "@/components/Designer";
import { decodeDesignParam, Design } from "@/lib/rings";

export const metadata: Metadata = { title: "Grow your rings — Heartwood" };

export default async function DesignPage({ searchParams }: PageProps<"/design">) {
  const sp = await searchParams;
  const d = typeof sp.d === "string" ? sp.d : undefined;
  const c = typeof sp.c === "string" ? sp.c : undefined;
  const s = typeof sp.s === "string" ? sp.s : undefined;
  let design: Design | null = null;
  if (d) {
    try {
      design = decodeDesignParam(d);
    } catch {
      design = null;
    }
  }
  return (
    <main className="wrap">
      <Designer initial={{ design, color: c, size: s }} />
    </main>
  );
}
