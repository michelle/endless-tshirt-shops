export type DesignInput = { name: string; date: string; place: string };

function hashSeed(value: string) {
  let seed = 2166136261;
  for (let i = 0; i < value.length; i++) seed = Math.imul(seed ^ value.charCodeAt(i), 16777619);
  return seed >>> 0;
}

export function makeStars(input: DesignInput) {
  let seed = hashSeed(`${input.name}|${input.date}|${input.place}`);
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: 54 }, (_, i) => ({
    x: 90 + random() * 280,
    y: 82 + random() * 315,
    r: i < 8 ? 1.9 + random() * 1.4 : 0.55 + random() * 1.15,
    glow: i < 8,
  }));
}

export function cleanDesign(input: DesignInput): DesignInput {
  return {
    name: input.name.trim().replace(/[<>]/g, "").slice(0, 24) || "Your name",
    date: /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : "2026-10-04",
    place: input.place.trim().replace(/[<>]/g, "").slice(0, 32) || "Somewhere special",
  };
}

export function drawPrintArtwork(canvas: HTMLCanvasElement, raw: DesignInput) {
  const { name, date, place } = cleanDesign(raw);
  const width = 4680;
  const height = 5790;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  const scale = width / 468;
  ctx.scale(scale, scale);
  ctx.translate(0, 104);
  const ink = "#183f4b";
  const gold = "#c88753";
  const stars = makeStars({ name, date, place });
  const points = stars.slice(0, 8);
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = "rgba(24,63,75,.26)";
  [[0, 3, 1, 2, 5], [6, 4, 7], [1, 7, 3]].forEach((path) => {
    ctx.beginPath();
    path.forEach((index, i) => {
      const point = points[index];
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  });
  stars.forEach((star, i) => {
    ctx.beginPath();
    ctx.fillStyle = i % 7 === 0 ? gold : ink;
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
    if (star.glow) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(200,135,83,.45)";
      ctx.lineWidth = 0.55;
      ctx.moveTo(star.x - 4, star.y);
      ctx.lineTo(star.x + 4, star.y);
      ctx.moveTo(star.x, star.y - 4);
      ctx.lineTo(star.x, star.y + 4);
      ctx.stroke();
    }
  });
  ctx.strokeStyle = "rgba(24,63,75,.20)";
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.arc(230, 240, 143, 0.45, Math.PI * 1.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(230, 240, 154, Math.PI * 1.53, Math.PI * 2.44);
  ctx.stroke();
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(230, 84, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = gold;
  ctx.font = "600 7px Arial, sans-serif";
  ctx.letterSpacing = "2.4px";
  ctx.fillText("A SKY OF YOUR OWN", 230, 38);
  ctx.fillStyle = ink;
  ctx.font = "500 24px Georgia, serif";
  ctx.letterSpacing = "0px";
  let displayName = name;
  while (ctx.measureText(displayName).width > 300 && displayName.length > 3) displayName = `${displayName.slice(0, -2)}…`;
  ctx.fillText(displayName, 230, 462);
  ctx.fillStyle = gold;
  ctx.font = "600 8px Arial, sans-serif";
  ctx.letterSpacing = "1.9px";
  ctx.fillText(new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase(), 230, 485);
  ctx.fillStyle = ink;
  ctx.font = "500 7px Arial, sans-serif";
  ctx.letterSpacing = "1.4px";
  ctx.fillText(place.toUpperCase(), 230, 504);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(198, 524);
  ctx.lineTo(262, 524);
  ctx.stroke();
  return canvas;
}

export function makeArtSvg(raw: DesignInput) {
  const { name, date, place } = cleanDesign(raw);
  const stars = makeStars({ name, date, place });
  const dots = stars.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${i % 7 === 0 ? "#c88753" : "#183f4b"}"/>`).join("");
  const points = stars.slice(0, 8);
  const paths = [[0,3,1,2,5],[6,4,7],[1,7,3]].map((path) => `<polyline points="${path.map(i => `${points[i].x},${points[i].y}`).join(" ")}"/>`).join("");
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="4680" height="5790" viewBox="0 0 468 579"><g transform="translate(0 104)" text-anchor="middle"><g fill="none" stroke="#183f4b" stroke-opacity=".26" stroke-width=".6">${paths}<path d="M 91 303 A 143 143 0 1 1 315 111" stroke-opacity=".2" stroke-width=".45"/><path d="M 253 88 A 154 154 0 1 1 90 244" stroke-opacity=".2" stroke-width=".45"/></g>${dots}<circle cx="230" cy="84" r="4" fill="#c88753"/><text x="230" y="38" fill="#c88753" font-family="Arial,sans-serif" font-size="7" font-weight="600" letter-spacing="2.4">A SKY OF YOUR OWN</text><text x="230" y="462" fill="#183f4b" font-family="Georgia,serif" font-size="24">${escapeXml(name)}</text><text x="230" y="485" fill="#c88753" font-family="Arial,sans-serif" font-size="8" font-weight="600" letter-spacing="1.9">${dateLabel}</text><text x="230" y="504" fill="#183f4b" font-family="Arial,sans-serif" font-size="7" letter-spacing="1.4">${escapeXml(place.toUpperCase())}</text><path d="M198 524h64" stroke="#c88753" stroke-width=".7"/></g></svg>`;
}

function escapeXml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
