import { DesignStudio } from "@/components/DesignStudio";
import { decodeDesign, defaultDesign } from "@/lib/design";
import { isSize } from "@/lib/catalog";
import { paymentsConfigured } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function DesignPage({ searchParams }: { searchParams: Promise<{ d?: string; size?: string }> }) {
  const sp = await searchParams;
  const initial = (sp.d && decodeDesign(sp.d)) || defaultDesign();
  const initialSize = sp.size && isSize(sp.size) ? sp.size : "m";
  return (
    <main className="mx-auto max-w-6xl px-5 pb-10">
      <DesignStudio initial={initial} initialSize={initialSize} paymentsEnabled={paymentsConfigured()} />
    </main>
  );
}
