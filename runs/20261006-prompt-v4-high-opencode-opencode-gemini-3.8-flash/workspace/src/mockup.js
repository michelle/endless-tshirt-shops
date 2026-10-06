import { createCanvas, Image } from '@napi-rs/canvas';
import { renderDesign } from './render.js';
import { CATALOG } from './catalog.js';

export function renderMockup(design, options = {}) {
  const width = options.width || 800;
  const height = options.height || 960;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background Studio Backdrop
  ctx.fillStyle = '#0B0F19';
  ctx.fillRect(0, 0, width, height);

  // Subtle studio spotlight glow
  const spotGrad = ctx.createRadialGradient(width / 2, height * 0.42, 50, width / 2, height * 0.42, 450);
  spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spotGrad;
  ctx.fillRect(0, 0, width, height);

  // Garment base color
  const garmentColorHex = CATALOG.colors[design.garment]?.hex || '#111827';
  const isWhite = design.garment === 'white';

  // Draw T-Shirt Silhouette
  ctx.save();
  ctx.translate(width / 2, height * 0.08);
  const s = width / 120; // scale factor
  ctx.scale(s, s);
  ctx.translate(-50, -5);

  // Shirt body path
  ctx.beginPath();
  // Standard Bella Canvas 3001 t-shirt vector path
  ctx.moveTo(35, 8);
  ctx.bezierCurveTo(42, 16, 58, 16, 65, 8);
  ctx.lineTo(84, 15);
  ctx.bezierCurveTo(92, 19, 97, 28, 98, 38);
  ctx.lineTo(84, 43);
  ctx.lineTo(79, 36);
  ctx.lineTo(79, 92);
  ctx.bezierCurveTo(79, 96, 75, 98, 70, 98);
  ctx.lineTo(30, 98);
  ctx.bezierCurveTo(25, 98, 21, 96, 21, 92);
  ctx.lineTo(21, 36);
  ctx.lineTo(16, 43);
  ctx.lineTo(2, 38);
  ctx.bezierCurveTo(3, 28, 8, 19, 16, 15);
  ctx.closePath();

  // Garment fill
  ctx.fillStyle = garmentColorHex;
  ctx.fill();

  // Subtle fabric shadow / depth
  ctx.strokeStyle = isWhite ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Collar line
  ctx.beginPath();
  ctx.arc(50, 6, 15, 0.3 * Math.PI, 0.7 * Math.PI);
  ctx.strokeStyle = isWhite ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.restore();

  // Render the design on chest print area
  const designWidth = width * 0.46;
  const designHeight = designWidth * (5790 / 4680);
  const designBuffer = renderDesign(design, { width: Math.round(designWidth) });

  const img = new Image();
  img.src = designBuffer;

  const printX = (width - designWidth) / 2;
  const printY = height * 0.24;

  ctx.drawImage(img, printX, printY, designWidth, designHeight);

  return canvas.toBuffer('image/png');
}
