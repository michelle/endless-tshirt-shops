import { redirect } from "next/navigation";
import { Foot, Nav } from "@/components/Chrome";
import { Tee } from "@/components/Tee";
import SandboxCheckout from "./SandboxCheckout";
import { renderFront } from "@/lib/render";
import { ShippingOptionId, totals } from "@/lib/pricing";
import { unpack } from "@/lib/sign";
import { GARMENTS, SIZE_LABELS, sanitizeSpec, serialOf, Spec } from "@/lib/spec";
import { stripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type DemoSession = {
  k: string; ref: string; spec: Spec; qty: number;
  shipping: ShippingOptionId; origin: string; amount: number; iat: number;
};

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  if (stripeEnabled()) redirect("/design");

  const { token } = await params;
  const session = unpack<DemoSession>(token);
  if (!session || session.k !== "demo") {
    return (
      <>
        <Nav />
        <main className="wrap" style={{ padding: "80px 0" }}>
          <h2>That checkout link is not valid.</h2>
          <p>Start again from the designer and your work will still be there.</p>
          <a className="btn" href="/design">Back to the designer</a>
        </main>
        <Foot />
      </>
    );
  }

  const spec = sanitizeSpec(session.spec);
  const t = totals(spec, session.qty, session.shipping);
  const garment = GARMENTS[spec.garment];

  return (
    <>
      <Nav />
      <main className="wrap">
        <div className="checkout">
          <SandboxCheckout
            token={token}
            ref_={session.ref}
            amount={t.total}
            shipping={session.shipping}
          />

          <aside>
            <div className="card">
              <div style={{ maxWidth: 220, margin: "0 auto 18px" }}>
                <Tee color={garment.hex}>
                  <div dangerouslySetInnerHTML={{ __html: renderFront(spec) }} />
                </Tee>
              </div>
              <h3>{spec.title}</h3>
              <p className="muted" style={{ margin: "0 0 14px" }}>
                {garment.label} &middot; {SIZE_LABELS[spec.size]} &middot;{" "}
                {spec.backPrint ? "front + back" : "front print"} &middot; no. {serialOf(spec)}
              </p>
              <hr className="hr" />
              <table className="summary">
                <tbody>
                  <tr><td>{t.qty} &times; custom tee</td><td>{(t.subtotal / 100).toFixed(2)} USD</td></tr>
                  <tr><td>{session.shipping === "express" ? "Express" : "Standard"} shipping</td><td>{(t.shipping / 100).toFixed(2)} USD</td></tr>
                  <tr className="total"><td>Total</td><td>{(t.total / 100).toFixed(2)} USD</td></tr>
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ marginTop: 14 }}>
              Order reference <strong>{session.ref}</strong>
            </p>
          </aside>
        </div>
      </main>
      <Foot />
    </>
  );
}
