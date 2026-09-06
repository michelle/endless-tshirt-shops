import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center">
      <p className="font-mono font-extrabold text-8xl">404</p>
      <p className="font-mono text-xl mt-2">Not Found</p>
      <p className="text-muted mt-4">Ironically, we do sell this one.</p>
      <Link href="/tee/404" className="inline-block mt-6 rounded-lg bg-accent text-ink font-mono font-extrabold px-5 py-3">Get the 404 tee →</Link>
    </div>
  );
}
