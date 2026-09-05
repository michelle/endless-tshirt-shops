import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Privacy & store policies — datetime.store",
  description:
    "How this test store handles checkout, personal information, and made-to-order tees.",
};
export default function Policies() {
  const test = process.env.NEXT_PUBLIC_APP_MODE !== "live";
  return (
    <>
      <header className="header">
        <a className="brand" href="/">
          datetime<span className="brand-dot">.</span>store
        </a>
        <a href="/" className="back-link">
          ← Back to the store
        </a>
      </header>
      <main className="policy-page">
        <span className="eyebrow">THE SMALL PRINT</span>
        <h1>Clear from the start.</h1>
        {test && (
          <p className="notice">
            This store is a test edition. Payments run through Stripe’s test
            environment and print orders go to Prodigi’s sandbox. No real money
            is charged and no physical goods are shipped. Use fictitious contact
            and address details.
          </p>
        )}
        <h2>Your tee & checkout</h2>
        <p>
          The datetime tee costs $22.50 USD including standard US shipping. One
          black tee is purchased per checkout. Your timestamp is captured when
          you begin checkout. The product preview is illustrative; the actual
          fit and print placement may vary. The size guide lists manufacturer
          measurements.
        </p>
        <h2>Information we use</h2>
        <p>
          Stripe collects your email and shipping address to process checkout.
          Card details are entered on Stripe’s hosted page; this store never
          receives your full card number. We send your shipping name, address,
          email, shirt selection, and print artwork to Prodigi to fulfill the
          order.
        </p>
        <p>
          Order selections, timestamp, payment status, and the print-order
          reference are stored with the Stripe checkout record. Your private
          order link permits access to the status page. Keep it private. The
          store does not sell personal information or use advertising trackers.
        </p>
        <h2>Local preferences</h2>
        <p>
          Your browser remembers your selected fit and size. It also keeps your
          most recent private order link for the current browser session. You
          can clear these through your browser’s site-data settings.
        </p>
        <h2>Changes & order issues</h2>
        <p>
          Before paying, use the back link in Stripe to return to the store and
          change your selection. After checkout, use your private order page to
          see payment and fulfillment status.{" "}
          {test
            ? "Test orders have no financial cost and do not require a refund. A customer support address and final return policy must be published before this store accepts real purchases."
            : "Because each tee is custom printed, changes depend on whether production has started. Contact the store with your order reference if anything is wrong."}
        </p>
        <h2>Service providers</h2>
        <p>
          Read the{" "}
          <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
            Stripe privacy policy
          </a>{" "}
          and{" "}
          <a
            href="https://www.prodigi.com/privacy-policy/"
            target="_blank"
            rel="noreferrer"
          >
            Prodigi privacy policy
          </a>{" "}
          for details of how these providers handle information. Vercel hosts
          the store and processes essential request logs for delivery and
          security.
        </p>
      </main>
    </>
  );
}
