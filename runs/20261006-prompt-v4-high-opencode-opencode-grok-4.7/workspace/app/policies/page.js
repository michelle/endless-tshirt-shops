export const metadata = { title: "Care & shipping — Vesper" }

export default function PoliciesPage() {
  return (
    <div className="wrap page">
      <header className="site">
        <a className="mark" href="/">VESPER</a>
        <nav><a href="/">The chart</a></nav>
      </header>
      <h1>Care, shipping, privacy.</h1>
      <h2>What you receive</h2>
      <p>
        A Gildan Softstyle 64000 printed on the front with the sky from the date, time, and place you chose. The shirt colour is the background. We do not print a white rectangle behind the chart.
      </p>
      <h2>When it prints</h2>
      <p>
        Nothing is sent to the print network until Stripe reports the payment as paid. This deployment uses Stripe test mode and the Prodigi sandbox, so a successful test payment creates a sandbox order and does not produce a garment or charge a real card.
      </p>
      <h2>Shipping</h2>
      <p>
        Shipping is quoted for your country before you pay, then fulfilled by Prodigi from the lab nearest the address. Economy, Standard, and Express follow Prodigi’s service levels, not a van we own. Duties may apply outside the United States. Prices are in USD and do not include sales tax on this deployment.
      </p>
      <h2>Returns</h2>
      <p>
        Each shirt is made after you order it. Custom work is final sale unless it arrives misprinted, damaged, or the wrong size relative to what you ordered. Write to the address on your Stripe receipt and we will reprint or refund.
      </p>
      <h2>Care</h2>
      <p>Wash inside out, cold, with similar colours. Tumble low or hang. Avoid ironing the print. The ink sits in the fabric; heat and bleach are what fade it.</p>
      <h2>Privacy</h2>
      <p>
        We use your name, address, email, and phone to print and ship, and to send the receipt. Card numbers are handled by Stripe; they never touch this store. The design is regenerated from the details of the paid order. We do not sell the list.
      </p>
      <p className="note">This sandbox does not have a monitored support inbox. Use the order page after paying to confirm the print was submitted.</p>
    </div>
  )
}
