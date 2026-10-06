import Link from 'next/link';

interface Props {
  searchParams: { order?: string };
}

export default function CancelPage({ searchParams }: Props) {
  return (
    <div className="bg-bone">
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-rust">Cancelled</div>
        <h1 className="font-serif text-5xl mt-2 tracking-tight">No charge.</h1>
        <p className="text-ink/70 mt-3 max-w-md mx-auto">
          You didn't check out, so nothing was charged{searchParams.order ? ' for order #' + searchParams.order.slice(0, 8) : ''}.
          Your design is still here whenever you want to come back.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/" className="border border-ink/20 px-5 py-3 rounded-full">Back home</Link>
          {searchParams.order ? (
            <Link href={`/design`} className="bg-ink text-bone px-5 py-3 rounded-full hover:bg-rust">Try again</Link>
          ) : (
            <Link href="/design" className="bg-ink text-bone px-5 py-3 rounded-full hover:bg-rust">Start designing</Link>
          )}
        </div>
      </div>
    </div>
  );
}
