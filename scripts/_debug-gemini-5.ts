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
const urls = [
  'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/3-4-sit-up.jpg',
  'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/45-side-bend.jpg',
  'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/air-bike.jpg',
  'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/all-fours-squad-stretch.jpg',
  'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/alternate-heel-touchers.jpg',
];

(async () => {
  const images = await Promise.all(urls.map(async (u, i) => {
    const r = await fetch(u);
    const buf = Buffer.from(await r.arrayBuffer());
    return { i, slug: `slug${i}`, b64: buf.toString('base64'), size: buf.length };
  }));
  console.log('sizes:', images.map(x => `${x.slug}=${x.size}`).join(' '));

  const parts = [{ text: 'Với mỗi ảnh sau, JSON: {"results":[{"idx":N,"slug":"<slug>","has_bench":true|false,"reason":"..."}]}' }];
  for (const img of images) {
    parts.push({ text: `idx=${img.i+1} slug=${img.slug}` });
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: img.b64 } });
  }

  const body = { contents: [{ role: 'user', parts }], generationConfig: { response_mime_type: 'application/json' } };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  console.log('status:', res.status);
  console.log('body:', (await res.text()).slice(0, 1500));
})();
