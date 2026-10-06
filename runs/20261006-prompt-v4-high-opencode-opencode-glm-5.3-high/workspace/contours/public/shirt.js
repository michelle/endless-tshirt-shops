// A flat, tasteful t-shirt mockup: silhouette + seams + the design on the chest.

// viewBox 0 0 1000 1100
export function shirtSVG({ shirtHex, designSVG, width = 1000, showSeams = true }) {
  const body =
    'M 430 118 C 460 96 540 96 570 118 C 700 132 800 150 830 210 L 950 330 L 850 430 ' +
    'L 760 380 C 740 500 745 700 760 980 L 240 980 C 255 700 260 500 240 380 L 150 430 ' +
    'L 50 330 L 170 210 C 200 150 300 132 430 118 Z';

  let designG = '';
  if (designSVG) {
    const inner = designSVG.replace(
      /<svg[^>]*>/,
      '<svg viewBox="0 0 1000 1235.26" x="298" y="300" width="404" height="500" preserveAspectRatio="xMidYMid meet">'
    );
    designG = inner;
  }

  const seams = showSeams
    ? `
  <g stroke="rgba(0,0,0,0.16)" fill="none" stroke-width="4">
    <path d="M 240 380 C 260 500 255 700 240 980"/>
    <path d="M 760 380 C 740 500 745 700 760 980"/>
    <path d="M 170 210 C 285 160 290 158 295 150"/>
    <path d="M 830 210 C 715 160 710 158 705 150"/>
    <path d="M 150 430 L 240 380"/>
    <path d="M 850 430 L 760 380"/>
  </g>
  <g stroke="rgba(0,0,0,0.10)" fill="none" stroke-width="4">
    <path d="M 418 132 C 452 118 548 118 582 132"/>
    <path d="M 404 172 C 452 150 548 150 596 172"/>
  </g>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${(width * 1100) / 1000}" viewBox="0 0 1000 1100">
  <ellipse cx="500" cy="121" rx="150" ry="34" fill="rgba(0,0,0,0.10)"/>
  <path d="${body}" fill="${shirtHex}" stroke="rgba(0,0,0,0.24)" stroke-width="5"/>
  <path d="M 430 118 C 462 78 538 78 570 118 C 540 132 460 132 430 118 Z" fill="rgba(0,0,0,0.10)" stroke="rgba(0,0,0,0.20)" stroke-width="4"/>
  ${designG}
  ${seams}
</svg>`;
}
