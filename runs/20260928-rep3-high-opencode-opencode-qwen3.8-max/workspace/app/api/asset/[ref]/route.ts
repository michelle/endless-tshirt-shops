// Print asset endpoint. Prodigi fetches this PNG after the order is created
// (which only happens after payment). The session id is unguessable and the
// route re-checks payment status, so no unpaid design is ever served.
import { rasterizePng } from '@/lib/raster';
import { renderDesignForShirt } from '@/lib/design';
import { parseSessionDesign } from '@/lib/fulfillment';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  const sessionId = ref.replace(/\.png$/, '');
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return new Response('not found', { status: 404 });
  }

  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId);
  } catch {
    return new Response('not found', { status: 404 });
  }
  if (session.payment_status !== 'paid') {
    return new Response('not found', { status: 404 });
  }

  try {
    const { design, product } = parseSessionDesign(session);
    const svg = renderDesignForShirt(design, product.color);
    const png = rasterizePng(svg);
    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    console.error('asset render failed', e);
    return new Response('render failed', { status: 500 });
  }
}
