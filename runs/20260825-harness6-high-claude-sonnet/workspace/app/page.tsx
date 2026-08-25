import Storefront from "@/components/Storefront";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const { canceled } = await searchParams;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
        <header className="mb-16 text-center sm:text-left">
          <h1 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">
            datetime.store
          </h1>
          <p className="mt-3 max-w-xl text-lg text-neutral-400 sm:text-xl">
            We sell a t-shirt with the current datetime.{" "}
            <span className="text-white">The one on the shirt is now.</span>
          </p>
          {canceled ? (
            <p className="mt-4 inline-block rounded-full border border-white/15 px-4 py-2 font-mono text-xs text-neutral-400">
              Checkout canceled — the moment moved on, but you can grab a new
              one whenever you&apos;re ready.
            </p>
          ) : null}
        </header>

        <Storefront />

        <section className="mt-28 grid gap-10 border-t border-white/10 pt-16 sm:grid-cols-3">
          <Step
            n="01"
            title="You click buy"
            body="Pick a cut and a size. The clock keeps ticking until the instant you check out."
          />
          <Step
            n="02"
            title="We freeze the moment"
            body="The exact date, time, and millisecond you paid becomes the artwork — down to the millisecond."
          />
          <Step
            n="03"
            title="Prodigi prints & ships"
            body="Your one‑of‑one shirt is printed on demand and shipped worldwide, free."
          />
        </section>

        <section className="mt-20 border-t border-white/10 pt-16">
          <h2 className="font-mono text-sm uppercase tracking-widest text-neutral-500">
            FAQ
          </h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2">
            <Faq
              q="Will my shirt say the same time as someone else's?"
              a="No. Your timestamp is captured to the millisecond at the moment your payment clears, so no two shirts are the same — ever."
            />
            <Faq
              q="What if I want a specific date instead?"
              a="Right now datetime.store only sells right now. That's the whole point."
            />
            <Faq
              q="How is this fulfilled?"
              a="Every order is a print-on-demand job sent straight to Prodigi's global production network, so it ships from the location closest to you."
            />
            <Faq
              q="Is checkout secure?"
              a="Yes — payment is handled entirely by Stripe Checkout. We never see or store your card details."
            />
          </div>
        </section>
      </div>

      <footer className="mt-20 border-t border-white/10 py-10 text-center text-xs text-neutral-500">
        <p>
          datetime.store · Payments by Stripe · Fulfillment by Prodigi ·
          Running in test / sandbox mode
        </p>
      </footer>
    </main>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="font-mono text-xs text-neutral-600">{n}</div>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-400">{body}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h3 className="font-medium">{q}</h3>
      <p className="mt-1 text-sm text-neutral-400">{a}</p>
    </div>
  );
}
