export default function AboutPage() {
  return (
    <div className="bg-bone">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="font-serif text-5xl tracking-tight">About HERE</h1>
        <p className="text-ink/80 text-lg mt-4 leading-relaxed">
          HERE is a tiny studio t-shirt company. We make exactly one product —
          a tee printed with the coordinates of the place whose meaning is yours.
        </p>
        <p className="text-ink/80 mt-4 leading-relaxed">
          We don't print anything until you order. We don't hold inventory. We don't have
          a warehouse. We use direct-to-garment printing (DTG) — the same technology
          that lets us print tiny monospaced coordinates clearly on a tee — and we
          ship from <span className="font-mono">Prodigi's</span> network of labs.
        </p>
        <p className="text-ink/80 mt-4 leading-relaxed">
          The store is built on Next.js, payments are processed by{' '}
          <span className="font-mono">Stripe</span>, and the app is deployed to{' '}
          <span className="font-mono">Vercel</span>.
        </p>

        <div className="mt-12 border-t border-ink/10 pt-8">
          <h2 className="font-serif text-2xl">Pricing</h2>
          <ul className="mt-2 text-sm text-ink/70 list-disc list-inside">
            <li>Shirt + DTG print: <span className="font-mono">$34.99</span></li>
            <li>Standard shipping: included (US, UK, CA, AU, EU)</li>
            <li>Express / overnight: available at checkout</li>
            <li>Returns: 30 days, no questions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
