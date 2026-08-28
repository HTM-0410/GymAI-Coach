const GEMINI_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export function getGeminiModel() {
  return GEMINI_MODEL;
}

export class GeminiApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly providerStatus?: string,
    public readonly providerReason?: string,
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

export function createGeminiApiError(status: number, rawBody: string): GeminiApiError {
  let providerStatus: string | undefined;
  let providerReason: string | undefined;
  let providerMessage = rawBody.trim();

  try {
    const payload = JSON.parse(rawBody) as {
      error?: {
        status?: unknown;
        message?: unknown;
        details?: Array<{ reason?: unknown }>;
      };
    };
    if (typeof payload.error?.status === 'string') providerStatus = payload.error.status;
    if (typeof payload.error?.message === 'string') providerMessage = payload.error.message;
    const reason = payload.error?.details?.find((detail) => typeof detail?.reason === 'string')?.reason;
    if (typeof reason === 'string') providerReason = reason;
  } catch {
    // Keep the bounded raw provider text when the response is not JSON.
  }

  const summary = providerMessage.slice(0, 500) || 'Unknown provider error';
  return new GeminiApiError(status, `Gemini ${status}: ${summary}`, providerStatus, providerReason);
}

type CallOpts = {
  prompt: string;
  images?: {
    base64: string;
    mimeType: string;
    mediaResolution?: 'MEDIA_RESOLUTION_LOW' | 'MEDIA_RESOLUTION_MEDIUM' | 'MEDIA_RESOLUTION_HIGH' | 'MEDIA_RESOLUTION_ULTRA_HIGH';
  }[];
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
      parts.push({
        inline_data: { mime_type: img.mimeType, data: img.base64 },
        ...(img.mediaResolution ? { media_resolution: { level: img.mediaResolution } } : {}),
      });
    }
  }

  const body: any = { contents: [{ role: 'user', parts }], generationConfig: { temperature: opts.temperature ?? 0.4, maxOutputTokens: opts.maxOutputTokens ?? 1024 } };
  if (opts.jsonSchema || opts.responseSchema) {
    body.generationConfig.response_mime_type = 'application/json';
  }
  if (opts.responseSchema) {
    body.generationConfig.responseJsonSchema = opts.responseSchema;
  }

  const res = await fetch(`${ENDPOINT}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errTxt = await res.text();
    throw createGeminiApiError(res.status, errTxt);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
