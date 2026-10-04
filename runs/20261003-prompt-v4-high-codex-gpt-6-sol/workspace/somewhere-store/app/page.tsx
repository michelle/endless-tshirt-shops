"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Details = { place: string; momentDate: string; dedication: string; color: string; size: string };

function prettyDate(value: string) {
  const [year, month, day] = value.split("-");
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${months[Number(month) - 1] || "JUN"} ${day || "21"}, ${year || "2024"}`;
}

function drawArt(canvas: HTMLCanvasElement, details: Details) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.scale(w / 1000, h / 1237);
  const ink = "#f3ead5", bright = "#f3ad6e", cool = "#8cc5b9";
  let seed = [...`${details.place}${details.momentDate}${details.dedication}`]
    .reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 17);
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const centerX = 500, centerY = 552;
  for (let ring = 0; ring < 10; ring++) {
    const radius = 170 + ring * 22;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) {
      const angle = (i / 300) * Math.PI * 2;
      const ripple = 9 * Math.sin(angle * (3 + (seed % 4)) + ring * .34) + 5 * Math.sin(angle * 7 + ring * .29);
      const x = centerX + Math.cos(angle) * (radius + ripple);
      const y = centerY + Math.sin(angle) * (radius * .83 + ripple);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = ring % 3 === 0 ? "rgba(243,173,110,.78)" : "rgba(140,197,185,.6)";
    ctx.lineWidth = ring % 3 === 0 ? 2.2 : 1.3;
    ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(centerX, centerY, 154, 128, -.22, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(8,36,42,.92)"; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(centerX, centerY, 117, 98, .26, 0, Math.PI * 2);
  ctx.strokeStyle = bright; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(centerX, centerY, 58, 0, Math.PI * 2);
  ctx.fillStyle = bright; ctx.fill();
  ctx.beginPath(); ctx.arc(centerX + 22, centerY - 12, 53, 0, Math.PI * 2);
  ctx.fillStyle = "#08242a"; ctx.fill();
  for (let i = 0; i < 36; i++) {
    const x = 110 + random() * 780, y = 260 + random() * 600;
    if (Math.hypot(x - centerX, (y - centerY) * 1.2) < 165) continue;
    ctx.fillStyle = i % 5 === 0 ? bright : ink;
    ctx.globalAlpha = .55 + random() * .45;
    ctx.beginPath(); ctx.arc(x, y, i % 6 === 0 ? 3.5 : 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.font = "600 23px Arial, sans-serif";
  ctx.letterSpacing = "7px";
  ctx.fillText("SOMEWHERE, ALWAYS", 500, 153);
  ctx.beginPath(); ctx.moveTo(330, 183); ctx.lineTo(670, 183);
  ctx.strokeStyle = bright; ctx.lineWidth = 2; ctx.stroke();
  const place = details.place.trim().toUpperCase() || "YOUR PLACE";
  const placeSize = place.length > 24 ? 44 : place.length > 16 ? 52 : 63;
  ctx.font = `500 ${placeSize}px Georgia, serif`;
  ctx.letterSpacing = "2px";
  ctx.fillText(place, 500, 951, 820);
  ctx.font = "500 24px Arial, sans-serif";
  ctx.letterSpacing = "7px";
  ctx.fillStyle = bright;
  ctx.fillText(prettyDate(details.momentDate), 500, 1003);
  ctx.beginPath(); ctx.moveTo(420, 1033); ctx.lineTo(580, 1033);
  ctx.strokeStyle = cool; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = "italic 30px Georgia, serif";
  ctx.letterSpacing = "0px";
  ctx.fillStyle = ink;
  ctx.fillText(details.dedication.trim() || "A moment worth keeping", 500, 1086, 790);
  ctx.restore();
}

export default function Home() {
  const [details, setDetails] = useState<Details>({ place: "Joshua Tree", momentDate: "2024-06-21", dedication: "Where our story began", color: "black", size: "m" });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const update = (field: keyof Details, value: string) => setDetails(current => ({ ...current, [field]: value }));

  useEffect(() => { if (canvas.current) drawArt(canvas.current, details); }, [details]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("order"), session = params.get("session_id");
    if (params.has("cancelled")) setNotice("Checkout cancelled. Your design is still here.");
    if (!id || !session) return;
    setOrderStatus("Checking your payment and order…");
    let tries = 0;
    const check = async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(id)}?session_id=${encodeURIComponent(session)}`);
        const data = await res.json() as { error?: string; status?: string; reference?: string };
        if (!res.ok) throw new Error(data.error || "Status unavailable");
        if (data.status === "submitted") setOrderStatus(`Order ${data.reference} is confirmed. Your custom shirt has been sent to our print partner.`);
        else if (data.status === "processing" && tries++ < 8) { setOrderStatus("Payment confirmed. Sending your shirt to print…"); setTimeout(check, 2500); }
        else if (data.status === "awaiting_payment") setOrderStatus("Payment is still processing. Please check again shortly.");
        else setOrderStatus(`Payment received, but order ${data.reference} needs attention. Please contact the store before placing another order.`);
      } catch { setOrderStatus("We could not check the order right now. Please try again shortly."); }
    };
    void check();
  }, []);

  const checkout = useCallback(async () => {
    if (!details.place.trim() || !details.dedication.trim() || !details.momentDate) {
      setNotice("Add a place, date, and dedication to finish your design."); return;
    }
    setLoading(true); setNotice("");
    try {
      const print = document.createElement("canvas");
      print.width = 4677; print.height = 5787;
      drawArt(print, details);
      const blob = await new Promise<Blob | null>(resolve => print.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not prepare your print image.");
      const form = new FormData();
      Object.entries(details).forEach(([key, value]) => form.set(key, value));
      form.set("art", blob, "shirt-print.png");
      const response = await fetch("/api/checkout", { method: "POST", body: form });
      const result = await response.json() as { error?: string; url?: string };
      if (!response.ok) throw new Error(result.error || "Checkout is unavailable.");
      if (!result.url) throw new Error("Checkout did not provide a payment page.");
      window.location.href = result.url;
    } catch (error) { setNotice(error instanceof Error ? error.message : "Checkout is unavailable."); setLoading(false); }
  }, [details]);

  return <main>
    <header className="site-header">
      <a className="brand" href="/" aria-label="Somewhere, Always home"><span className="brand-mark">✳</span> somewhere<span className="brand-comma">,</span> always<span className="brand-dot">.</span></a>
      <div className="header-right"><span className="header-note">ONE PLACE. ONE MOMENT. YOURS.</span><a href="#create" className="header-link">Create yours <span>↗</span></a></div>
    </header>
    {orderStatus && <div className="status-banner" role="status">{orderStatus}</div>}
    <section className="store-grid" id="create">
      <div className="story-panel">
        <div className="eyebrow"><span className="eyebrow-line"/> THE PERSONAL EDITION / NO. 001</div>
        <h1>Wear the place<br/><em>that stays with you.</em></h1>
        <p className="intro">A one of one tee for a landmark in your life: the place, the day, and the words only you would choose.</p>
        <div className="story-divider"/>
        <div className="mini-features"><div><span>01</span><p>Make it personal.<br/>Every line is yours.</p></div><div><span>02</span><p>Printed on demand.<br/>Made only for you.</p></div></div>
        <div className="smallprint">Gildan SoftStyle · unisex fit · front print · US shipping</div>
      </div>
      <div className="preview-panel">
        <div className="preview-top"><span>LIVE PREVIEW</span><span>FRONT / {details.color.toUpperCase()}</span></div>
        <div className="shirt-stage">
          <svg className="shirt-shape" viewBox="0 0 540 620" role="img" aria-label={`${details.color} t-shirt mockup`}><defs><filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="17" floodOpacity=".22"/></filter></defs><path filter="url(#shadow)" fill={details.color === "navy" ? "#1d3043" : "#1c2327"} d="M177 50 L222 37 Q270 73 318 37 L363 50 L422 86 L501 193 L431 246 L387 192 L387 575 Q270 590 153 575 L153 192 L109 246 L39 193 L118 86 Z"/><path fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="3" d="M222 37 Q270 92 318 37"/></svg>
          <canvas ref={canvas} width="1000" height="1237" className="shirt-art" aria-label="Your personalized shirt design" role="img"/>
          <span className="preview-stamp">DESIGNED BY YOU<br/>PRINTED FOR YOU</span>
        </div>
        <div className="preview-bottom"><span>YOUR DESIGN UPDATES AS YOU TYPE</span><span>✳</span></div>
      </div>
      <div className="customize-panel">
        <span className="form-kicker">THE CUSTOM STUDIO</span>
        <h2>Make it yours<span>.</span></h2>
        <p className="form-intro">Tell us about a place that means something. We’ll turn it into wearable art.</p>
        <div className="form-fields">
          <label><span>YOUR PLACE <b>01</b></span><input maxLength={32} value={details.place} onChange={e => update("place", e.target.value)} placeholder="e.g. Joshua Tree"/></label>
          <label><span>THE DATE <b>02</b></span><input type="date" value={details.momentDate} onChange={e => update("momentDate", e.target.value)}/></label>
          <label><span>A FEW WORDS <b>03</b></span><input maxLength={38} value={details.dedication} onChange={e => update("dedication", e.target.value)} placeholder="e.g. Where our story began"/><small>{details.dedication.length}/38 characters</small></label>
          <fieldset><legend>SHIRT COLOR <b>04</b></legend><div className="color-options"><button type="button" aria-pressed={details.color === "black"} onClick={() => update("color", "black")}><i className="swatch black"/> Black</button><button type="button" aria-pressed={details.color === "navy"} onClick={() => update("color", "navy")}><i className="swatch navy"/> Navy</button></div></fieldset>
          <fieldset><legend>SIZE <b>05</b></legend><div className="size-options">{["s", "m", "l", "xl", "2xl"].map(size => <button type="button" key={size} aria-pressed={details.size === size} onClick={() => update("size", size)}>{size.toUpperCase()}</button>)}</div></fieldset>
        </div>
        <div className="purchase"><div><span>YOUR CUSTOM TEE</span><strong>$39</strong></div><div><span>US STANDARD SHIPPING</span><strong>$6</strong></div><div className="total"><span>TOTAL</span><strong>$45</strong></div></div>
        <button className="checkout-button" disabled={loading} onClick={checkout}>{loading ? "PREPARING CHECKOUT…" : "CREATE & CHECK OUT"}<span>↗</span></button>
        {notice && <p className="notice" role="alert">{notice}</p>}
        <p className="checkout-note">Secure checkout through Stripe. The shirt is sent to print only after payment succeeds.</p>
      </div>
    </section>
    <footer><span>✳ SOMEWHERE, ALWAYS</span><span>YOUR STORY LOOKS GOOD ON YOU.</span><span>© 2026</span></footer>
  </main>;
}
