import { Footer, Nav } from '@/components/SiteChrome';

export const metadata = { title: 'Shipping, returns & privacy — Skyprint' };

export default function Policies() {
  return (
    <>
      <Nav />
      <main className="page">
        <h1>Shipping, returns &amp; privacy</h1>
        <h2>Production &amp; shipping</h2>
        <p>Every shirt is printed to order after payment is confirmed, then shipped by our print partner from the production facility nearest to you. Typical delivery is 5–12 business days. Shipping is a flat rate by destination country, shown before you pay.</p>
        <h2>Returns &amp; reprints</h2>
        <p>Because each shirt is personalised, we cannot accept returns for change of mind or incorrect sizing. If your shirt arrives damaged, defective or misprinted, contact us within 30 days with a photo and we will reprint or refund it. Please double-check the date, place and spelling in the preview before you order — it is printed exactly as shown.</p>
        <h2>Privacy</h2>
        <p>We collect your name, email, shipping address and the details of your design only to take payment, print and ship your order. Payment details are handled by our payment processor and never touch our servers. Your name and address are shared with our print and delivery partners solely to fulfil your order.</p>
      </main>
      <Footer />
    </>
  );
}
