import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

type ManifestItem = {
  canonical_slug: string;
  output_filename: string;
  name_vi: string;
  name_en: string;
  category: string;
  positive_prompt: string;
  negative_prompt: string;
  required_visual_features: string[];
  forbidden_visual_features: string[];
  aliases: string[];
  source_records: Array<{ id: string; slug: string; name: string; name_vi: string }>;
};

type RunRecord = {
  canonical_slug: string;
  output_filename: string;
  model: string;
  prompt: string;
  seed: number;
  steps: number;
  generated_at: string;
  width: number;
  height: number;
  format: string;
  sha256: string;
  status: 'generated' | 'failed';
  error?: string;
};

const DEFAULT_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const DEFAULT_PROMPT_MODEL = '@cf/meta/llama-3.2-3b-instruct';
const STEPS = 8;
const SEED = 20260820;
const MANIFEST_PATH = path.resolve('artifacts/equipment-image-regeneration/generation-manifest.json');
const DEFAULT_RUN_DIR = path.resolve(
  'artifacts/equipment-image-regeneration/cloudflare-flux1-schnell-20260820',
);

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getCloudflareToken(): string {
  const raw = execFileSync(
    'C:\\Windows\\System32\\cmd.exe',
    ['/d', '/s', '/c', 'npx.cmd -y wrangler@latest auth token --json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const parsed = JSON.parse(raw) as { token?: string; value?: string };
  const token = parsed.token ?? parsed.value;
  if (!token) throw new Error('Wrangler did not return an OAuth token.');
  return token;
}

function compactPrompt(item: ManifestItem): string {
  const required = item.required_visual_features.join('; ');
  const forbidden = item.forbidden_visual_features.join('; ');
  const prompt = [
    `Clean realistic commercial studio product photograph of ONE ${item.name_en}.`,
    item.positive_prompt,
    `Required construction details: ${required}.`,
    'Front three-quarter view at approximately 35 degrees, camera at product mid-height, centered composition, entire equipment fully visible with generous even margins.',
    'Pure white seamless studio background, matte black and dark graphite finish, subtle brushed steel details, neutral black upholstery where applicable, soft diffused lighting, subtle natural contact shadow, sharp focus, mechanically realistic commercial gym equipment.',
    `Do not include: ${item.negative_prompt}; ${forbidden}; people; hands; body parts; gym interior; text; watermark; logo; trademark; brand name; price tag; collage; multiple views; unrelated accessories; cropped parts; impossible joints; duplicated components.`,
  ].join(' ');

  // FLUX.1 Schnell accepts at most 2048 prompt characters.
  return prompt.length <= 2048 ? prompt : prompt.slice(0, 2045) + '...';
}

async function generatePromptWithLlm(
  accountId: string,
  token: string,
  item: ManifestItem,
  promptModel: string,
): Promise<string> {
  const system = `You are an expert commercial gym equipment product designer, mechanical engineer, and text-to-image prompt architect. Write a complete English image-generation prompt for a diffusion model. Accuracy is more important than brevity. First reason internally about how the real commercial equipment operates and how force travels through its handles, pivots, cables, straps, pads, frame, and loading mechanism. Then describe only mechanically necessary and visually verifiable components. Treat the supplied feature list as minimum grounding, not permission to invent details. Never invent measurements, plate weights, component counts, materials, adjustment mechanisms, or decorative features that are not necessary to identify the standard real-world equipment. Correct obvious ambiguity in the source by using the most common mechanically valid commercial design. Explicitly describe the visual features that distinguish the subject from commonly confused equipment and state which confusing components must be absent. Then specify a consistent premium catalog product-photography setup: exactly one product, front three-quarter view around 35 degrees, camera at product mid-height, the whole object visible with generous margins, pure seamless white background, matte black and graphite surfaces, restrained brushed steel, black upholstery where applicable, soft diffused studio lighting, and a subtle contact shadow. Explicitly prohibit every unwanted object, incorrect machine type, person, body part, room, logo, trademark, label, readable or invented text, watermark, collage, cropped component, duplicated component, and mechanically impossible structure. All surfaces must be blank and unbranded. Do not mention real manufacturers or model names. Before answering, silently verify that every described component contributes to the equipment's real operation and that no sentence treats the background, lighting, or upholstery as a structural material. Output only the final prompt as continuous plain English text, with no markdown, no commentary, no quotation marks, and no character-count optimization.`;
  const user = JSON.stringify({
    equipment_name_en: item.name_en,
    equipment_name_vi: item.name_vi,
    category: item.category,
    existing_description: item.positive_prompt,
    mandatory_visual_features: item.required_visual_features,
    forbidden_or_confusing_features: [item.negative_prompt, ...item.forbidden_visual_features],
    aliases: item.aliases,
  });

  if (promptModel.startsWith('gemini/')) {
    const geminiModel = promptModel.slice('gemini/'.length);
    const envText = await fs.readFile(path.resolve('.env.local'), 'utf8');
    const keyLine = envText
      .split(/\r?\n/)
      .find((line) => line.trim().startsWith('GEMINI_API_KEY='));
    const apiKey = keyLine
      ?.split('=', 2)[1]
      ?.trim()
      .replace(/^['"]|['"]$/g, '');
    if (!apiKey) throw new Error('GEMINI_API_KEY is missing from .env.local.');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
        }),
        signal: AbortSignal.timeout(120_000),
      },
    );
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { code?: number; message?: string };
    };
    const generated = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();
    if (!response.ok || !generated) {
      throw new Error(
        `Gemini prompt LLM ${response.status}: ${payload.error?.message || 'prompt generation failed'}`,
      );
    }
    return generated
      .replace(/^```(?:text)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .replace(/^['"]|['"]$/g, '')
      .trim();
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${promptModel}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.1,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const payload = (await response.json()) as {
    success?: boolean;
    result?: { response?: string };
    errors?: Array<{ code?: number; message?: string }>;
  };
  const generated = payload.result?.response?.trim();
  if (!response.ok || !payload.success || !generated) {
    const message = payload.errors?.map((error) => `${error.code ?? ''} ${error.message ?? ''}`.trim()).join('; ');
    throw new Error(`Prompt LLM ${response.status}: ${message || 'prompt generation failed'}`);
  }
  return generated
    .replace(/^```(?:text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

async function generateImage(
  accountId: string,
  token: string,
  prompt: string,
  model: string,
): Promise<Buffer> {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const isMultipartModel = model.includes('/flux-2-');
  const multipart = new FormData();
  if (isMultipartModel) multipart.append('prompt', prompt);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(isMultipartModel ? {} : { 'Content-Type': 'application/json' }),
    },
    body: isMultipartModel ? multipart : JSON.stringify({ prompt, steps: STEPS }),
    signal: AbortSignal.timeout(120_000),
  });

  const payload = (await response.json()) as {
    success?: boolean;
    result?: { image?: string };
    errors?: Array<{ code?: number; message?: string }>;
  };
  if (!response.ok || !payload.success || !payload.result?.image) {
    const message = payload.errors?.map((error) => `${error.code ?? ''} ${error.message ?? ''}`.trim()).join('; ');
    throw new Error(`Cloudflare ${response.status}: ${message || 'image generation failed'}`);
  }
  return Buffer.from(payload.result.image, 'base64');
}

async function normalizeImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize(800, 600, {
      fit: 'contain',
      withoutEnlargement: false,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: '#ffffff' })
    .webp({ quality: 92, effort: 5 })
    .toBuffer();
}

async function main() {
  const accountId = argValue('--account-id') ?? process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) throw new Error('Pass --account-id or set CLOUDFLARE_ACCOUNT_ID.');

  const runDir = path.resolve(argValue('--run-dir') ?? DEFAULT_RUN_DIR);
  const model = argValue('--model') ?? DEFAULT_MODEL;
  const promptModel = argValue('--prompt-model') ?? DEFAULT_PROMPT_MODEL;
  const generatedDir = path.join(runDir, 'generated');
  const promptsDir = path.join(runDir, 'prompts');
  const runManifestPath = path.join(runDir, 'run-manifest.json');
  const only = argValue('--only');
  const limit = Number(argValue('--limit') ?? Number.POSITIVE_INFINITY);
  const promptsOnly = process.argv.includes('--prompts-only');

  await fs.mkdir(generatedDir, { recursive: true });
  await fs.mkdir(promptsDir, { recursive: true });

  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8')) as ManifestItem[];
  const selected = manifest
    .filter((item) => !only || item.canonical_slug === only)
    .slice(0, Number.isFinite(limit) ? limit : undefined);
  if (!selected.length) throw new Error('No manifest items matched the requested selection.');

  let records: RunRecord[] = [];
  try {
    records = JSON.parse(await fs.readFile(runManifestPath, 'utf8')) as RunRecord[];
  } catch {
    // New run.
  }

  const token = getCloudflareToken();
  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index];
    const outputPath = path.join(generatedDir, item.output_filename);
    const existing = records.find(
      (record) => record.canonical_slug === item.canonical_slug && record.status === 'generated',
    );
    if (existing) {
      try {
        const existingBuffer = await fs.readFile(outputPath);
        const metadata = await sharp(existingBuffer).metadata();
        if (metadata.width === 800 && metadata.height === 600 && metadata.format === 'webp') {
          console.log(`[SKIP ${index + 1}/${selected.length}] ${item.canonical_slug}`);
          continue;
        }
      } catch {
        // Regenerate missing or invalid checkpoint output.
      }
    }

    const promptMetadataPath = path.join(promptsDir, `${item.canonical_slug}.json`);
    let prompt: string;
    try {
      const saved = JSON.parse(await fs.readFile(promptMetadataPath, 'utf8')) as { prompt?: string };
      prompt = saved.prompt?.trim() || compactPrompt(item);
    } catch {
      console.log(`[PROMPT ${index + 1}/${selected.length}] ${item.canonical_slug} via ${promptModel}`);
      prompt = await generatePromptWithLlm(accountId, token, item, promptModel);
      await fs.writeFile(
        promptMetadataPath,
        JSON.stringify(
          {
            canonical_slug: item.canonical_slug,
            prompt_model: promptModel,
            generated_at: new Date().toISOString(),
            prompt,
          },
          null,
          2,
        ),
        'utf8',
      );
    }
    await fs.writeFile(path.join(promptsDir, `${item.canonical_slug}.txt`), prompt, 'utf8');
    if (promptsOnly) {
      console.log(`[PROMPT OK] ${item.canonical_slug} (${prompt.length} chars)`);
      continue;
    }
    console.log(`[GEN ${index + 1}/${selected.length}] ${item.canonical_slug} — ${item.name_vi}`);

    try {
      const raw = await generateImage(accountId, token, prompt, model);
      const normalized = await normalizeImage(raw);
      await fs.writeFile(outputPath, normalized);
      const metadata = await sharp(normalized).metadata();
      const sha256 = createHash('sha256').update(normalized).digest('hex');
      const record: RunRecord = {
        canonical_slug: item.canonical_slug,
        output_filename: item.output_filename,
        model,
        prompt,
        seed: SEED,
        steps: STEPS,
        generated_at: new Date().toISOString(),
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        format: metadata.format ?? '',
        sha256,
        status: 'generated',
      };
      records = records.filter((current) => current.canonical_slug !== item.canonical_slug);
      records.push(record);
      await fs.writeFile(runManifestPath, JSON.stringify(records, null, 2), 'utf8');
      console.log(`[OK] ${item.canonical_slug} (${metadata.width}x${metadata.height} ${metadata.format})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      records = records.filter((current) => current.canonical_slug !== item.canonical_slug);
      records.push({
        canonical_slug: item.canonical_slug,
        output_filename: item.output_filename,
        model,
        prompt,
        seed: SEED,
        steps: STEPS,
        generated_at: new Date().toISOString(),
        width: 0,
        height: 0,
        format: '',
        sha256: '',
        status: 'failed',
        error: message,
      });
      await fs.writeFile(runManifestPath, JSON.stringify(records, null, 2), 'utf8');
      console.error(`[FAIL] ${item.canonical_slug}: ${message}`);
      if (/3036|free allocation|account limited/i.test(message)) break;
    }
  }

  const completed = records.filter((record) => record.status === 'generated').length;
  console.log(`Run checkpoint: ${completed}/${manifest.length} canonical images generated.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
