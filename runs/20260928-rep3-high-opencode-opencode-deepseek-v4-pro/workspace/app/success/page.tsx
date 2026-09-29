import Link from "next/link";

export default function SuccessPage() {
  return (
    <>
      <header className="site-header">
        <div className="container inner">
          <Link href="/" className="brand">
            STELL<span>ARA</span>
          </Link>
        </div>
      </header>

      <main className="container">
        <div className="success">
          <div className="check">✦</div>
          <h1>Your sky is on its way.</h1>
          <p>
            Thank you — your order is confirmed. We&apos;ve sent your custom star
            map to print, and it will be shipped to you shortly. You&apos;ll
            receive a confirmation email with tracking details.
          </p>
          <div className="cta-row" style={{ justifyContent: "center" }}>
            <Link href="/design" className="btn btn-primary">
              Design another
            </Link>
            <Link href="/" className="btn btn-ghost">
              Back home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
