import type { Metadata } from "next";
import Link from "next/link";
import { designs } from "@/lib/catalog";

export const metadata: Metadata = { title: "About the parks" };

export default function About() {
  return (
    <div className="narrow prose">
      <h1>About the Deprecated Parks Service</h1>
      <p className="lead">
        In the 1930s the WPA printed posters urging Americans to visit their national parks. We do the same for the technology we used every day and then quietly
        stopped using. Every design is drawn from scratch in that style and given a park, an establishment year, and a small set of rules for visitors.
      </p>
      <h2>The parks</h2>
      <ul>
        {designs.map((d) => (
          <li key={d.slug}>
            <Link href={`/shirts/${d.slug}`}>
              <strong>{d.name}</strong>
            </Link>{" "}
            (est. {d.est}) · {d.blurb}
          </li>
        ))}
      </ul>

      <h2 id="sizing">Sizing &amp; care</h2>
      <p>Unisex Gildan 64000 Softstyle, a slim-but-not-tight fit in 100% ring-spun cotton. If you are between sizes, go up.</p>
      <table className="sizes-table">
        <thead>
          <tr>
            <th>Size</th>
            <th>Chest (in)</th>
            <th>Length (in)</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["XS", "31–34", "27"],
            ["S", "34–37", "28"],
            ["M", "38–41", "29"],
            ["L", "42–45", "30"],
            ["XL", "46–49", "31"],
            ["2XL", "50–53", "32"],
            ["3XL", "54–57", "33"],
          ].map(([s, c, l]) => (
            <tr key={s}>
              <td>{s}</td>
              <td>{c}</td>
              <td>{l}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Wash cold, inside out. Tumble dry low or hang. Do not iron the print; the parks are sensitive to heat.</p>

      <h2 id="shipping">Shipping &amp; returns</h2>
      <p>
        Shirts are printed to order by Prodigi in the lab nearest to you (US, UK, EU, and Australia), usually within 2–5 business days, then shipped. Live rates
        for standard and express shipping are quoted at checkout for 35 countries. Duties and taxes outside the US may be collected by the carrier.
      </p>
      <p>
        Because every shirt is made for you, we can&apos;t take back a shirt for a change of heart, but if it arrives damaged or misprinted send us a photo within 30
        days and we will reprint it free.
      </p>
    </div>
  );
}
