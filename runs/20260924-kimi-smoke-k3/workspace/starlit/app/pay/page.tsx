import PayForm from "./payform";

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  if (!p) {
    return (
      <main className="center-wrap">
        <div className="brand" style={{ marginBottom: 20 }}>
          Star<span>lit</span>
        </div>
        <p>Missing order. Head back to the store to design your shirt.</p>
      </main>
    );
  }
  return <PayForm token={p} />;
}
