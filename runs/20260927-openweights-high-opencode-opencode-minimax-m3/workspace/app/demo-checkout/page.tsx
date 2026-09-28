// Demo checkout used when no Stripe credential is configured.
// Acts as the SPEC equivalent of Stripe Checkout's hosted page —
// a faked card form that the customer can fill in, plus the "approve"
// path which fires the same fulfillment pipeline the real webhook does.

import Link from "next/link";

export const dynamic = "force-dynamic";

interface DemoPageProps {
  searchParams?: { token?: string; session_id?: string };
}

export default function DemoCheckout({ searchParams }: DemoPageProps) {
  const token = searchParams?.token ?? "";
  return (
    <div className="form-card" style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 32, margin: "0 0 12px", letterSpacing: 1 }}>
        Demo checkout
      </h1>
      <p className="banner info">
        This is a stand-in Stripe Checkout. No card data leaves your browser
        and no real money is involved — <code>STRIPE_SECRET_KEY</code> isn't
        configured for this environment. The same fulfillment pipeline runs
        after you press <strong>Approve</strong>, so you can watch a real
        Prodigi sandbox order come to life.
      </p>

      <form action="/api/demo-pay" method="POST" style={{ marginTop: 18 }}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="decision" value="approve" />

        <div className="form-grid">
          <div className="field">
            <label>Card number</label>
            <input
              type="text"
              name="card"
              required
              defaultValue="4242 4242 4242 4242"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label>Name on card</label>
            <input type="text" name="cardholder" required defaultValue="Sarah Garcia" />
          </div>
          <div className="field">
            <label>Expiry</label>
            <input type="text" name="expiry" required defaultValue="12 / 2028" />
          </div>
          <div className="field">
            <label>CVC</label>
            <input type="text" name="cvc" required defaultValue="123" autoComplete="off" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Recipient (printed only for this sandbox order)</label>
          </div>
          <div className="field">
            <label>Full name</label>
            <input type="text" name="name" required defaultValue="Sarah Garcia" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" name="email" required defaultValue="sarah@example.com" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Address line 1</label>
            <input type="text" name="line1" required defaultValue="350 Fifth Ave" />
          </div>
          <div className="field">
            <label>City</label>
            <input type="text" name="city" required defaultValue="New York" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>State</label>
              <input type="text" name="state" required defaultValue="NY" />
            </div>
            <div className="field">
              <label>Postal code</label>
              <input type="text" name="postal" required defaultValue="10118" />
            </div>
          </div>
          <div className="field">
            <label>Country</label>
            <select name="country" defaultValue="US">
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="JP">Japan</option>
            </select>
          </div>
        </div>

        <div className="price-card" style={{ marginTop: 26 }}>
          <div>
            <div className="total">$38.95</div>
            <div className="each-line">demo: no charge · DTG-printed and shipped via Prodigi sandbox</div>
          </div>
          <button className="pay-btn" type="submit">
            Approve and print
          </button>
        </div>
      </form>

      <form action="/api/demo-pay" method="POST" style={{ marginTop: 18 }}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="decision" value="decline" />
        <button type="submit" className="chip" style={{ cursor: "pointer" }}>
          Decline (simulate a decline)
        </button>
      </form>

      <p style={{ marginTop: 22, fontSize: 13, color: "var(--soft)" }}>
        To enable the real Stripe Checkout, set <code>STRIPE_SECRET_KEY</code> in
        your Vercel project env. The demo branch then quietly takes over.
        Read the README for the production checklist. (<Link href="/" prefetch={false}>← back to design</Link>)
      </p>
    </div>
  );
}
