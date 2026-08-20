/**
 * Merge half-body images into full-body (original + mirror) using sharp.
 * Run: node scripts/merge-muscle-images.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '../public/muscle-groups');
const dst = join(__dirname, '../public/muscle-groups/full');

// Ensure output dir
mkdirSync(dst, { recursive: true });

const files = [
  'shoulders.png',
  'chest.png',
  'back.png',
  'triceps.png',
  'core.png',
  'quads.png',
  'hamstrings.png',
  'glutes.png',
  'biceps.png',
  'forearms.png',
  'calves.png',
];

for (const file of files) {
  const inputPath = join(src, file);
  const outputPath = join(dst, file);

  const original = await sharp(inputPath)
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const w = original.info.width;
  const h = original.info.height;

  // Mirror left half
  const leftHalf = await sharp(inputPath)
    .extract({ left: 0, top: 0, width: Math.floor(w / 2), height: h })
    .flop() // horizontal flip
    .toBuffer();

  // Right half of original
  const rightHalf = await sharp(inputPath)
    .extract({ left: Math.floor(w / 2), top: 0, width: Math.ceil(w / 2), height: h })
    .toBuffer();

  // Composite: left (flipped) on left + right on right
  const merged = await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: leftHalf, left: 0, top: 0 },
      { input: rightHalf, left: Math.floor(w / 2), top: 0 },
    ])
    .png()
    .toFile(outputPath);

  console.log(`✓ ${file} (${merged.width}x${merged.height})`);
}

console.log('\nDone. Full-body images saved to public/muscle-groups/full/');
