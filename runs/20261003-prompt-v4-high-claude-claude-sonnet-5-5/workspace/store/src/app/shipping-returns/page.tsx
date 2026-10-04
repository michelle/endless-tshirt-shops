import type { Metadata } from "next";
export const metadata: Metadata = { title: "Shipping & returns" };
export default function Page() {
  return (
    <div className="page prose">
      <h1>Shipping &amp; returns</h1>
      <h2>Production &amp; delivery</h2>
      <p>Every shirt is printed to order after your payment clears, then shipped from a print lab in or near your region. Production usually takes 2&ndash;5 business days, plus transit, so expect your shirt about 5&ndash;10 business days after ordering (longer for international orders and during holidays).</p>
      <p>Shipping is calculated in your cart from the destination and the number of shirts, and is shown before you pay. You will receive tracking details on your order page once the shirt ships.</p>
      <h2>Returns &amp; reprints</h2>
      <p>Because each shirt is personalised for you, we can&rsquo;t accept returns for the wrong size or a change of mind. If your shirt arrives damaged, misprinted or defective, contact us within 30 days with a photo and we will reprint or refund it.</p>
      <p>Please double-check the date, time and place in your preview before ordering. The sky is computed exactly from what you enter.</p>
      <h2>Contact</h2>
      <p>Placeholder: add your support email here before launch.</p>
    </div>
  );
}
