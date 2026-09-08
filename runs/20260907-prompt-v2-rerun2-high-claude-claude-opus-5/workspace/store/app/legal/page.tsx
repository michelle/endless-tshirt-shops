import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shipping, returns & privacy" };

export default function Legal() {
  return (
    <div className="wrap narrow prose" style={{ padding: "48px 20px 40px" }}>
      <h1 className="title">The fine print</h1>

      <h2>Shipping</h2>
      <p>
        Shirts are printed to order, which takes 2–4 working days before the parcel moves.
        Shipping is quoted live at checkout by our print partner and passed through at cost;
        Budget, Standard and Express are the services available to most addresses. Delivery is
        typically 3–7 working days domestically and 7–15 internationally after dispatch.
      </p>
      <p>
        Import duty and local taxes on international orders are the recipient&rsquo;s
        responsibility.
      </p>

      <h2>Returns</h2>
      <p>
        Because every shirt is printed for one person, we can&rsquo;t restock returns. If the
        garment arrives damaged, misprinted, or the wrong size against what you ordered, email
        us within 30 days with a photo and we&rsquo;ll reprint or refund it. Ordinary change of
        mind: we&rsquo;ll do what we can, but a printed shirt in your size is genuinely
        unsellable to anyone else.
      </p>

      <h2 id="privacy">Privacy</h2>
      <p>
        We collect the name, address, email and phone number needed to print and deliver your
        order, and we pass them to Prodigi, our print and fulfilment partner, for that purpose.
        We don&rsquo;t sell data, and we don&rsquo;t run advertising trackers on this site.
        Payment card details, when card payment is enabled, are handled entirely by the payment
        processor and never touch our servers.
      </p>

      <h2>Contact</h2>
      <p>Write to the Order at the address on your order confirmation.</p>
    </div>
  );
}
