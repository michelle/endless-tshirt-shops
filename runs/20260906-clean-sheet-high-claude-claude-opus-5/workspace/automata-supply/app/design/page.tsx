import type { Metadata } from "next";
import { Designer } from "@/components/Designer";
import { designFromParams } from "@/lib/design";

export const metadata: Metadata = {
  title: "Design your own — Automata Supply",
  description:
    "Pick any of the 256 elementary rules and any seed. We render it at print resolution and put it on a shirt.",
};

export default async function DesignPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) flat[k] = Array.isArray(v) ? v[0] : v;

  // Default to something worth looking at rather than an empty lattice.
  const initial = designFromParams({
    rule: flat.rule ?? "110",
    seed: flat.seed ?? "C0FFEE",
    seeding: flat.seeding ?? "random",
    ink: flat.ink ?? "signal",
    cells: flat.cells ?? "121",
  });

  return (
    <div className="wrap">
      <Designer initial={initial} />
    </div>
  );
}
