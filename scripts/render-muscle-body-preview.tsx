import { mkdirSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import MuscleFatigueMap, { FRONT_MUSCLE_IDS } from '../src/components/ui/MuscleFatigueMap';

const ENLARGED_REFERENCE = 'C:/Users/Admin/AppData/Local/Temp/codex-clipboard-718ef3e1-9aab-4fec-9b24-af88afb20c4e.png';
const OUTPUT_DIR = 'docs/reports/artifacts';
const PREFIX = `${OUTPUT_DIR}/TIP-MR-UI-23-STAGE-01-CHEST-ENLARGED`;
const REVIEW_WIDTH = 1226;
const FULL_HEIGHT = Math.round(REVIEW_WIDTH * 560 / 240);
const UPPER_BODY_TOP = Math.round(64 / 560 * FULL_HEIGHT);
const UPPER_BODY_HEIGHT = 1081;
const ALIGN_SCALE = 1.118;
const ISOLATED_CROP = { left: 255, top: 130, width: 716, height: 430 } as const;

function fatigueForId(id: string) {
  return id === 'pec_l' || id === 'pec_r' ? 0.92 : 0;
}

function renderSvg() {
  const markup = renderToStaticMarkup(
    <MuscleFatigueMap
      view="front"
      theme="dark"
      muscles={FRONT_MUSCLE_IDS.map((id) => ({ id, fatigue: fatigueForId(id) }))}
      onSelect={() => undefined}
    />,
  );
  return Buffer.from(markup.replace('background-color:#1A1A24', 'background-color:transparent'));
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const fullRender = await sharp(renderSvg())
    .resize({ width: REVIEW_WIDTH, height: FULL_HEIGHT, fit: 'fill' })
    .png()
    .toBuffer();
  const rawImplementationCrop = await sharp(fullRender)
    .extract({ left: 0, top: UPPER_BODY_TOP, width: REVIEW_WIDTH, height: UPPER_BODY_HEIGHT })
    .flatten({ background: '#1A1A24' })
    .png()
    .toBuffer();
  const alignedWidth = Math.round(REVIEW_WIDTH * ALIGN_SCALE);
  const alignedHeight = Math.round(UPPER_BODY_HEIGHT * ALIGN_SCALE);
  const implementationCrop = await sharp(rawImplementationCrop)
    .resize({ width: alignedWidth, height: alignedHeight, fit: 'fill' })
    .extract({
      left: Math.round((alignedWidth - REVIEW_WIDTH) / 2),
      top: 11,
      width: REVIEW_WIDTH,
      height: UPPER_BODY_HEIGHT,
    })
    .png()
    .toBuffer();

  await sharp(implementationCrop)
    .extract(ISOLATED_CROP)
    .resize({ width: ISOLATED_CROP.width * 2 })
    .extend({ top: 32, bottom: 32, left: 32, right: 32, background: '#1A1A24' })
    .png()
    .toFile(`${PREFIX}-ISOLATED.png`);

  await sharp({
    create: {
      width: REVIEW_WIDTH * 2,
      height: UPPER_BODY_HEIGHT,
      channels: 3,
      background: '#1A1A24',
    },
  })
    .composite([
      { input: await sharp(ENLARGED_REFERENCE).flatten({ background: '#1A1A24' }).png().toBuffer(), left: 0, top: 0 },
      { input: implementationCrop, left: REVIEW_WIDTH, top: 0 },
    ])
    .png()
    .toFile(`${PREFIX}-SIDE-BY-SIDE.png`);

  await sharp(ENLARGED_REFERENCE)
    .flatten({ background: '#1A1A24' })
    .composite([{ input: implementationCrop, left: 0, top: 0, blend: 'over', opacity: 0.5 }])
    .png()
    .toFile(`${PREFIX}-OVERLAY-50.png`);

  await sharp(renderSvg())
    .resize({ width: 236, height: 551, fit: 'fill' })
    .flatten({ background: '#1A1A24' })
    .png()
    .toFile(`${PREFIX}-CONTEXT.png`);

  process.stdout.write(`${JSON.stringify({
    review: { width: REVIEW_WIDTH, height: UPPER_BODY_HEIGHT, top: UPPER_BODY_TOP, alignScale: ALIGN_SCALE },
    isolatedCrop: ISOLATED_CROP,
    context: { width: 236, height: 551 },
  })}\n`);
}

void main();
