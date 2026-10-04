type Details = { place: string; date: string; note: string };
const safe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
export function makeArtwork({ place, date, note }: Details) {
  const seedText = `${place}|${date}|${note}`;
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) seed = Math.imul(seed ^ seedText.charCodeAt(i), 16777619) >>> 0;
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const rings = Array.from({ length: 13 }, (_, i) => {
    const base = 75 + i * 17, phase = rand() * Math.PI * 2;
    const points = Array.from({ length: 121 }, (_, j) => {
      const a = (j / 120) * Math.PI * 2;
      const wobble = Math.sin(a * 3 + phase) * (8 + i * .5) + Math.cos(a * 5 - phase) * 5 + Math.sin(a * 7 + phase * .4) * 3;
      const r = base + wobble;
      return `${j ? "L" : "M"}${(450 + Math.cos(a) * r).toFixed(1)} ${(415 + Math.sin(a) * r * .91).toFixed(1)}`;
    }).join(" ") + " Z";
    return `<path d="${points}" fill="none" stroke="#e6e0c9" stroke-opacity="${(.22 + i * .027).toFixed(2)}" stroke-width="${i === 12 ? 2.5 : 1.8}"/>`;
  }).join("");
  const stars = Array.from({ length: 24 }, () => {
    const x = 140 + rand() * 620, y = 120 + rand() * 620, r = .8 + rand() * 1.8;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#d9a275" opacity=".8"/>`;
  }).join("");
  const dateLabel = date ? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).toUpperCase() : "YOUR DAY";
  const placeLabel = place.trim().toUpperCase() || "YOUR PLACE", noteLabel = note.trim() || "Your words here";
  const placeSize = placeLabel.length > 22 ? 43 : placeLabel.length > 16 ? 52 : 63, noteSize = noteLabel.length > 30 ? 26 : 31;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1100" width="900" height="1100"><g>${stars}${rings}<circle cx="450" cy="415" r="13" fill="#d9a275"/><circle cx="450" cy="415" r="23" fill="none" stroke="#d9a275" stroke-width="2" opacity=".8"/></g><g text-anchor="middle"><text x="450" y="95" fill="#e6e0c9" font-family="Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="7">ELSEWHERE, ALWAYS</text><path d="M330 115H570" stroke="#d9a275" stroke-width="2"/><text x="450" y="778" fill="#e6e0c9" font-family="Arial,sans-serif" font-size="${placeSize}" font-weight="700" letter-spacing="2">${safe(placeLabel)}</text><text x="450" y="831" fill="#d9a275" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="5">${safe(dateLabel)}</text><path d="M370 860H530" stroke="#d9a275" stroke-width="2"/><text x="450" y="915" fill="#e6e0c9" font-family="Georgia,serif" font-style="italic" font-size="${noteSize}">${safe(noteLabel)}</text><text x="450" y="1000" fill="#e6e0c9" font-family="Arial,sans-serif" font-size="14" letter-spacing="5" opacity=".8">A PLACE TO KEEP CLOSE</text></g></svg>`;
}
