export async function POST(request) {
  const payload = await request.json().catch(() => null);
  console.log('prodigi_status_update', { id: payload?.data?.id, type: payload?.type });
  return Response.json({ received: true });
}
