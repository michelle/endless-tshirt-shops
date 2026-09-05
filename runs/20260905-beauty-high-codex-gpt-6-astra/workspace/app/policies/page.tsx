import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Store policies — datetime.store",
  description:
    "Shipping, personalized products, test orders, and privacy at datetime.store.",
};
export default function Policies() {
  return (
    <main className="policy-page">
      <a className="wordmark" href="/">
        datetime<span className="wordmark-dot">.</span>store
      </a>
      <p className="eyebrow" style={{ marginTop: 50 }}>
        THE PRACTICAL LITTLE DETAILS
      </p>
      <h1>A moment of clarity.</h1>
      <p>Last updated September 5, 2026.</p>
      <h2>Current store status</h2>
      <p>
        This deployment is a test store. Checkout uses Stripe test mode and
        orders go to the Prodigi sandbox. No real payments are collected and no
        physical products are made or shipped. Please use fictional customer
        details and Stripe’s test card information when trying it.
      </p>
      <h2>Your tee, your timestamp</h2>
      <p>
        The exact Unix timestamp shown in your bag is included with your order.
        One tee costs $32 USD, including standard US shipping. The available
        fits are Gildan 64000 unisex and Gildan 64000L fitted. The product
        preview is an illustrative mockup; final colors and placement can vary.
        Check the size guide before checkout.
      </p>
      <h2>Shipping</h2>
      <p>
        The store currently supports US addresses. For a future live store, the
        intended delivery estimate is 7–14 business days, including printing.
        That estimate must be confirmed against the production service before
        launch. Sandbox orders have no physical delivery.
      </p>
      <h2>Returns and issues</h2>
      <p>
        Personalized products are made to order. Before live sales begin, the
        owner must publish a final returns policy, support contact, seller
        identity, and any applicable consumer rights information. For testing,
        refunds and cancellations can be managed through the Stripe and Prodigi
        sandbox dashboards.
      </p>
      <h2>Privacy and payments</h2>
      <p>
        Payment details are entered on Stripe’s hosted checkout. This site does
        not receive or store your card number. Stripe holds your order, contact,
        and address information. A successful payment sends your shipping name
        and address, product selections, and printable timestamp to Prodigi for
        fulfillment. Order status is available to anyone who holds the private
        receipt link, so keep that link private.
      </p>
      <p style={{ marginTop: 15 }}>
        This site uses your browser’s local storage to keep one selected tee for
        up to 30 minutes. There are no advertising trackers. Hosting
        infrastructure and payment and print providers may retain operational
        logs according to their own policies. The owner must publish a complete
        privacy notice and data-request contact before accepting live orders.
      </p>
      <h2>Original idea</h2>
      <p>
        A rebuild of{" "}
        <a
          href="https://github.com/michelle/datetime.store"
          target="_blank"
          rel="noreferrer"
        >
          Michelle’s datetime.store
        </a>
        . The original live timestamp concept lives on, with Stripe Checkout and
        Prodigi fulfillment.
      </p>
      <p style={{ marginTop: 35 }}>
        <a href="/">← Back to the present</a>
      </p>
    </main>
  );
}
