import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { callGemini } from '../src/lib/ai/gemini';
import {
  buildEquipmentDetectionPrompt,
  buildEquipmentDetectionResponseSchema,
} from '../src/lib/equipment-detection';

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) throw new Error('Usage: tsx scripts/test-equipment-vision.ts <image-path>');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase environment is missing.');

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: catalog, error } = await supabase
    .from('equipment')
    .select('slug, name_vi, category')
    .order('slug');
  if (error) throw error;

  const extension = extname(imagePath).toLowerCase();
  const mimeType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
  const base64 = (await readFile(imagePath)).toString('base64');
  const prompt = buildEquipmentDetectionPrompt(catalog ?? []);
  const responseSchema = buildEquipmentDetectionResponseSchema((catalog ?? []).map((item) => item.slug));
  const raw = await callGemini({
    prompt,
    images: [{ base64, mimeType }],
    responseSchema,
    temperature: 0.1,
    maxOutputTokens: 1400,
  });
  process.stdout.write(`${raw}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
