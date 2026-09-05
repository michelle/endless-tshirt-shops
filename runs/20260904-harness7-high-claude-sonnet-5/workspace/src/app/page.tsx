import Store from "@/components/Store";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-16 sm:py-24">
      <header className="mb-14">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          datetime.store
        </h1>
        <p className="mt-2 max-w-xl text-white/60">
          We sell a t-shirt with the current datetime. The exact millisecond
          you click buy gets printed on the front — forever yours, down to
          the millisecond.
        </p>
      </header>

      <Store />

      <footer className="mt-24 flex flex-col gap-1 border-t border-white/10 pt-6 text-xs text-white/30">
        <p>
          Payments processed by Stripe in test mode. No real charge will be
          made. Fulfillment runs against the Prodigi sandbox — no real order
          is produced or shipped.
        </p>
        <p>datetime.store — a reasonable rebuild, {new Date().getFullYear()}.</p>
      </footer>
    </main>
  );
}
