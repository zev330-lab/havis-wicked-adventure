// Generate PWA icons as simple canvas-drawn PNGs
// Uses built-in Node canvas-like approach with SVG data URIs

const fs = require('fs');
const path = require('path');

function generateSVGIcon(size) {
  const s = size;
  const half = s / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a0033"/>
      <stop offset="100%" stop-color="#003322"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="40%">
      <stop offset="0%" stop-color="#00ff6644"/>
      <stop offset="100%" stop-color="#00ff6600"/>
    </radialGradient>
  </defs>
  <!-- Background -->
  <rect width="${s}" height="${s}" fill="url(#bg)" rx="${s * 0.15}"/>
  <rect width="${s}" height="${s}" fill="url(#glow)" rx="${s * 0.15}"/>

  <!-- Emerald city silhouette -->
  <g transform="translate(${half}, ${s * 0.55})" fill="#006633">
    <rect x="-${s * 0.03}" y="-${s * 0.28}" width="${s * 0.06}" height="${s * 0.28}"/>
    <circle cx="0" cy="-${s * 0.28}" r="${s * 0.04}"/>
    <polygon points="-${s * 0.015},-${s * 0.31} 0,-${s * 0.38} ${s * 0.015},-${s * 0.31}"/>
    <rect x="-${s * 0.13}" y="-${s * 0.18}" width="${s * 0.08}" height="${s * 0.18}"/>
    <rect x="${s * 0.05}" y="-${s * 0.18}" width="${s * 0.08}" height="${s * 0.18}"/>
    <rect x="-${s * 0.22}" y="-${s * 0.12}" width="${s * 0.06}" height="${s * 0.12}"/>
    <rect x="${s * 0.16}" y="-${s * 0.12}" width="${s * 0.06}" height="${s * 0.12}"/>
  </g>

  <!-- W letter -->
  <text x="${half}" y="${s * 0.42}" font-family="Georgia, serif" font-size="${s * 0.28}" font-weight="bold" fill="#33ff99" text-anchor="middle" dominant-baseline="central">W</text>

  <!-- Stars -->
  <polygon points="${s * 0.15},${s * 0.15} ${s * 0.16},${s * 0.12} ${s * 0.18},${s * 0.15} ${s * 0.165},${s * 0.17} ${s * 0.155},${s * 0.17}" fill="#ffd700"/>
  <polygon points="${s * 0.85},${s * 0.15} ${s * 0.86},${s * 0.12} ${s * 0.88},${s * 0.15} ${s * 0.865},${s * 0.17} ${s * 0.855},${s * 0.17}" fill="#ff69b4"/>

  <!-- Havi text at bottom -->
  <text x="${half}" y="${s * 0.82}" font-family="Georgia, serif" font-size="${s * 0.09}" fill="#ffd700" text-anchor="middle">HAVI</text>
</svg>`;
}

const sizes = [192, 512];
const publicDir = path.join(__dirname, '..', 'public');

for (const size of sizes) {
  const svg = generateSVGIcon(size);
  // Write as SVG - we'll reference these
  fs.writeFileSync(path.join(publicDir, `icon-${size}.svg`), svg);
  console.log(`Generated icon-${size}.svg`);
}

// Also create a simple HTML file to convert SVGs to PNGs (not needed for basic PWA)
console.log('Done! SVG icons generated.');
