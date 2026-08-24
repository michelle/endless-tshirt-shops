import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
      <div className="font-mono text-sm tracking-widest text-neutral-500">CHECKOUT CANCELED</div>
      <h1 className="text-3xl font-bold">No charge was made.</h1>
      <p className="text-neutral-400 max-w-md">
        Your moment is still available — the current datetime never runs out.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-full bg-orange-500 hover:bg-orange-400 text-neutral-950 font-semibold px-6 py-3 font-mono"
      >
        BACK TO DATETIME.STORE
      </Link>
    </div>
  );
}
