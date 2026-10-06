export const dynamic = "force-dynamic"

export function GET() {
  return Response.json({
    ok: true,
    store: "vesper",
    payments: Boolean(process.env.STRIPE_SECRET_KEY),
    print: Boolean(process.env.PRODIGI_API_KEY),
  })
}
