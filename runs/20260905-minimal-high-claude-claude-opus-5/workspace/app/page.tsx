import Store from '@/components/Store';
import { LIST_PRICE_CENTS, PRICE_CENTS, formatUsd } from '@/lib/products';

export default function Page() {
  return (
    <main className="Page">
      <header className="PageHeader">
        <h1>datetime.store</h1>
        <h2>
          we sell a t-shirt with the current datetime.{' '}
          <span className="PageHeader-clock" aria-hidden="true">
            &#x1F551;
          </span>
        </h2>
      </header>
      <Store
        priceCents={PRICE_CENTS}
        listPriceCents={LIST_PRICE_CENTS}
        publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''}
      />
      <footer className="PageFooter">
        <span>{formatUsd(PRICE_CENTS)} · free shipping worldwide</span>
        <span>
          Printed on demand by Prodigi. Payments by Stripe. A rebuild of{' '}
          <a
            href="https://github.com/michelle/datetime.store"
            target="_blank"
            rel="noreferrer noopener"
          >
            datetime.store
          </a>
          .
        </span>
      </footer>
    </main>
  );
}
