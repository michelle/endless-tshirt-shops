import Link from "next/link";
export default function NotFound() {
  return <main className="p-10"><p className="text-dim">Lost in space. <Link className="underline" href="/">Back home</Link>.</p></main>;
}
