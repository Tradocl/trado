import sharp from "sharp";

// Square (no rounded corners) — used for browser tab + search favicons.
// Fills edge-to-edge so it doesn't appear to have white borders in the tab
// or in Google search results on white backgrounds.
const svgSquare = `<svg width="512" height="512" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1F25C1" />
      <stop offset="100%" stop-color="#7B46D8" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#bg)" />
  <text x="29" y="46" text-anchor="middle"
    font-family="-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif"
    font-size="42" font-weight="600" letter-spacing="-1.5" fill="#FFFFFF">t</text>
  <circle cx="49" cy="43" r="4.5" fill="#FFFFFF"/>
</svg>`;

// Rounded — for Apple touch icons and PWA install icons.
const svgRounded = svgSquare.replace('<rect width="64" height="64" fill="url(#bg)" />',
  '<rect width="64" height="64" rx="14" fill="url(#bg)" />');

const sq = Buffer.from(svgSquare);
const rd = Buffer.from(svgRounded);

await sharp(sq).resize(32,  32).png().toFile("public/favicon.png");
await sharp(sq).resize(32,  32).png().toFile("public/favicon.ico");
await sharp(rd).resize(180, 180).png().toFile("public/apple-touch-icon.png");
await sharp(rd).resize(152, 152).png().toFile("public/apple-touch-icon-152.png");
await sharp(rd).resize(167, 167).png().toFile("public/apple-touch-icon-167.png");
await sharp(sq).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(sq).resize(512, 512).png().toFile("public/icon-512.png");
await sharp(sq).resize(512, 512).png().toFile("public/icon-512-maskable.png");

// Google OAuth consent screen logo — 120x120 PNG, square, no transparency.
await sharp(sq).resize(120, 120).png().toFile("/mnt/documents/trado-google-logo-120.png");
// Higher-res versions in case Google needs them or for other listings.
await sharp(sq).resize(256, 256).png().toFile("/mnt/documents/trado-logo-256.png");
await sharp(sq).resize(512, 512).png().toFile("/mnt/documents/trado-logo-512.png");

console.log("Favicons + Google OAuth logo generados correctamente");
