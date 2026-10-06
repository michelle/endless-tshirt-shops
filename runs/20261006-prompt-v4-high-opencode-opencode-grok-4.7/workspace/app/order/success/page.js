"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { shirtSvg } from "../../../lib/artwork.js"
import { money } from "../../../lib/format.js"

function Success() {
  const params = useSearchParams()
  const sessionId = params.get("session_id")
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    if (!sessionId) {
      setState({ loading: false, error: "No payment session on this page." })
      return
    }
    let cancel = false
    async function load() {
      setState({ loading: true })
      const response = await fetch(`/api/order?session_id=${encodeURIComponent(sessionId)}`)
      const data = await response.json()
      if (!cancel) setState({ loading: false, response: response.ok, data })
    }
    load()
    return () => {
      cancel = true
    }
  }, [sessionId])

  const data = state.data
  const paid = data?.paid
  const svg = paid && data.spec ? shirtSvg(data.spec, { width: 520 }) : ""

  return (
    <div className="wrap page">
      <header className="site">
        <a className="mark" href="/">VESPER</a>
      </header>
      <p className="kicker">Order</p>
      <h1>{state.loading ? "Checking payment…" : paid ? "Paid. The night is in the queue." : "Not paid yet."}</h1>
      {state.loading && <p>Confirming with Stripe, then sending the shirt to print if the payment succeeded.</p>}
      {state.error && <p className="error">{state.error}</p>}
      {data?.error && <p className="error">{data.error}</p>}
      {data && !paid && !data.error && (
        <p>Stripe does not show this checkout as paid, so nothing was sent to print. You can close this page and try again.</p>
      )}
      {paid && (
        <div className="status-card">
          <p className="ok">{data.alreadySent ? "Print order already submitted." : "Print order submitted after payment."}</p>
          <h2>{data.spec.place}</h2>
          <p>
            {money((data.amountTotal || 0) / 100, (data.currency || "usd").toUpperCase())}
            {data.prodigi?.id ? ` · Prodigi ${data.prodigi.id}` : ""}
            {data.prodigi?.stage ? ` · ${data.prodigi.stage}` : ""}
          </p>
          <p>
            Shipping to {data.shipping?.name}, {data.shipping?.city} {data.shipping?.postal}, {data.shipping?.country}.
          </p>
          {svg && <div className="shirt-frame" dangerouslySetInnerHTML={{ __html: svg }} />}
          <p className="note">Sandbox orders are not printed or shipped. Refreshing this page will not create a second print order.</p>
        </div>
      )}
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="wrap page"><p>Checking payment…</p></div>}>
      <Success />
    </Suspense>
  )
}
