import { NextRequest } from "next/server";

export const runtime = "nodejs";

const clean = (value: string | null, fallback: string, max: number) => (value || fallback).replace(/[<>&"']/g, "").trim().slice(0, max) || fallback;
const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const split = (value: string, words: number) => {
  const parts = value.split(/\s+/); const result: string[] = [];
  while (parts.length) result.push(parts.splice(0, words).join(" "));
  return result.slice(0, 2);
};

export function GET(request: NextRequest) {
  const name = clean(request.nextUrl.searchParams.get("name"), "A LOCAL LEGEND", 26).toUpperCase();
  const place = clean(request.nextUrl.searchParams.get("place"), "UNKNOWN TERRITORY", 30).toUpperCase();
  const ritual = clean(request.nextUrl.searchParams.get("ritual"), "MADE A SMALL RITUAL", 46).toUpperCase();
  const year = clean(request.nextUrl.searchParams.get("year"), "2047", 4).replace(/\D/g, "") || "2047";
  const ritualLines = split(ritual, 4);
  const ritualSvg = ritualLines.map((line, i) => `<text x="2100" y="${2770 + i * 180}" text-anchor="middle" class="body">${esc(line)}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4200" height="5370" viewBox="0 0 4200 5370"><style>.mono{font-family:monospace;font-weight:700;letter-spacing:18px}.title{font-family:Georgia,serif;font-weight:700;letter-spacing:-12px}.body{font-family:Arial,sans-serif;font-weight:700;letter-spacing:8px}</style><rect width="4200" height="5370" fill="none"/><g fill="#f4e7ca"><path d="M2100 530c75 190 165 280 355 355-190 75-280 165-355 355-75-190-165-280-355-355 190-75 280-165 355-355z"/><circle cx="2100" cy="1885" r="1185" fill="none" stroke="#f4e7ca" stroke-width="34"/><circle cx="2100" cy="1885" r="1035" fill="none" stroke="#ef6947" stroke-width="16"/><text x="2100" y="1390" text-anchor="middle" class="mono" font-size="105">FUTURE FOSSIL CLUB</text><text x="2100" y="1660" text-anchor="middle" class="title" font-size="330">${esc(name)}</text><line x1="1230" y1="1785" x2="2970" y2="1785" stroke="#f4e7ca" stroke-width="20"/><text x="2100" y="1955" text-anchor="middle" class="mono" font-size="94">FOUND IN ${esc(place)}</text><path d="M1500 2175h1200" stroke="#ef6947" stroke-width="18"/>${ritualSvg}<text x="2100" y="3250" text-anchor="middle" class="mono" font-size="90">CATALOGUED ${esc(year)} · OBJECT 01</text><circle cx="2100" cy="3540" r="170" fill="none" stroke="#f4e7ca" stroke-width="24"/><path d="M2010 3540h180M2100 3450v180" stroke="#ef6947" stroke-width="24"/><text x="2100" y="3900" text-anchor="middle" class="mono" font-size="78">REMEMBERED FOR THE SMALL THINGS</text></g></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
}
