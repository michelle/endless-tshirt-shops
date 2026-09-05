import Link from "next/link";
import Header from "@/components/Header";

export default function NotFound() {
  return (
    <main className="container">
      <Header />
      <p>That order doesn&apos;t exist (or the link is wrong).</p>
      <p style={{ marginTop: 12 }}>
        <Link href="/">← Back to the shop</Link>
      </p>
    </main>
  );
}
