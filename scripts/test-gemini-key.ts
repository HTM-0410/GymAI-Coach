import { GoogleGenAI } from '@google/genai';

const key = process.env.GEMINI_API_KEY ?? process.argv[2];
if (!key) { console.error('NO_KEY'); process.exit(2); }

const ai = new GoogleGenAI({ apiKey: key });
(async () => {
  try {
    const r = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: 'ping',
    });
    console.log('OK', r.text?.slice(0, 50) ?? '(empty)');
  } catch (e: any) {
    console.error('ERR', e?.status ?? '?', e?.message?.slice(0, 400) ?? String(e).slice(0, 400));
    process.exit(1);
  }
})();