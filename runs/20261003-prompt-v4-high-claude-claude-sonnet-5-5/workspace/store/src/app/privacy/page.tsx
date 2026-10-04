import type { Metadata } from "next";
export const metadata: Metadata = { title: "Privacy" };
export default function Page() {
  return (
    <div className="page prose">
      <h1>Privacy</h1>
      <p>We collect only what is needed to make and deliver your order: your design details, shipping name and address, email and phone number.</p>
      <ul>
        <li><b>Payments</b> are processed by Stripe. Card details go directly to Stripe and never touch our servers.</li>
        <li><b>Printing &amp; delivery</b>: your name, address, phone and design are shared with our print and shipping partner (Prodigi) and its carriers solely to fulfil your order.</li>
        <li><b>Your cart</b> is stored only in your browser until you check out.</li>
      </ul>
      <p>We do not sell your data. Contact us to request access to or deletion of your order data. Placeholder: add your legal entity and contact details before launch.</p>
    </div>
  );
}
