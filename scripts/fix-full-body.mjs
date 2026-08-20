/**
 * Create full-body: place original on RIGHT, mirror it on LEFT.
 * Run: node scripts/fix-full-body.mjs
 */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '../public/muscle-groups');
const dst = join(__dirname, '../public/muscle-groups/full');

const files = [
  'shoulders.png', 'chest.png', 'back.png',
  'triceps.png', 'core.png', 'quads.png',
  'hamstrings.png', 'glutes.png', 'biceps.png',
  'forearms.png', 'calves.png',
];

for (const file of files) {
  const inputPath = join(src, file);
  const outputPath = join(dst, file);

  const { info } = await sharp(inputPath).toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // Read original as buffer
  const original = await sharp(inputPath).toBuffer();

  // Mirror (flip horizontally)
  const mirrored = await sharp(inputPath).flop().toBuffer();

  // Composite: mirrored on LEFT, original on RIGHT
  const fullW = w * 2;
  const merged = await sharp({
    create: { width: fullW, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: mirrored, left: 0, top: 0 },
      { input: original, left: w, top: 0 },
    ])
    .png()
    .toFile(outputPath);

  console.log(`✓ ${file} (${merged.width}x${merged.height})`);
}

console.log('\nDone!');
