import { Suspense } from "react";
import { Studio } from "./Studio";
import { DEFAULT_DESIGN, safeDecodeDesign } from "@/lib/design";
import { SIZES, type Size } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function DesignPage({ searchParams }: PageProps<"/design">) {
  const sp = await searchParams;
  const d = typeof sp.d === "string" ? sp.d : undefined;
  const initial = safeDecodeDesign(d) ?? DEFAULT_DESIGN;
  const size = (typeof sp.size === "string" && (SIZES as readonly string[]).includes(sp.size) ? sp.size : "m") as Size;
  return (
    <Suspense>
      <Studio initialDesign={initial} initialSize={size} />
    </Suspense>
  );
}
