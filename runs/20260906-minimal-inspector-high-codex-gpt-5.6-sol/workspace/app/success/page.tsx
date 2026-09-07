import SuccessStatus from "@/components/success-status";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const query = await searchParams;
  return <SuccessStatus sessionId={query.session_id || null} />;
}
