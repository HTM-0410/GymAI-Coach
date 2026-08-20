#!/usr/bin/env node
/**
 * scripts/llm-map-unmatched.ts
 *
 * Use Gemini to map 81 unmatched slugs to EL exercise names.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const DATA_DIR  = path.join(process.cwd(), 'data', 'exercises');
const OUT_DIR   = path.join(process.cwd(), 'public', 'exercises');
const SLUG_MAP  = path.join(process.cwd(), 'scripts', '.exerciselibrary-slug-map.json');
const UNMATCHED = path.join(process.cwd(), 'scripts', '.unmatched-slugs.json');
const EL_LIST    = path.join(process.cwd(), 'scripts', '.el-full-list.json');
const THUMB_CDN = 'https://pub-51593a4f184f42908b6377b56bf19486.r2.dev/thumbs/male';

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8')
  .split('\n').find(l => l.startsWith('GEMINI_API_KEY='))?.split('=')[1]?.trim() ?? '';

interface ELEx { id: string; name: string; exercise_type: string; gender: string; body_part: string; equipment: string; }

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const body = await res.json() as any;
  return body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function downloadImage(url: string, dest: string): Promise<number> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error('file too small');
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buf);
  return buf.length;
}

async function patchGallery(slug: string, mainPath: string) {
  const file = path.join(DATA_DIR, `${slug}.json`);
  const raw = await fs.readFile(file, 'utf-8');
  const json = JSON.parse(raw);
  json.gallery ??= { main: null, views: [], caption_vi: '' };
  json.gallery.main = mainPath;
  await fs.writeFile(file, JSON.stringify(json, null, 2) + '\n', 'utf-8');
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const elList: ELEx[] = JSON.parse(await fs.readFile(EL_LIST, 'utf-8'));
  const slugMap: Record<string, string> = JSON.parse(await fs.readFile(SLUG_MAP, 'utf-8'));
  const unmatched: string[] = JSON.parse(await fs.readFile(UNMATCHED, 'utf-8'));

  // Get our exercise names
  const ourNames: Record<string, string> = {};
  for (const slug of unmatched) {
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, `${slug}.json`), 'utf-8');
      const json = JSON.parse(raw);
      ourNames[slug] = json?.name?.en ?? json?.name ?? slug;
    } catch {
      ourNames[slug] = slug;
    }
  }

  // Build EL name list (from both elList and slugMap)
  const elNames = [...new Set([
    ...elList.map(e => e.name),
    ...Object.keys(slugMap),
  ])];

  console.log(`LLM mapping ${unmatched.length} unmatched exercises using ${elNames.length} EL names`);

  // Build prompt — send in batches
  const BATCH = 15;
  const mappings: Record<string, string> = {}; // our_slug → EL exercise name

  for (let i = 0; i < unmatched.length; i += BATCH) {
    const batch = unmatched.slice(i, i + BATCH);
    const batchNames = batch.map(s => `  "${s}" — ${ourNames[s]}`).join('\n');

    const prompt = `You are a fitness exercise mapping expert.

Match each of our exercise slugs to the closest exercise name from the EL (ExerciseLibrary) list.

Rules:
- Return ONLY a valid JSON object: {"our-slug": "el-exercise-name", ...}
- Use exact matches when available
- Use close semantic matches for variations (e.g. "dumbbell-flyes" → "Lying Floor Fly")
- Return "NO_MATCH" as value if no good match exists in the EL list
- Do NOT invent names not in the EL list

Our exercise slugs with names:
${batchNames}

EL exercise names (${elNames.length} total — partial list shown):
${elNames.slice(0, 500).join('\n')}${elNames.length > 500 ? '\n... (and more)' : ''}

Output JSON:`;

    console.log(`\nBatch ${Math.floor(i / BATCH) + 1}: sending ${batch.length} slugs to Gemini...`);
    const text = await callGemini(prompt);
    console.log('Response preview:', text.slice(0, 300));

    // Parse JSON from response
    let parsed: Record<string, string> = {};
    try {
      // Try to extract JSON from markdown code block
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ?? text.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        parsed = JSON.parse(text.trim());
      }
    } catch (e) {
      console.log('  Failed to parse JSON, trying manual extraction...');
      // Try line-by-line parsing
      const lines = text.split('\n').filter(l => l.includes('"'));
      for (const line of lines) {
        const m = line.match(/"([^"]+)":\s*"([^"]+)"/);
        if (m) parsed[m[1]] = m[2];
      }
    }

    Object.assign(mappings, parsed);
    console.log(`  Got ${Object.keys(parsed).length} mappings from this batch`);
    await sleep(2000); // rate limit
  }

  console.log(`\nTotal mappings: ${Object.keys(mappings).length}`);

  // Convert EL names to IDs using slugMap + elList
  const elNameToId = new Map<string, string>();
  for (const ex of elList) elNameToId.set(ex.name, ex.id);
  for (const [slug, id] of Object.entries(slugMap)) elNameToId.set(slug, id);

  // Download images for matched exercises
  let ok = 0, miss = 0, fail = 0;
  for (const [ourSlug, elName] of Object.entries(mappings)) {
    if (elName === 'NO_MATCH' || !elName) {
      console.log(`  ${ourSlug} … NO_MATCH`);
      miss++;
      continue;
    }

    const elId = elNameToId.get(elName);
    if (!elId) {
      console.log(`  ${ourSlug} → "${elName}" (EL name not in map)`);
      miss++;
      continue;
    }

    const paddedId = String(elId).padStart(6, '0');
    const url = `${THUMB_CDN}/${paddedId}01_1.jpg`;
    const dest = path.join(OUT_DIR, `${ourSlug}.jpg`);

    try {
      const size = await downloadImage(url, dest);
      await patchGallery(ourSlug, `/exercises/${ourSlug}.jpg`);
      console.log(`  ${ourSlug} → ${elName} (${elId}) OK ${size}b`);
      ok++;
    } catch (err: any) {
      console.log(`  ${ourSlug} → ${elName} (${elId}) FAIL: ${err.message}`);
      fail++;
    }
    await sleep(200);
  }

  console.log(`\nLLM mapping done. ${ok} ok, ${miss} no match, ${fail} failed.`);

  // Save remaining unmatched
  const stillUnmatched = unmatched.filter(s => !mappings[s] || mappings[s] === 'NO_MATCH');
  if (stillUnmatched.length > 0) {
    await fs.writeFile(UNMATCHED, JSON.stringify(stillUnmatched, null, 2), 'utf-8');
    console.log(`Still unmatched (${stillUnmatched.length}): ${stillUnmatched.join(', ')}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
