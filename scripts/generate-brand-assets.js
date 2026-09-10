import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve(process.cwd(), 'public');
const brandDir = path.resolve(publicDir, 'brand');

if (!fs.existsSync(brandDir)) {
  fs.mkdirSync(brandDir, { recursive: true });
}

// 1. Core Symbol SVG (512x512)
const symbolSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
    <linearGradient id="primaryAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="secondaryAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </linearGradient>
    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0284c7" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Base Rounded Container -->
  <rect x="24" y="24" width="464" height="464" rx="108" fill="url(#bgGrad)" stroke="#334155" stroke-width="6" />

  <!-- Subtle Blueprint Tech Grid lines -->
  <path d="M120 24 v464 M256 24 v464 M392 24 v464 M24 120 h464 M24 256 h464 M24 392 h464" stroke="#334155" stroke-width="2" stroke-opacity="0.3" stroke-dasharray="6 8" />

  <!-- Geometric Emblem / Monogram "G" formed by Technical Infrastructure & Analysis Vectors -->
  <g filter="url(#subtleGlow)">
    <!-- Outer Arch of G -->
    <path d="M360 180 C336 132 284 116 236 124 C164 136 120 200 120 268 C120 336 168 392 240 392 C312 392 368 344 372 272 H248" 
          fill="none" 
          stroke="url(#primaryAccent)" 
          stroke-width="36" 
          stroke-linecap="round" 
          stroke-linejoin="round" />

    <!-- Inner Core & Crossbar Node -->
    <circle cx="248" cy="272" r="16" fill="#ffffff" />
    <path d="M248 272 H372" stroke="url(#secondaryAccent)" stroke-width="36" stroke-linecap="round" />

    <!-- Upper Right Connection Node -->
    <circle cx="360" cy="180" r="14" fill="#38bdf8" stroke="#0f172a" stroke-width="4" />
    
    <!-- Lower Central Data Dot -->
    <circle cx="240" cy="392" r="12" fill="#ffffff" />
    <circle cx="120" cy="268" r="12" fill="#38bdf8" />
  </g>
</svg>`;

// 2. Horizontal Full Logo SVG
const horizontalLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 180" width="720" height="180">
  <defs>
    <linearGradient id="hBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="hPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>

  <!-- Icon on the Left -->
  <g transform="translate(15, 15) scale(0.293)">
    <rect x="0" y="0" width="512" height="512" rx="112" fill="url(#hBgGrad)" stroke="#334155" stroke-width="8" />
    <path d="M360 180 C336 132 284 116 236 124 C164 136 120 200 120 268 C120 336 168 392 240 392 C312 392 368 344 372 272 H248" 
          fill="none" 
          stroke="url(#hPrimary)" 
          stroke-width="38" 
          stroke-linecap="round" 
          stroke-linejoin="round" />
    <circle cx="248" cy="272" r="18" fill="#ffffff" />
    <path d="M248 272 H372" stroke="#ffffff" stroke-width="38" stroke-linecap="round" />
    <circle cx="360" cy="180" r="16" fill="#38bdf8" />
  </g>

  <!-- Typography on the Right -->
  <text x="190" y="85" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="46" fill="#0f172a" letter-spacing="-1">GEAPI <tspan fill="#0284c7">-</tspan> Sistemas</text>
  <text x="192" y="125" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="20" fill="#475569" letter-spacing="0.5">Gerência de Análise e Processamento de Infrações</text>
  <text x="192" y="152" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="500" font-size="16" fill="#94a3b8">BHTRANS / Prefeitura de Belo Horizonte</text>
</svg>`;

// Write SVGs
fs.writeFileSync(path.join(brandDir, 'logo_geapi_sistemas.svg'), symbolSvg, 'utf8');
fs.writeFileSync(path.join(brandDir, 'logo_geapi_sistemas_horizontal.svg'), horizontalLogoSvg, 'utf8');
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), symbolSvg, 'utf8');

async function generatePngAssets() {
  const svgBuffer = Buffer.from(symbolSvg);

  // 1. Brand Logo PNG
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(brandDir, 'logo_geapi_sistemas.png'));
  
  // 2. Standard Web App Icons
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(svgBuffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));
  
  // 3. Favicon ICO (standard 32x32 png as fallback icon)
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.ico'));

  console.log('✅ All Brand Assets, Favicons, and Mobile Icons successfully generated!');
}

generatePngAssets().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
