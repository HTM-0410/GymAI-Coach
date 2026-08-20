const { readFileSync } = require('node:fs');
const path = require('node:path');
try {
  const txt = readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const url = 'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/3-4-sit-up.jpg';
const url2 = 'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/air-bike.jpg';

(async () => {
  const [r1, r2] = await Promise.all([fetch(url), fetch(url2)]);
  const b1 = Buffer.from(await r1.arrayBuffer()).toString('base64');
  const b2 = Buffer.from(await r2.arrayBuffer()).toString('base64');

  const prompt = `For each image below, identify whether the exercise uses a gym bench (flat bench, incline bench, decline bench, preacher bench, hyperextension bench, ab bench). Return ONLY JSON: {"results":[{"idx":N,"slug":"<slug>","has_bench":true|false,"bench_type":"flat"|"incline"|"decline"|"ab"|"preacher"|"hyperextension"|"other","reason":"<one short sentence>"}]}`;

  const parts = [{ text: prompt }, { text: 'idx=1 slug=foo' }, { inline_data: { mime_type: 'image/jpeg', data: b1 } }, { text: 'idx=2 slug=bar' }, { inline_data: { mime_type: 'image/jpeg', data: b2 } }];

  const body = { contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.1, maxOutputTokens: 4096, response_mime_type: 'application/json' } };

  const res = await fetch(`${ENDPOINT}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  console.log('status:', res.status);
  console.log('body:', (await res.text()).slice(0, 1500));
})();
