const GEMINI_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type CallOpts = {
  prompt: string;
  images?: { base64: string; mimeType: string }[];
  jsonSchema?: boolean;
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
};

export async function callGemini(opts: CallOpts): Promise<string> {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY missing');

  const parts: any[] = [{ text: opts.prompt }];
  if (opts.images) {
    for (const img of opts.images) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
    }
  }

  const body: any = { contents: [{ role: 'user', parts }], generationConfig: { temperature: opts.temperature ?? 0.4, maxOutputTokens: opts.maxOutputTokens ?? 1024 } };
  if (opts.jsonSchema || opts.responseSchema) {
    body.generationConfig.response_mime_type = 'application/json';
  }
  if (opts.responseSchema) {
    body.generationConfig.response_schema = opts.responseSchema;
  }

  const res = await fetch(`${ENDPOINT}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`Gemini ${res.status}: ${errTxt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
