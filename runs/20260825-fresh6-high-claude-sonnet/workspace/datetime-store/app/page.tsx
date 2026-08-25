import ProductExperience from "@/components/ProductExperience";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <header className="flex items-center justify-between px-6 sm:px-10 py-6">
        <span className="text-sm font-black uppercase tracking-[0.2em]">
          datetime.store
        </span>
        <span className="hidden sm:flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-white/40">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
          one shirt, one moment
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 sm:px-10 pb-24">
        <div className="max-w-2xl text-center mt-10 mb-16">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[0.95]">
            A t-shirt printed with
            <br />
            the exact moment you buy it.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-white/60 max-w-lg mx-auto">
            We only sell one design: the current date and time, down to the
            millisecond, frozen forever on a shirt. Buy it right now and the
            number on your chest will never exist again.
          </p>
        </div>

        <ProductExperience />

        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl text-center">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.15em] mb-1">
              Printed on demand
            </div>
            <p className="text-sm text-white/50">
              Nothing exists until you order. Your timestamp is generated the
              instant checkout completes.
            </p>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.15em] mb-1">
              Fulfilled by Prodigi
            </div>
            <p className="text-sm text-white/50">
              Premium Gildan blanks, printed and shipped worldwide by
              Prodigi&rsquo;s on-demand print network.
            </p>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.15em] mb-1">
              Secured by Stripe
            </div>
            <p className="text-sm text-white/50">
              Card, Apple Pay, and Google Pay checkout, handled entirely by
              Stripe.
            </p>
          </div>
        </div>
      </main>

      <footer className="px-6 sm:px-10 py-8 text-center text-[11px] text-white/30">
        datetime.store &mdash; every shirt is one of one.
      </footer>
    </div>
  );
}
