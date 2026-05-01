import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'public', 'favicon.png');
const publicDir = join(root, 'public');

// PWA icons
const pwaIcons = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' }, // iOS home screen
  { size: 167, name: 'apple-touch-icon-167.png' },
  { size: 152, name: 'apple-touch-icon-152.png' },
];

// Capacitor / Android (mipmap) sizes
const androidIcons = [
  { size: 48,  name: 'android/icon-48.png' },
  { size: 72,  name: 'android/icon-72.png' },
  { size: 96,  name: 'android/icon-96.png' },
  { size: 144, name: 'android/icon-144.png' },
  { size: 192, name: 'android/icon-192.png' },
  { size: 512, name: 'android/icon-512.png' },
];

// iOS icon sizes (App Store + device sizes)
const iosIcons = [
  { size: 20,   name: 'ios/icon-20.png' },
  { size: 29,   name: 'ios/icon-29.png' },
  { size: 40,   name: 'ios/icon-40.png' },
  { size: 58,   name: 'ios/icon-58.png' },
  { size: 60,   name: 'ios/icon-60.png' },
  { size: 76,   name: 'ios/icon-76.png' },
  { size: 80,   name: 'ios/icon-80.png' },
  { size: 87,   name: 'ios/icon-87.png' },
  { size: 120,  name: 'ios/icon-120.png' },
  { size: 152,  name: 'ios/icon-152.png' },
  { size: 167,  name: 'ios/icon-167.png' },
  { size: 180,  name: 'ios/icon-180.png' },
  { size: 1024, name: 'ios/icon-1024.png' },
];

const allIcons = [...pwaIcons, ...androidIcons, ...iosIcons];

mkdirSync(join(publicDir, 'android'), { recursive: true });
mkdirSync(join(publicDir, 'ios'), { recursive: true });

let ok = 0;
for (const { size, name } of allIcons) {
  const dest = join(publicDir, name);
  await sharp(src).resize(size, size).png().toFile(dest);
  console.log(`✓ ${name} (${size}x${size})`);
  ok++;
}

// Maskable icon for Android (adds padding ~10% so logo fits safe zone)
await sharp(src)
  .resize(432, 432) // logo at ~85% of 512
  .extend({ top: 40, bottom: 40, left: 40, right: 40, background: '#ffffff' })
  .resize(512, 512)
  .png()
  .toFile(join(publicDir, 'icon-512-maskable.png'));
console.log('✓ icon-512-maskable.png (512x512 maskable)');

console.log(`\nDone — ${ok + 1} icons generated.`);
