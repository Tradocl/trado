import sharp from "sharp";

const svg = `<svg width="512" height="512" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3340d8" />
      <stop offset="100%" stop-color="#7147d4" />
    </linearGradient>
  </defs>
  <rect width="40" height="40" rx="10" fill="url(#bg)" />
  <path d="M20 7 L32 12 V22 C32 29.5 20 35 20 35 C20 35 8 29.5 8 22 V12 Z"
    fill="white" fill-opacity="0.15" stroke="white" stroke-opacity="0.45" stroke-width="1.5" />
  <path d="M13.5 21 L18.5 26.5 L27.5 15"
    stroke="#0fba7c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
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
