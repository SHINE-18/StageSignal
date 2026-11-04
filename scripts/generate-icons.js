/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// StageSignal Dark Console Icon (Signal Radiating Waves + FOH Fader Beacon)
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#090D18"/>
    </linearGradient>
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#2563EB"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect x="12" y="12" width="488" height="488" rx="100" fill="none" stroke="#1E293B" stroke-width="6"/>

  <!-- Subtle grid accent -->
  <line x1="256" y1="64" x2="256" y2="448" stroke="#1E293B" stroke-width="2" stroke-dasharray="8 8"/>
  <line x1="64" y1="256" x2="448" y2="256" stroke="#1E293B" stroke-width="2" stroke-dasharray="8 8"/>

  <!-- Signal Waves radiating from Stage to FOH -->
  <!-- Outer wave -->
  <path d="M120 220 C140 140 372 140 392 220" fill="none" stroke="#3B82F6" stroke-width="18" stroke-linecap="round" opacity="0.4"/>
  <!-- Middle wave -->
  <path d="M156 250 C180 180 332 180 356 250" fill="none" stroke="#3B82F6" stroke-width="20" stroke-linecap="round" opacity="0.75" filter="url(#glow)"/>
  <!-- Inner wave -->
  <path d="M196 280 C216 230 296 230 316 280" fill="none" stroke="#60A5FA" stroke-width="22" stroke-linecap="round"/>

  <!-- Center Stage/FOH Transmitter Beacon -->
  <circle cx="256" cy="336" r="44" fill="url(#blueGrad)" filter="url(#glow)"/>
  <circle cx="256" cy="336" r="22" fill="#F8FAFC"/>
  <circle cx="256" cy="336" r="8" fill="#1D4ED8"/>

  <!-- Antenna mast base -->
  <path d="M246 380 L236 424 L276 424 L266 380 Z" fill="#3B82F6" opacity="0.8"/>
  <line x1="220" y1="424" x2="292" y2="424" stroke="#60A5FA" stroke-width="6" stroke-linecap="round"/>
</svg>
`;

// Maskable Icon with 15% safe padding
const svgMaskableIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#090D18"/>
    </linearGradient>
    <linearGradient id="blueGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#2563EB"/>
    </linearGradient>
  </defs>

  <!-- Full bleed background for maskable -->
  <rect width="512" height="512" fill="url(#bgGradM)"/>

  <!-- Inner content placed within 80% safe zone (center 400x400) -->
  <g transform="translate(56, 56) scale(0.78)">
    <path d="M120 220 C140 140 372 140 392 220" fill="none" stroke="#3B82F6" stroke-width="20" stroke-linecap="round" opacity="0.4"/>
    <path d="M156 250 C180 180 332 180 356 250" fill="none" stroke="#3B82F6" stroke-width="22" stroke-linecap="round" opacity="0.75"/>
    <path d="M196 280 C216 230 296 230 316 280" fill="none" stroke="#60A5FA" stroke-width="24" stroke-linecap="round"/>
    <circle cx="256" cy="336" r="44" fill="url(#blueGradM)"/>
    <circle cx="256" cy="336" r="22" fill="#F8FAFC"/>
    <circle cx="256" cy="336" r="8" fill="#1D4ED8"/>
    <path d="M246 380 L236 424 L276 424 L266 380 Z" fill="#3B82F6" opacity="0.8"/>
    <line x1="220" y1="424" x2="292" y2="424" stroke="#60A5FA" stroke-width="6" stroke-linecap="round"/>
  </g>
</svg>
`;

async function generateIcons() {
  const svgBuf = Buffer.from(svgIcon);
  const svgMaskableBuf = Buffer.from(svgMaskableIcon);

  // Save SVG originals
  fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), svgIcon.trim());
  fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), svgIcon.trim());

  // Generate 192x192 PNG
  await sharp(svgBuf)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('Generated icon-192.png');

  // Generate 512x512 PNG
  await sharp(svgBuf)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('Generated icon-512.png');

  // Generate Maskable 192x192 PNG
  await sharp(svgMaskableBuf)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-192.png'));
  console.log('Generated icon-maskable-192.png');

  // Generate Maskable 512x512 PNG
  await sharp(svgMaskableBuf)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512.png'));
  console.log('Generated icon-maskable-512.png');

  // Generate Apple Touch Icon 180x180 PNG
  await sharp(svgBuf)
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
