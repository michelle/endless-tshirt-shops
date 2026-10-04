import { DesignParams } from './types';
import { computeVisibleSky, getMoonPhase } from './astronomy';

export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const latAbs = Math.abs(lat);
  const lngAbs = Math.abs(lng);

  const latDeg = Math.floor(latAbs);
  const latMin = Math.floor((latAbs - latDeg) * 60);
  const latSec = Math.round(((latAbs - latDeg) * 60 - latMin) * 60);

  const lngDeg = Math.floor(lngAbs);
  const lngMin = Math.floor((lngAbs - lngDeg) * 60);
  const lngSec = Math.round(((lngAbs - lngDeg) * 60 - lngMin) * 60);

  return `${latDeg}°${latMin.toString().padStart(2, '0')}'${latSec.toString().padStart(2, '0')}"${latDir}   ${lngDeg}°${lngMin.toString().padStart(2, '0')}'${lngSec.toString().padStart(2, '0')}"${lngDir}`;
}

export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return date.toLocaleDateString('en-US', options).toUpperCase();
}

export function formatTimeDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes} UTC`;
}

interface Palette {
  ringPrimary: string;
  ringSecondary: string;
  ringAccent: string;
  starBright: string;
  starNormal: string;
  starGlow: string;
  constellationLine: string;
  textTitle: string;
  textDate: string;
  textCoords: string;
  textDedication: string;
  textTechnical: string;
  gridLine: string;
  discFill: string;
}

export function getPalette(color: string, style: string): Palette {
  const isLightGarment = color === 'white' || color === 'natural';

  if (isLightGarment) {
    if (style === 'copper') {
      return {
        ringPrimary: '#9a3412',
        ringSecondary: '#c2410c',
        ringAccent: '#ea580c',
        starBright: '#7c2d12',
        starNormal: '#9a3412',
        starGlow: '#fed7aa',
        constellationLine: 'rgba(154, 52, 18, 0.45)',
        textTitle: '#431407',
        textDate: '#7c2d12',
        textCoords: '#9a3412',
        textDedication: '#431407',
        textTechnical: '#9a3412',
        gridLine: 'rgba(154, 52, 18, 0.25)',
        discFill: 'rgba(254, 243, 199, 0.25)'
      };
    }
    // Default light garment palette: Crisp Obsidian / Deep Celestial Navy
    return {
      ringPrimary: '#0f172a',
      ringSecondary: '#334155',
      ringAccent: '#b45309',
      starBright: '#090d16',
      starNormal: '#1e293b',
      starGlow: '#94a3b8',
      constellationLine: 'rgba(15, 23, 42, 0.45)',
      textTitle: '#0f172a',
      textDate: '#1e293b',
      textCoords: '#334155',
      textDedication: '#0f172a',
      textTechnical: '#64748b',
      gridLine: 'rgba(15, 23, 42, 0.2)',
      discFill: 'rgba(241, 245, 249, 0.35)'
    };
  }

  // Dark Garments (Black, Navy Blue)
  if (style === 'silver' || style === 'minimal') {
    return {
      ringPrimary: '#f8fafc',
      ringSecondary: '#94a3b8',
      ringAccent: '#cbd5e1',
      starBright: '#ffffff',
      starNormal: '#e2e8f0',
      starGlow: '#93c5fd',
      constellationLine: 'rgba(226, 232, 240, 0.45)',
      textTitle: '#ffffff',
      textDate: '#f8fafc',
      textCoords: '#cbd5e1',
      textDedication: '#f1f5f9',
      textTechnical: '#94a3b8',
      gridLine: 'rgba(148, 163, 184, 0.25)',
      discFill: 'rgba(15, 23, 42, 0.4)'
    };
  }

  // Default: Celestial Gold (luxurious warm gold + starlight white)
  return {
    ringPrimary: '#e5c158',
    ringSecondary: '#d4af37',
    ringAccent: '#fef08a',
    starBright: '#ffffff',
    starNormal: '#fde68a',
    starGlow: '#e5c158',
    constellationLine: 'rgba(229, 193, 88, 0.45)',
    textTitle: '#ffffff',
    textDate: '#fef08a',
    textCoords: '#e5c158',
    textDedication: '#f8fafc',
    textTechnical: '#ca8a04',
    gridLine: 'rgba(229, 193, 88, 0.25)',
    discFill: 'rgba(12, 16, 26, 0.45)'
  };
}

export function generateCelestialSvg(
  params: DesignParams,
  options: {
    width?: number;
    height?: number;
    isPrintReady?: boolean;
  } = {}
): string {
  // Standard Prodigi BC-3001 print area: 4677 x 5881 px
  const width = options.width || (options.isPrintReady ? 4677 : 2000);
  const height = options.height || (options.isPrintReady ? 5881 : 2515);

  const scale = width / 4677;
  const centerX = width / 2;
  const centerY = 2300 * scale;
  const domeRadius = 1500 * scale;

  const date = new Date(params.date || '2024-10-04T21:30:00Z');
  const palette = getPalette(params.color, params.style);

  const { visibleStars, visibleLines } = computeVisibleSky(
    date,
    params.lat,
    params.lng,
    domeRadius
  );

  const moon = getMoonPhase(date);

  // Build degree ticks on outer ring (360 degrees)
  let ticksSvg = '';
  if (params.showGrid) {
    const outerRingR = domeRadius + 45 * scale;
    for (let deg = 0; deg < 360; deg += 5) {
      const isMajor = deg % 30 === 0;
      const isMid = deg % 10 === 0;
      const tickLen = (isMajor ? 28 : isMid ? 18 : 10) * scale;
      const strokeW = (isMajor ? 3.5 : isMid ? 2.5 : 1.5) * scale;
      const rad = (deg * Math.PI) / 180;
      const x1 = centerX + outerRingR * Math.sin(rad);
      const y1 = centerY - outerRingR * Math.cos(rad);
      const x2 = centerX + (outerRingR - tickLen) * Math.sin(rad);
      const y2 = centerY - (outerRingR - tickLen) * Math.cos(rad);
      ticksSvg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${palette.ringSecondary}" stroke-width="${strokeW.toFixed(1)}" opacity="${isMajor ? 0.9 : 0.6}" />`;
    }
  }

  // Constellation lines
  let linesSvg = '';
  if (params.showConstellations) {
    for (const l of visibleLines) {
      const x1 = centerX + l.x1 * scale;
      const y1 = centerY + l.y1 * scale;
      const x2 = centerX + l.x2 * scale;
      const y2 = centerY + l.y2 * scale;
      linesSvg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${palette.constellationLine}" stroke-width="${(2.5 * scale).toFixed(1)}" stroke-linecap="round" />`;
    }
  }

  // Stars
  let starsSvg = '';
  for (const s of visibleStars) {
    const sx = centerX + s.x * scale;
    const sy = centerY + s.y * scale;
    const sr = s.radius * scale;
    const isVeryBright = s.mag < 1.2;

    if (isVeryBright) {
      // Glow sparkle + cross spikes for top bright stars
      starsSvg += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(sr * 2.8).toFixed(1)}" fill="${palette.starGlow}" opacity="0.3" filter="url(#starGlow)" />`;
      starsSvg += `<line x1="${(sx - sr * 3).toFixed(1)}" y1="${sy.toFixed(1)}" x2="${(sx + sr * 3).toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${palette.starBright}" stroke-width="${(1.2 * scale).toFixed(1)}" opacity="0.8" />`;
      starsSvg += `<line x1="${sx.toFixed(1)}" y1="${(sy - sr * 3).toFixed(1)}" x2="${sx.toFixed(1)}" y2="${(sy + sr * 3).toFixed(1)}" stroke="${palette.starBright}" stroke-width="${(1.2 * scale).toFixed(1)}" opacity="0.8" />`;
    }

    starsSvg += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr.toFixed(1)}" fill="${isVeryBright ? palette.starBright : palette.starNormal}" opacity="${s.opacity.toFixed(2)}" />`;
  }

  // Celestial cardinal directions
  const nY = centerY - domeRadius - 65 * scale;
  const sY = centerY + domeRadius + 85 * scale;
  const eX = centerX + domeRadius + 75 * scale;
  const wX = centerX - domeRadius - 75 * scale;

  // Formatted labels
  const titleText = (params.title || 'THE NIGHT WE MET').toUpperCase();
  const dateText = formatDateDisplay(params.date);
  const timeText = formatTimeDisplay(params.date);
  const coordsText = formatCoordinates(params.lat, params.lng);
  const cityText = (params.city || 'PARIS, FRANCE').toUpperCase();
  const dedicationText = params.dedication || 'Under a thousand burning stars, written forever in the celestial sphere.';

  // Typography positions scaled for the 4677 x 5881 canvas
  const titleY = 4280 * scale;
  const dateY = 4550 * scale;
  const coordsY = 4780 * scale;
  const moonY = 4990 * scale;
  const dedicationY = 5250 * scale;
  const hallmarkY = 5580 * scale;

  // Escaping helper for XML
  const escapeXml = (str: string) =>
    str.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${(6 * scale).toFixed(1)}" />
    </filter>
    <clipPath id="domeClip">
      <circle cx="${centerX}" cy="${centerY}" r="${domeRadius}" />
    </clipPath>
  </defs>

  <!-- Celestial Dome Background (Subtle celestial disc) -->
  <circle cx="${centerX}" cy="${centerY}" r="${domeRadius}" fill="${palette.discFill}" />

  <!-- Stars and Constellations clipped to celestial sphere -->
  <g clip-path="url(#domeClip)">
    <!-- Subtle Horizon Line / Cardinal grid -->
    ${
      params.showGrid
        ? `
      <line x1="${centerX - domeRadius}" y1="${centerY}" x2="${centerX + domeRadius}" y2="${centerY}" stroke="${palette.gridLine}" stroke-width="${(1.5 * scale).toFixed(1)}" stroke-dasharray="${(8 * scale).toFixed(1)} ${(16 * scale).toFixed(1)}" />
      <line x1="${centerX}" y1="${centerY - domeRadius}" x2="${centerX}" y2="${centerY + domeRadius}" stroke="${palette.gridLine}" stroke-width="${(1.5 * scale).toFixed(1)}" stroke-dasharray="${(8 * scale).toFixed(1)} ${(16 * scale).toFixed(1)}" />
      <circle cx="${centerX}" cy="${centerY}" r="${(domeRadius * 0.66).toFixed(1)}" fill="none" stroke="${palette.gridLine}" stroke-width="${(1.5 * scale).toFixed(1)}" stroke-dasharray="${(6 * scale).toFixed(1)} ${(18 * scale).toFixed(1)}" />
      <circle cx="${centerX}" cy="${centerY}" r="${(domeRadius * 0.33).toFixed(1)}" fill="none" stroke="${palette.gridLine}" stroke-width="${(1.5 * scale).toFixed(1)}" stroke-dasharray="${(6 * scale).toFixed(1)} ${(18 * scale).toFixed(1)}" />
    `
        : ''
    }

    <!-- Constellation Lines -->
    ${linesSvg}

    <!-- Stars -->
    ${starsSvg}
  </g>

  <!-- Celestial Horizon Ring -->
  <circle cx="${centerX}" cy="${centerY}" r="${domeRadius}" fill="none" stroke="${palette.ringPrimary}" stroke-width="${(5 * scale).toFixed(1)}" />
  
  <!-- Outer Orbit Frame Rings -->
  <circle cx="${centerX}" cy="${centerY}" r="${(domeRadius + 20 * scale).toFixed(1)}" fill="none" stroke="${palette.ringSecondary}" stroke-width="${(2 * scale).toFixed(1)}" opacity="0.7" />
  <circle cx="${centerX}" cy="${centerY}" r="${(domeRadius + 45 * scale).toFixed(1)}" fill="none" stroke="${palette.ringPrimary}" stroke-width="${(3.5 * scale).toFixed(1)}" />
  <circle cx="${centerX}" cy="${centerY}" r="${(domeRadius + 65 * scale).toFixed(1)}" fill="none" stroke="${palette.ringSecondary}" stroke-width="${(1.5 * scale).toFixed(1)}" stroke-dasharray="${(10 * scale).toFixed(1)} ${(15 * scale).toFixed(1)}" opacity="0.5" />

  <!-- Degree Ticks -->
  ${ticksSvg}

  <!-- Cardinal Markers -->
  ${
    params.showCoordinates
      ? `
    <text x="${centerX}" y="${nY.toFixed(1)}" font-family="'Cinzel', 'Trajan Pro', 'Didot', 'Georgia', serif" font-size="${(48 * scale).toFixed(1)}" font-weight="600" fill="${palette.ringPrimary}" text-anchor="middle" letter-spacing="${(4 * scale).toFixed(1)}">N</text>
    <text x="${centerX}" y="${sY.toFixed(1)}" font-family="'Cinzel', 'Trajan Pro', 'Didot', 'Georgia', serif" font-size="${(48 * scale).toFixed(1)}" font-weight="600" fill="${palette.ringPrimary}" text-anchor="middle" letter-spacing="${(4 * scale).toFixed(1)}">S</text>
    <text x="${eX.toFixed(1)}" y="${(centerY + 16 * scale).toFixed(1)}" font-family="'Cinzel', 'Trajan Pro', 'Didot', 'Georgia', serif" font-size="${(48 * scale).toFixed(1)}" font-weight="600" fill="${palette.ringPrimary}" text-anchor="middle">E</text>
    <text x="${wX.toFixed(1)}" y="${(centerY + 16 * scale).toFixed(1)}" font-family="'Cinzel', 'Trajan Pro', 'Didot', 'Georgia', serif" font-size="${(48 * scale).toFixed(1)}" font-weight="600" fill="${palette.ringPrimary}" text-anchor="middle">W</text>
  `
      : ''
  }

  <!-- ================= TYPOGRAPHY BLOCK ================= -->
  <!-- Milestone Title -->
  <text x="${centerX}" y="${titleY.toFixed(1)}" 
    font-family="'Cinzel', 'Cormorant Garamond', 'Didot', 'Playfair Display', 'Georgia', serif" 
    font-size="${(175 * scale).toFixed(1)}" 
    font-weight="700" 
    letter-spacing="${(16 * scale).toFixed(1)}" 
    fill="${palette.textTitle}" 
    text-anchor="middle">${escapeXml(titleText)}</text>

  <!-- Date & Exact Moment -->
  <text x="${centerX}" y="${dateY.toFixed(1)}" 
    font-family="'Cinzel', 'Cormorant Garamond', 'Georgia', serif" 
    font-size="${(88 * scale).toFixed(1)}" 
    font-weight="500" 
    letter-spacing="${(10 * scale).toFixed(1)}" 
    fill="${palette.textDate}" 
    text-anchor="middle">${escapeXml(dateText)}  •  ${escapeXml(timeText)}</text>

  <!-- Geographic Coordinates & City -->
  <text x="${centerX}" y="${coordsY.toFixed(1)}" 
    font-family="'Cinzel', 'Courier New', monospace, sans-serif" 
    font-size="${(72 * scale).toFixed(1)}" 
    font-weight="600" 
    letter-spacing="${(8 * scale).toFixed(1)}" 
    fill="${palette.textCoords}" 
    text-anchor="middle">${escapeXml(coordsText)}  •  ${escapeXml(cityText)}</text>

  <!-- Moon Phase & Visible Stellar Counts -->
  ${
    params.showMoon
      ? `
    <g transform="translate(${centerX}, ${moonY.toFixed(1)})">
      <!-- Decorative Lunar Icon & Phase -->
      <text x="0" y="0" 
        font-family="'Cinzel', 'Cormorant Garamond', 'Georgia', serif" 
        font-size="${(58 * scale).toFixed(1)}" 
        font-weight="500" 
        letter-spacing="${(7 * scale).toFixed(1)}" 
        fill="${palette.textTechnical}" 
        text-anchor="middle">LUNAR PHASE: ${escapeXml(moon.phaseName.toUpperCase())} (${moon.illumination}% ILLUMINATION)  •  ${visibleStars.length} STARS VISIBLE</text>
    </g>
  `
      : ''
  }

  <!-- Divider Rule -->
  <line x1="${(centerX - 600 * scale).toFixed(1)}" y1="${(dedicationY - 110 * scale).toFixed(1)}" 
        x2="${(centerX + 600 * scale).toFixed(1)}" y2="${(dedicationY - 110 * scale).toFixed(1)}" 
        stroke="${palette.ringSecondary}" stroke-width="${(1.5 * scale).toFixed(1)}" opacity="0.6" />
  <circle cx="${centerX}" cy="${(dedicationY - 110 * scale).toFixed(1)}" r="${(6 * scale).toFixed(1)}" fill="${palette.ringPrimary}" />

  <!-- Personal Dedication Message -->
  ${
    dedicationText
      ? `
    <text x="${centerX}" y="${dedicationY.toFixed(1)}" 
      font-family="'Cormorant Garamond', 'Baskerville', 'Georgia', serif" 
      font-style="italic" 
      font-size="${(92 * scale).toFixed(1)}" 
      letter-spacing="${(2 * scale).toFixed(1)}" 
      fill="${palette.textDedication}" 
      text-anchor="middle">${escapeXml(dedicationText)}</text>
  `
      : ''
  }

  <!-- Technical Archival Hallmark -->
  <text x="${centerX}" y="${hallmarkY.toFixed(1)}" 
    font-family="'Cinzel', 'Courier New', monospace, sans-serif" 
    font-size="${(42 * scale).toFixed(1)}" 
    font-weight="500" 
    letter-spacing="${(12 * scale).toFixed(1)}" 
    fill="${palette.textTechnical}" 
    opacity="0.75" 
    text-anchor="middle">AETHEL CELESTIAL  •  BESPOKE 4677×5881 DTG ARCHIVAL  •  1-OF-1 EDITION</text>
</svg>
`.trim();
}
