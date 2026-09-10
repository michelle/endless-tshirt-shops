import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-serif-display text-4xl mb-8">How Constella Works</h1>

      <div className="space-y-8 text-white/70 leading-relaxed">
        <section>
          <h2 className="font-serif-display text-2xl text-white mb-2">1. It&apos;s generated, not decorated</h2>
          <p>
            Most &quot;custom&quot; t-shirts just place your text on a template. Constella is different:
            your phrase is fed through a deterministic algorithm that plots a unique field of
            stars and draws the shortest path connecting them, like a real constellation. Change
            one letter and you get a different sky. Because the process is deterministic, the
            exact same input always regenerates the exact same artwork — which also means you can
            always reorder your design later.
          </p>
        </section>
        <section>
          <h2 className="font-serif-display text-2xl text-white mb-2">2. Nothing is printed until you&apos;ve paid</h2>
          <p>
            Checkout is handled by Stripe. Your card details never touch our servers. Only after
            Stripe confirms your payment does our server send the artwork and your shipping
            address to our print partner, Prodigi, who prints it direct-to-garment and ships it to
            you. If payment fails or is canceled, nothing is ever sent to print.
          </p>
        </section>
        <section>
          <h2 className="font-serif-display text-2xl text-white mb-2">3. Made on demand</h2>
          <p>
            There&apos;s no warehouse of pre-printed shirts. Each order is printed specifically for
            you after checkout, direct-to-garment, on a Gildan 64000 unisex softstyle tee.
          </p>
        </section>
      </div>

      <Link href="/design" className="inline-block mt-10 rounded-full bg-amber-300 text-black font-semibold px-7 py-3">
        Design Yours
      </Link>
    </div>
  );
}
