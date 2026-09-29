import Link from "next/link";

export default function SuccessPage() {
  return (
    <main>
      <header className="site-header">
        <div className="container inner">
          <div className="brand">
            STELLAR<span className="dot">.</span>
          </div>
        </div>
      </header>

      <section className="success">
        <div className="mark">✦</div>
        <h1>Your sky is on its way.</h1>
        <p>
          Thank you for your order. Your custom star map tee is now being
          printed with direct-to-garment technology and will ship to you
          shortly. You&apos;ll receive a confirmation by email.
        </p>
        <Link href="/" className="back">
          Design another
        </Link>
      </section>
    </main>
  );
}
