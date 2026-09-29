export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({
    status: 'ok',
    paymentConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    fulfillmentConfigured: Boolean(process.env.PRODIGI_API_KEY),
    siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL)
  }, {headers:{'Cache-Control':'no-store'}});
}
