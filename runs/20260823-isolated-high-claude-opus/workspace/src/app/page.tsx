import { Store } from '@/components/Store';
import { Masthead, StoreFooter, TestModeBanner } from '@/components/Chrome';
import { chivo } from '@/lib/font';

export default function HomePage() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

  return (
    <>
      <TestModeBanner publishableKey={publishableKey} />
      <main className="page">
        <Masthead />
        <Store font={chivo.style.fontFamily} publishableKey={publishableKey} />
        <StoreFooter />
      </main>
    </>
  );
}
