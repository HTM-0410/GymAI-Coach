const { readFileSync } = require('node:fs');
const path = require('node:path');
try {
  const txt = readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const url = 'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/3-4-sit-up.jpg';
const GEMINI_KEY = process.env.GEMINI_API_KEY ?? '';
console.log('key prefix:', GEMINI_KEY.slice(0, 8));

(async () => {
  try {
    const r = await fetch(url);
    const buf = Buffer.from(await r.arrayBuffer());
    const b64 = buf.toString('base64');

    const body = {
      contents: [{ role: 'user', parts: [
        { text: 'Trong ảnh này có GHẾ T�P (bench) không? Trả lời JSON: {"has_bench": true|false}' },
        { inline_data: { mime_type: 'image/jpeg', data: b64 } },
      ] }],
      generationConfig: { response_mime_type: 'application/json' },
    };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log('status:', res.status);
    const txt = await res.text();
    console.log('body:', txt.slice(0, 1500));
  } catch (e) {
    console.log('err:', e.message);
  }
})();
