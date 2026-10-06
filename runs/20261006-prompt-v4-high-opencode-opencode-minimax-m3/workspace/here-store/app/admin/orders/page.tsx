import { orders } from '@/lib/orders';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AdminOrdersPage() {
  const all = orders.all();
  return (
    <div className="bg-bone min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="font-serif text-4xl tracking-tight">Orders</h1>
        <p className="text-ink/70 mt-2">In-memory log of every order ever created on this deployment. {all.length} total.</p>
        <div className="mt-8 space-y-3">
          {all.length === 0 && (
            <div className="text-ink/60 border border-ink/15 rounded-xl p-6">No orders yet.</div>
          )}
          {all.map((o) => (
            <div key={o.id} className="bg-white border border-ink/15 rounded-xl p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono">#{o.id.slice(0, 8)}</span>
                <span className={`font-mono text-xs uppercase tracking-widest px-2 py-1 rounded-full
                  ${o.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-800' :
                    o.status === 'paid_production' ? 'bg-blue-100 text-blue-800' :
                    o.status === 'prodigi_submitted' ? 'bg-green-100 text-green-800' :
                    o.status === 'fulfilled' ? 'bg-green-200 text-green-900' :
                    o.status === 'prodigi_failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`}>{o.status.replace('_', ' ')}</span>
              </div>
              <div className="mt-2 grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Design</div>
                  <div className="font-serif text-lg">{o.design.label}</div>
                  <div className="text-sm text-ink/70">{o.design.city}</div>
                  <div className="text-xs font-mono text-ink/60">{o.design.latitude.toFixed(4)}°, {o.design.longitude.toFixed(4)}°</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Shirt</div>
                  <div className="text-sm">{o.variant.color} / {o.variant.size.toUpperCase()}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-ink/50 mt-2">Ship to</div>
                  <div className="text-sm">{o.shipping.name}</div>
                  <div className="text-xs text-ink/60">{o.shipping.line1}, {o.shipping.city} {o.shipping.postalCode}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="font-mono text-ink/60">Stripe session: {o.stripeSessionId?.slice(0, 18) ?? '—'}</div>
                <div className="font-mono text-ink/60">Prodigi order: {o.prodigiOrderId?.slice(0, 18) ?? '—'}</div>
                <div className="font-mono text-ink/60">Idempotency: {o.idempotencyKey.slice(0, 18)}…</div>
                <div className="font-mono text-ink/60">Created: {new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-3 flex gap-3">
                <Link href={`/api/asset/${o.id}?t=${o.idempotencyKey}`} target="_blank" rel="noreferrer" className="text-xs underline text-ink/70">
                  Asset PNG
                </Link>
                {o.stripeSessionId && (
                  <Link href={`/api/order-debug/${o.id}`} className="text-xs underline text-ink/70">
                    Raw order JSON
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
