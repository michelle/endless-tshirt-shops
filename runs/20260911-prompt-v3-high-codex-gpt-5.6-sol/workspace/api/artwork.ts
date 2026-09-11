import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import PDFDocument from 'pdfkit';
import { openDesign } from './_lib/design.js';

function renderArtwork(design: ReturnType<typeof openDesign>) {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ size: [1200, 1500], margin: 0, compress: true, info: { Title: 'Orbitline custom garment artwork', Creator: 'Orbitline' } });
    const chunks: Buffer[] = [];
    document.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    const cream = '#f7e8b0';
    const coral = '#ff6048';
    const center: [number, number] = [600, 620];
    document.strokeColor(cream).fillColor(cream).lineCap('round').lineJoin('round');
    document.lineWidth(6).ellipse(center[0], center[1], 373, 463).stroke();
    document.save().rotate(38, { origin: center }).lineWidth(3).opacity(.75).ellipse(center[0], center[1], 253, 463).stroke().restore();
    document.save().rotate(-43, { origin: center }).lineWidth(3).opacity(.58).ellipse(center[0], center[1], 177, 463).stroke().restore();
    document.opacity(1).lineWidth(9).moveTo(217, 727).bezierCurveTo(393, 437, 830, 353, 1023, 633).stroke();
    document.lineWidth(3).opacity(.72).moveTo(263, 417).bezierCurveTo(457, 657, 753, 800, 1023, 670).stroke();
    document.opacity(1).fillColor(coral).circle(363, 457, 19).fill().circle(897, 777, 19).fill();

    const seed = createHash('sha256').update(`${design.firstName}${design.secondName}${design.place}${design.date}`).digest();
    document.fillColor(cream);
    for (let index = 0; index < 34; index += 1) {
      const x = 160 + ((seed[index % seed.length] * (index + 7) * 19) % 880);
      const y = 120 + ((seed[(index + 11) % seed.length] * (index + 3) * 23) % 860);
      document.opacity(index % 3 === 0 ? 1 : .58).circle(x, y, index % 6 === 0 ? 6.5 : 3).fill();
    }

    const [year, month, day] = design.date.split('-');
    const names = `${design.firstName.toUpperCase()} × ${design.secondName.toUpperCase()}`;
    document.opacity(1).fillColor(cream).font('Times-Roman').fontSize(78).text(names, 80, 1230, { width: 1040, align: 'center', characterSpacing: 2, lineBreak: false });
    document.font('Helvetica').fontSize(30).text(design.place.toUpperCase(), 100, 1340, { width: 1000, align: 'center', characterSpacing: 7, lineBreak: false });
    document.lineWidth(2).strokeColor(cream).moveTo(377, 1392).lineTo(823, 1392).stroke();
    document.fontSize(23).text(`${month}.${day}.${year} · ONE MOMENT / ONE ORBIT`, 100, 1430, { width: 1000, align: 'center', characterSpacing: 5, lineBreak: false });
    document.end();
  });
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') return response.status(405).send('Method not allowed.');
  if (!process.env.PRODIGI_API_KEY) return response.status(503).send('Artwork service unavailable.');
  try {
    const token = Array.isArray(request.query.token) ? request.query.token[0] : request.query.token;
    if (!token) return response.status(400).send('Missing artwork token.');
    const design = openDesign(token, process.env.PRODIGI_API_KEY);
    const pdf = await renderArtwork(design);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'inline; filename="orbitline-artwork.pdf"');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return response.status(200).send(pdf);
  } catch {
    return response.status(400).send('Invalid artwork request.');
  }
}
