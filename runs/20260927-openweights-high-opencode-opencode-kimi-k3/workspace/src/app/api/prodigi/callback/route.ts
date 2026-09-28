// Prodigi sends order status callbacks here (if callbackUrl was set on the
// order). We keep no order database, so this is an acknowledgement endpoint;
// order status is always read live from Prodigi on the order page.
export async function POST(req: Request) {
  try {
    await req.json();
  } catch {
    // ignore malformed callbacks
  }
  return Response.json({ ok: true });
}
