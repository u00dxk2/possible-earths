// One-shot generator for placeholder scenario assets.
// Usage: node scripts/generate-placeholders.mjs
// Produces: per-slug SVG maps for before/after × {terrain,satellite,koppen,temperature},
// a cover.svg, and a 1×1 black heightmap-input.png.
//
// Each view type gets a distinct soft gradient so the four tabs in MapComparison are
// visually distinguishable even with placeholder content.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const slugs = [
  { slug: 'sahara-green', title: 'Sahara Green' },
  { slug: 'mediterranean-dry', title: 'Mediterranean Desiccated' },
  { slug: 'alps-flattened', title: 'Alps Flattened' },
];

// Soft, distinct gradients per view. Each is a pair of stops on a 2:1 canvas.
const viewStyles = {
  terrain: { from: '#D6CDB8', to: '#7A6F58', accent: '#3F362A' },
  satellite: { from: '#A9C7A8', to: '#3D6B4F', accent: '#1E3A2A' },
  koppen: { from: '#FFE680', to: '#5AAACC', accent: '#1F4E5F' },
  temperature: { from: '#3257A8', to: '#E94B3C', accent: '#FFD978' },
};

const placeholderSvg = ({ title, view, side }) => {
  const v = viewStyles[view];
  const label = `${title} — ${side === 'before' ? 'Before' : 'After'} — ${
    view.charAt(0).toUpperCase() + view.slice(1)
  } (placeholder)`;
  const gradId = `g-${view}-${side}`;
  // Subtle tilt on "after" so before vs after read differently at a glance.
  const angle = side === 'after' ? 12 : -8;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 800" width="1600" height="800" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0%" stop-color="${v.from}"/>
      <stop offset="100%" stop-color="${v.to}"/>
    </linearGradient>
    <pattern id="grid-${gradId}" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M 80 0 L 0 0 0 80" fill="none" stroke="${v.accent}" stroke-width="1" stroke-opacity="0.08"/>
    </pattern>
  </defs>
  <rect width="1600" height="800" fill="url(#${gradId})"/>
  <rect width="1600" height="800" fill="url(#grid-${gradId})"/>
  <!-- equator + prime meridian to hint equirectangular -->
  <line x1="0" y1="400" x2="1600" y2="400" stroke="${v.accent}" stroke-width="1" stroke-opacity="0.18" stroke-dasharray="6 8"/>
  <line x1="800" y1="0" x2="800" y2="800" stroke="${v.accent}" stroke-width="1" stroke-opacity="0.18" stroke-dasharray="6 8"/>
  <g font-family="-apple-system, 'Segoe UI', Roboto, Inter, sans-serif" fill="${v.accent}">
    <text x="48" y="80" font-size="28" font-weight="600" letter-spacing="1.5">PLACEHOLDER</text>
    <text x="48" y="752" font-size="36" font-weight="500">${escapeXml(label)}</text>
  </g>
</svg>
`;
};

const coverSvg = (title) => {
  const v = viewStyles.terrain;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 800" width="1600" height="800" role="img" aria-label="${escapeXml(title)} — cover (placeholder)">
  <defs>
    <linearGradient id="cover-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${v.from}"/>
      <stop offset="100%" stop-color="${v.to}"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="800" fill="url(#cover-grad)"/>
  <g font-family="Source Serif 4, Georgia, serif" fill="${v.accent}">
    <text x="80" y="420" font-size="96" font-weight="600">${escapeXml(title)}</text>
    <text x="80" y="490" font-size="32" font-weight="400" opacity="0.7">Possible Earths — placeholder cover</text>
  </g>
</svg>
`;
};

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Smallest valid 1×1 black PNG (67 bytes).
const blackPngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR length + type
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1×1
  0x08, 0x00, 0x00, 0x00, 0x00,                   // 8-bit grayscale
  0x3b, 0x7e, 0x9b, 0x55,                         // IHDR CRC
  0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, // IDAT length + type
  0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // zlib-wrapped 1 black px
  0xe5, 0x27, 0xde, 0xfc,                         // IDAT CRC
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND length + type
  0xae, 0x42, 0x60, 0x82,                         // IEND CRC
]);

const views = ['terrain', 'satellite', 'koppen', 'temperature'];
const sides = ['before', 'after'];

let written = 0;
for (const { slug, title } of slugs) {
  const dir = join(root, 'public', 'scenarios', slug);
  mkdirSync(dir, { recursive: true });

  // 8 map placeholders
  for (const view of views) {
    for (const side of sides) {
      const file = join(dir, `${side}-${view}.svg`);
      writeFileSync(file, placeholderSvg({ title, view, side }), 'utf8');
      written++;
    }
  }

  // cover
  writeFileSync(join(dir, 'cover.svg'), coverSvg(title), 'utf8');
  written++;

  // heightmap-input.png (1×1 black PNG, smallest valid)
  writeFileSync(join(dir, 'heightmap-input.png'), blackPngBytes);
  written++;
}

console.log(`Wrote ${written} placeholder asset files for ${slugs.length} scenarios.`);
