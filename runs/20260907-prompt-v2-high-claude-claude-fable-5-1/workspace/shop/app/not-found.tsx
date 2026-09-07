import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl">Nothing here</h1>
      <p className="mt-3 text-ink/70">Like the job, this page no longer exists.</p>
      <Link href="/" className="btn mt-6">Back to the guild</Link>
    </div>
  );
}
