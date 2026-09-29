import Studio from "@/components/Studio";

export const metadata = { title: "Design your sky — Overhead" };

export default async function DesignPage({ searchParams }: { searchParams: Promise<{ d?: string; size?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="wrap">
      <div className="eyebrow">Design studio</div>
      <h2 style={{ marginBottom: 24 }}>Your sky, your words.</h2>
      <Studio initial={sp.d} initialSize={sp.size} />
    </main>
  );
}
