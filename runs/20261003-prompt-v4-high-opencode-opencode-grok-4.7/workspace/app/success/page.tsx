import { SuccessView } from "@/components/SuccessView";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const params = await searchParams;
  return <SuccessView sessionId={params.session_id || ""} />;
}
