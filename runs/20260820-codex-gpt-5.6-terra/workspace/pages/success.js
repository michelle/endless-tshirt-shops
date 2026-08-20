import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
export default function Success() {
  const router = useRouter(); const [state,setState]=useState("confirming"); const [message,setMessage]=useState("");
  useEffect(()=>{ if (!router.isReady) return; const id=router.query.session_id; if (!id) { setState("error"); setMessage("We could not find your checkout session."); return; }
    fetch("/api/fulfill",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sessionId:id})}).then(async r=>{const d=await r.json(); if(!r.ok) throw new Error(d.error); setState("done"); setMessage(d.orderId ? `Fulfillment order ${d.orderId} has been submitted.` : "Your payment is confirmed. Your order is queued for fulfillment.");}).catch(e=>{setState("error");setMessage(e.message||"Payment is complete, but we could not confirm fulfillment yet. Please contact support with your receipt.");}); },[router.isReady,router.query.session_id]);
  return <main className="success-page"><header><Link className="wordmark" href="/">datetime.store</Link></header><section><div className="check">✓</div><h1>{state === "confirming" ? "Confirming your moment…" : state === "done" ? "Congrats on your pretty cool shirt!" : "Payment received"}</h1><p>{state === "confirming" ? "We’re preparing your order." : message}</p>{state !== "confirming" && <Link href="/" className="again">Get another shirt</Link>}</section></main>;
}
