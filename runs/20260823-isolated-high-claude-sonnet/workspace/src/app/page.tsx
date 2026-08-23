import { StoreApp } from "@/components/StoreApp";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-neutral-50">
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 sm:py-16">
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            ● Test mode — no real charges
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            datetime.store
          </h1>
          <p className="mx-auto mt-3 max-w-md text-neutral-500">
            We sell a t-shirt printed with the current date and time — frozen the exact instant
            you check out. It will never be printed again.
          </p>
        </header>
        <StoreApp />
      </main>
      <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-400">
        Payments by Stripe · Printing by Scalable Press · Every timestamp is one-of-one
      </footer>
    </div>
  );
}
