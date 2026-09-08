const colors = {
  coral: [1, 0.447, 0.369],
  lime: [0.78, 0.957, 0.392],
  lilac: [0.725, 0.655, 1],
  sky: [0.557, 0.859, 1],
};

function pdfText(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function ellipse(cx, cy, rx, ry, angle = 0) {
  const k = 0.5522848;
  const a = angle * Math.PI / 180;
  const point = (x, y) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  const p0 = point(rx, 0); const p1 = point(0, ry); const p2 = point(-rx, 0); const p3 = point(0, -ry);
  const c01 = point(rx, k * ry); const c11 = point(k * rx, ry);
  const c12 = point(-k * rx, ry); const c22 = point(-rx, k * ry);
  const c23 = point(-rx, -k * ry); const c33 = point(-k * rx, -ry);
  const c30 = point(k * rx, -ry); const c00 = point(rx, -k * ry);
  const f = (pair) => pair.map((n) => n.toFixed(2)).join(' ');
  return `${f(p0)} m ${f(c01)} ${f(c11)} ${f(p1)} c ${f(c12)} ${f(c22)} ${f(p2)} c ${f(c23)} ${f(c33)} ${f(p3)} c ${f(c30)} ${f(c00)} ${f(p0)} c S`;
}

function makePdf(phrase, style, ink) {
  const [r, g, b] = colors[ink] || colors.coral;
  const words = phrase.split(/\s+/).filter(Boolean);
  const first = words[0] || 'KEEP';
  const rest = words.slice(1).join(' ');
  const commands = [`${r} ${g} ${b} RG`, '3 w', ellipse(600, 790, 475, 160, -17), ellipse(600, 790, 385, 285, 31), ellipse(600, 790, 250, 480, 63), 'S'];
  if (style === 'PULSE') commands.push('5 w 205 590 m 350 590 l 390 485 l 448 670 l 499 544 l 534 590 l 695 590 l S');
  if (style === 'ECHO') {
    commands.push('0.25 0.25 0.25 RG');
    commands.push(`BT /F1 82 Tf 2 Tr 1 0 0 1 240 730 Tm (${pdfText(phrase)}) Tj ET`);
    commands.push(`${r} ${g} ${b} RG`);
  }
  commands.push(`BT /F1 25 Tf 1 0 0 1 390 1160 Tm (SIGNAL BLOOM / ${pdfText(style)}) Tj ET`);
  commands.push(`BT /F1 84 Tf 0.92 0 0 1 420 820 Tm (${pdfText(first)}) Tj ET`);
  if (rest) commands.push(`BT /F1 84 Tf 0.92 0 0 1 420 715 Tm (${pdfText(rest)}) Tj ET`);
  commands.push('3 w 535 545 m 665 545 l S');
  commands.push(`BT /F1 22 Tf 1 0 0 1 430 480 Tm (ONE OF ONE / ${String((phrase.length * 131 + style.length * 17) % 1000).padStart(3, '0')}) Tj ET`);
  commands.push('0.85 0.85 0.85 rg 600 1260 9 9 re f 0.85 0.85 0.85 rg 830 360 6 6 re f');
  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1200 1500] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n%âãÏÓ\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf, 'binary'); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

export default function handler(req, res) {
  const phrase = String(req.query?.phrase || 'KEEP GOING').replace(/[<>]/g, '').slice(0, 24).toUpperCase();
  const style = ['ORBIT', 'PULSE', 'ECHO'].includes(String(req.query?.style).toUpperCase()) ? String(req.query.style).toUpperCase() : 'ORBIT';
  const ink = Object.prototype.hasOwnProperty.call(colors, String(req.query?.ink).toLowerCase()) ? String(req.query.ink).toLowerCase() : 'coral';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="signal-bloom-artwork.pdf"');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.status(200).send(makePdf(phrase, style, ink));
}
