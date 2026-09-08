export async function POST() {
  // Prodigi status callbacks are accepted here. Add signature verification and persistence before using status updates operationally.
  return Response.json({ received: true });
}
