import Store from '@/components/Store';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { publishableKey } from '@/lib/stripe';

export default function Home() {
  const key = publishableKey();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 sm:px-8">
        {key ? (
          <Store publishableKey={key} />
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
            <p className="font-semibold">The store is not configured yet.</p>
            <p className="mt-2">
              Set <code className="font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>,{' '}
              <code className="font-mono">STRIPE_SECRET_KEY</code> and{' '}
              <code className="font-mono">SP_AUTH</code>, then redeploy.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
