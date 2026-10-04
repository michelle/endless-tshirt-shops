import type { Metadata } from "next";
export const metadata: Metadata = { title: "Terms" };
export default function Page() {
  return (
    <div className="page prose">
      <h1>Terms of sale</h1>
      <p>By placing an order you confirm that the text, date and place you entered are correct and that you have the right to print them. Each shirt is made to order from your design and priced as shown at checkout, in US dollars.</p>
      <p>The sky depiction is a scientific rendering of star, planet, Sun and Moon positions for the date, time and place entered; it is an artistic print rather than a navigational chart. Where you don&rsquo;t know the time we render 9 pm local time.</p>
      <p>We may refuse or cancel orders containing unlawful or abusive content, with a full refund. See <a href="/shipping-returns" style={{ textDecoration: "underline" }}>Shipping &amp; returns</a> for delivery and reprint terms. Placeholder: have these terms reviewed before launch.</p>
    </div>
  );
}
