import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <p className="stamp mb-6">Form not found</p>
      <h1 className="font-slab text-4xl">This future was never filed.</h1>
      <p className="mt-3 text-ink-2">The page you asked for doesn’t exist, or the order id was mistyped.</p>
      <Link href="/" className="btn mt-8">Back to the Department</Link>
    </div>
  );
}
