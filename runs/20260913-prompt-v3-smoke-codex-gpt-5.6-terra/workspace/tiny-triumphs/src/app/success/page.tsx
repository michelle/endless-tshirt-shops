import Link from "next/link";

export default function Success() {
  return <main style={{ minHeight: "100vh", background: "#f8e7ce", display: "grid", placeItems: "center", padding: 24 }}><section style={{ maxWidth: 620, textAlign: "center", color: "#17263c" }}><p style={{ color: "#e84f44", fontWeight: 800, letterSpacing: ".14em", fontSize: 12 }}>TINY TRIUMPH RECORDED</p><h1 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(3rem,8vw,6rem)", lineHeight: .9, letterSpacing: "-.07em", margin: "22px 0" }}>You did the thing.</h1><p style={{ fontSize: 18, lineHeight: 1.6, marginBottom: 32 }}>Payment received. Your personal edition is headed to production; we’ll use the email from checkout for order updates.</p><Link href="/" style={{ background: "#e84f44", color: "white", padding: "15px 22px", fontWeight: 800 }}>Make another tiny triumph →</Link></section></main>;
}
