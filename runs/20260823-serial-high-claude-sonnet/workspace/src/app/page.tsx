import ShopClient from "@/components/ShopClient";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-16 sm:py-24">
      <header className="mb-14 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          datetime.store
        </h1>
        <p className="mx-auto mt-3 max-w-md text-neutral-500">
          We sell a t-shirt with the current datetime.
        </p>
      </header>
      <ShopClient />
      <footer className="mt-24 text-center text-xs text-neutral-400">
        One shirt, printed the instant you buy it. No refunds on time itself.
      </footer>
    </main>
  );
}
