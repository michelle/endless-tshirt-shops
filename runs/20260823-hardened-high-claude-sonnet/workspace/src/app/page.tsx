import Shop from "@/components/Shop";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-xl text-center mb-12">
        <p className="text-sm tracking-[0.3em] text-teal-400 mb-4">THE DATETIME STORE</p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
          A shirt printed with this exact moment.
        </h1>
        <p className="text-zinc-400 text-base sm:text-lg">
          The instant your order is placed — down to the millisecond — gets
          rendered onto a shirt and printed on demand. Nobody else will ever
          own this moment.
        </p>
      </div>
      <Shop />
      <footer className="mt-24 text-xs text-zinc-500 text-center">
        <p>datetime.store — printed on demand by Scalable Press. All times shown in UTC.</p>
      </footer>
    </div>
  );
}
