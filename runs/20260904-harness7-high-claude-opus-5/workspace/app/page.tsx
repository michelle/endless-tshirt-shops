import { Storefront } from '@/components/Storefront';
import { isTestMode } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const testMode = isTestMode();

  return (
    <main className="page">
      <header className="masthead">
        <h1>datetime.store</h1>
        <p>we sell a t-shirt with the current datetime.</p>
        {testMode && (
          <span className="testbadge">Test mode · use card 4242 4242 4242 4242</span>
        )}
      </header>

      <Storefront canceled={params.canceled === '1'} />

      <footer className="footer">
        <span>© datetime.store</span>
        <span>Payments by Stripe</span>
        <span>Printed &amp; shipped by Prodigi</span>
      </footer>
    </main>
  );
}
