import { SuccessReceipt } from './receipt';

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId = '' } = await searchParams;
  return <SuccessReceipt sessionId={sessionId} />;
}
