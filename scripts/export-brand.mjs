// Export the existing vector brand as upload-ready PNGs. No network or secrets.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { stat } from 'node:fs/promises';

const asset = name => fileURLToPath(new URL(`../public/brand/${name}`, import.meta.url));
await sharp(asset('unsaidbox-logo.svg'), { density: 192 })
  .resize(3200, 1000).png().toFile(asset('unsaidbox-logo.png'));
await sharp(asset('unsaidbox-mark.svg'))
  .resize(1024, 1024).png().toFile(asset('unsaidbox-mark.png'));
await sharp(asset('unsaidbox-mark.svg'))
  .resize(1024, 1024).flatten({ background: '#FFFFFF' })
  .png().toFile(asset('unsaidbox-google-logo.png'));
for (const name of ['unsaidbox-logo.png', 'unsaidbox-mark.png', 'unsaidbox-google-logo.png']) {
  const { width, height, hasAlpha } = await sharp(asset(name)).metadata();
  const { size } = await stat(asset(name));
  console.log(`${name}: ${width} × ${height}; transparency: ${hasAlpha}; ${size} bytes`);
}
