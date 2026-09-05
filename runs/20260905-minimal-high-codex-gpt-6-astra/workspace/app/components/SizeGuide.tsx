"use client";
import { useRef, useState } from "react";
import { X, Ruler } from "lucide-react";
export default function SizeGuide({ fit }: { fit: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [unit, setUnit] = useState("in");
  const fitted = fit === "fitted";
  const chest = fitted ? [41, 43, 47, 50] : [86.3, 96.5, 106.6, 116.8];
  const length = fitted ? [64, 67, 69, 71] : [71.1, 74.2, 76.8, 79.3];
  const measure = (cm: number) =>
    unit === "cm" ? cm.toFixed(1) : (cm / 2.54).toFixed(1);
  return (
    <>
      <button
        type="button"
        className="size-guide-link"
        onClick={() => ref.current?.showModal()}
      >
        <Ruler size={12} /> Size guide
      </button>
      <dialog
        ref={ref}
        className="size-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) ref.current?.close();
        }}
      >
        <div className="dialog-head">
          <span className="eyebrow">FIND YOUR EVERYDAY FIT</span>
          <button
            aria-label="Close size guide"
            onClick={() => ref.current?.close()}
          >
            <X size={21} />
          </button>
        </div>
        <h2>{fitted ? "Fitted" : "Unisex"} size guide</h2>
        <p>
          {fitted
            ? "Gildan 64000L. A closer, shaped silhouette. Measure a favorite tee laid flat."
            : "Gildan 64000. An easy, semi-fitted silhouette. Measure around the fullest part of your chest."}
        </p>
        <div className="unit-switch" aria-label="Measurement units">
          {["in", "cm"].map((u) => (
            <button
              key={u}
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
            >
              {u === "in" ? "Inches" : "Centimeters"}
            </button>
          ))}
        </div>
        <table>
          <thead>
            <tr>
              <th>Size</th>
              <th>
                {fitted ? "Garment width" : "Chest to fit"} ({unit})
              </th>
              <th>Length ({unit})</th>
            </tr>
          </thead>
          <tbody>
            {["S", "M", "L", "XL"].map((s, i) => (
              <tr key={s}>
                <th>{s}</th>
                <td>{measure(chest[i])}</td>
                <td>{measure(length[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="guide-footnote">
          Between sizes? Size up for a little more room. Measurements are
          approximate.{" "}
          <a
            href={
              fitted
                ? "https://www.prodigi.com/products/womens-clothing/t-shirts/classic/gildan-64000l/"
                : "https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-64000/"
            }
            target="_blank"
            rel="noreferrer"
          >
            View garment specifications ↗
          </a>
        </p>
        <button className="checkout" onClick={() => ref.current?.close()}>
          Got it
        </button>
      </dialog>
    </>
  );
}
