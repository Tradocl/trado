import sharp from "sharp";

const svg = `<svg width="512" height="512" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1F25C1" />
      <stop offset="100%" stop-color="#7B46D8" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)" />
  <text x="29" y="46" text-anchor="middle"
    font-family="-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif"
    font-size="42" font-weight="600" letter-spacing="-1.5" fill="#FFFFFF">t</text>
  <circle cx="49" cy="43" r="4.5" fill="#FFFFFF"/>
</svg>`;

const buf = Buffer.from(svg);

await sharp(buf).resize(32,  32).png().toFile("public/favicon.png");
await sharp(buf).resize(32,  32).png().toFile("public/favicon.ico");
await sharp(buf).resize(180, 180).png().toFile("public/apple-touch-icon.png");
await sharp(buf).resize(152, 152).png().toFile("public/apple-touch-icon-152.png");
await sharp(buf).resize(167, 167).png().toFile("public/apple-touch-icon-167.png");
await sharp(buf).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(buf).resize(512, 512).png().toFile("public/icon-512.png");
await sharp(buf).resize(512, 512).png().toFile("public/icon-512-maskable.png");

console.log("Favicons generados correctamente");
