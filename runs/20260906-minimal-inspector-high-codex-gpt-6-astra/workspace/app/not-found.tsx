import Link from 'next/link';
import { Header, Footer } from '@/components/chrome';
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="result-page">
        <div className="eyebrow mono">404 / MOMENT NOT FOUND</div>
        <h1>
          This moment
          <br />
          has passed.
        </h1>
        <p>
          The page you’re looking for isn’t here. There’s a new moment waiting
          at the store.
        </p>
        <Link href="/" className="buy-button">
          Back to datetime.store →
        </Link>
      </main>
      <Footer />
    </>
  );
}
