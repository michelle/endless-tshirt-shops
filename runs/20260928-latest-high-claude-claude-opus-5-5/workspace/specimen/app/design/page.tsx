import type { Metadata } from "next";
import { Designer } from "@/components/Designer";

export const metadata: Metadata = { title: "Describe your specimen — SPECIMEN" };

export default async function DesignPage({ searchParams }: PageProps<"/design">) {
  const { from } = await searchParams;
  return (
    <main>
      <Designer from={typeof from === "string" ? from : undefined} />
    </main>
  );
}
