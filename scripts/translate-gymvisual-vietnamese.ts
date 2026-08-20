#!/usr/bin/env node
/** Translate canonical Gym visual records. Exactly one Gemini request per 5 exercises. */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data', 'exercises');
const CACHE_DIR = path.join(ROOT, '.cache', 'gymvisual-vi');
const BATCH_SIZE = 5;
const MODEL = process.env.GEMINI_MODEL_TRANSLATION ?? 'gemini-2.5-flash-lite';

function loadEnv() {
  try {
    const text = require('node:fs').readFileSync(path.join(ROOT, '.env.local'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch { /* environment may already be configured */ }
}
loadEnv();
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) throw new Error('GEMINI_API_KEY is required (server-side only)');

type Item = {
  slug: string; name: string; name_vi: string; primary_muscle: string;
  equipment: string[]; instructions: string[];
};
type Translation = {
  slug: string; name_vi: string; subtitle_vi: string; goal_vi: string;
  instructions: string[]; tips: string[]; common_mistakes: string[]; safety_vi: string;
};

function parseJson(text: string): Translation[] {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed) || parsed.length !== BATCH_SIZE) throw new Error(`Expected ${BATCH_SIZE} translations`);
  for (const item of parsed) {
    for (const key of ['slug', 'name_vi', 'subtitle_vi', 'goal_vi', 'safety_vi']) {
      if (typeof item[key] !== 'string' || !item[key].trim()) throw new Error(`Missing ${key}`);
    }
    for (const key of ['instructions', 'tips', 'common_mistakes']) {
      if (!Array.isArray(item[key]) || item[key].length < 1 || item[key].some((v: unknown) => typeof v !== 'string')) throw new Error(`Invalid ${key}`);
    }
  }
  return parsed;
}

function prompt(items: Item[]) {
  return `Bạn là biên tập viên nội dung thể hình tiếng Việt. Dịch và biên soạn đúng 5 bài tập dưới đây.
CHỈ trả về JSON array đúng 5 phần tử, không markdown. Giữ nguyên slug. Không bịa thay đổi cơ chính, dụng cụ hoặc chuyển động. Tất cả text phải là tiếng Việt tự nhiên có dấu.
Mỗi phần tử có: slug, name_vi, subtitle_vi, goal_vi, instructions (4-6 bước), tips (2-4), common_mistakes (2-4), safety_vi.
Không đưa tiếng Anh trong ngoặc; thuật ngữ phổ biến có thể giữ nguyên như squat/plank nếu cần.

${JSON.stringify(items, null, 2)}`;
}

async function callGemini(items: Item[]): Promise<Translation[]> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(API_KEY!)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt(items) }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 12000 } }),
  });
  const body = await response.json() as any;
  if (!response.ok || body.error) throw new Error(body.error?.message ?? `Gemini HTTP ${response.status}`);
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');
  return parseJson(text);
}

async function callWithRetry(items: Item[]): Promise<Translation[]> {
  let last: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try { return await callGemini(items); }
    catch (error) {
      last = error;
      if (attempt === 5) break;
      const delay = Math.min(120_000, 15_000 * 2 ** (attempt - 1));
      console.warn(`LLM attempt ${attempt} failed; retrying in ${delay / 1000}s: ${(error as Error).message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw last;
}

async function main() {
  const limitIndex = process.argv.indexOf('--limit');
  const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : Infinity;
  const files = (await fs.readdir(DATA_DIR)).filter((f) => f.endsWith('.json') && f !== 'exercise.schema.json').sort();
  const selected = files.slice(0, limit);
  if (!selected.length || selected.length % BATCH_SIZE !== 0) throw new Error(`Input count must be a multiple of ${BATCH_SIZE}; got ${selected.length}`);
  await fs.mkdir(CACHE_DIR, { recursive: true });
  for (let i = 0; i < selected.length; i += BATCH_SIZE) {
    const filesBatch = selected.slice(i, i + BATCH_SIZE);
    const batchId = `batch-${String(i / BATCH_SIZE + 1).padStart(4, '0')}`;
    const cachePath = path.join(CACHE_DIR, `${batchId}.json`);
    let translations: Translation[];
    try { translations = JSON.parse(await fs.readFile(cachePath, 'utf8')); }
    catch {
      const items = await Promise.all(filesBatch.map(async (file) => JSON.parse(await fs.readFile(path.join(DATA_DIR, file), 'utf8')) as Item));
      console.log(`Calling ${MODEL}: ${batchId} (${filesBatch.join(', ')})`);
      translations = await callWithRetry(items);
      const expected = new Set(items.map((x) => x.slug));
      if (new Set(translations.map((x) => x.slug)).size !== BATCH_SIZE || translations.some((x) => !expected.has(x.slug))) throw new Error(`Slug mismatch in ${batchId}`);
      await fs.writeFile(cachePath, JSON.stringify(translations, null, 2) + '\n', 'utf8');
    }
    const bySlug = new Map(translations.map((x) => [x.slug, x]));
    for (const file of filesBatch) {
      const fullPath = path.join(DATA_DIR, file);
      const record = JSON.parse(await fs.readFile(fullPath, 'utf8'));
      const translated = bySlug.get(record.slug);
      if (!translated) throw new Error(`No translation for ${record.slug}`);
      Object.assign(record, translated, { translation_status: 'review_required', translation_batch: batchId });
      await fs.writeFile(fullPath, JSON.stringify(record, null, 2) + '\n', 'utf8');
    }
    console.log(`Applied ${batchId}`);
  }
}
main().catch((err) => { console.error(err); process.exit(1); });
