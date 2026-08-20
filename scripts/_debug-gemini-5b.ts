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

// Replicate the script EXACTLY
async function fetchAsBase64(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    return { data: buf.toString('base64'), mime };
  } catch {
    return null;
  }
}

const urls = [
  'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/3-4-sit-up.jpg',
  'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/45-side-bend.jpg',
  'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/air-bike.jpg',
  'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/all-fours-squad-stretch.jpg',
  'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/alternate-heel-touchers.jpg',
];

(async () => {
  const imgs = await Promise.all(urls.map(async (url) => {
    const r = await fetchAsBase64(url);
    return r ? { ...r, slug: url.split('/').pop().split('.')[0] } : null;
  }));
  const valid = imgs.filter(x => x !== null);
  console.log('valid:', valid.length);

  const prompt = `For each image below, identify whether the exercise uses a gym bench (flat bench, incline bench, decline bench, preacher bench, hyperextension bench, ab bench). Return ONLY JSON: {"results":[{"idx":N,"slug":"<slug>","has_bench":true|false,"bench_type":"flat"|"incline"|"decline"|"ab"|"preacher"|"hyperextension"|"other","reason":"<one short sentence>"}]}`;

  const parts = [{ text: prompt }];
  for (let i = 0; i < valid.length; i++) {
    const img = valid[i];
    parts.push({ text: `idx=${i + 1} slug=${img.slug}` });
    parts.push({ inline_data: { mime_type: img.mime, data: img.data } });
  }
  console.log('parts count:', parts.length);

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      response_mime_type: 'application/json',
    },
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  console.log('status:', res.status);
  console.log('body:', (await res.text()).slice(0, 1500));
})();
