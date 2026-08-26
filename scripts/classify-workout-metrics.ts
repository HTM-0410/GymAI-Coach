import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import postgres from 'postgres';
import { z } from 'zod';
import { REVIEWED_WORKOUT_METRICS } from '../src/lib/exercises/workout-metrics-taxonomy';

export const MODEL = 'gemini-3.5-flash-lite';
export const PROMPT_VERSION = 'workout-metrics-v1.1.1';
export const TRACKING_MODES = ['weight_reps', 'reps', 'duration', 'duration_distance'] as const;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_LIMIT = 5;
const MIN_ATTEMPT_GAP_MS = 5_000;

const classificationSchema = z.object({
  slug: z.string().min(1),
  default_tracking_mode: z.enum(TRACKING_MODES),
  allowed_tracking_modes: z.array(z.enum(TRACKING_MODES)).min(1),
  duration_style: z.enum(['active', 'hold']).nullable(),
  load_basis: z.enum(['external_total', 'per_implement', 'assistance', 'none']),
  confidence: z.number().min(0).max(1),
  requires_human_review: z.boolean(),
  rationale: z.string().min(1),
  evidence_signals: z.array(z.string().min(1)).min(1),
}).superRefine((value, context) => {
  if (!value.allowed_tracking_modes.includes(value.default_tracking_mode)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'allowed_tracking_modes must include default mode' });
  }
  const timed = value.default_tracking_mode === 'duration' || value.default_tracking_mode === 'duration_distance';
  if (timed !== (value.duration_style !== null)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'duration_style must be set only for timed default modes' });
  }
  const permitsLoad = value.allowed_tracking_modes.includes('weight_reps');
  if (!permitsLoad && value.load_basis !== 'none') {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'load_basis must be none when weight_reps is not allowed' });
  }
  if (value.confidence < 0.9 && !value.requires_human_review) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'confidence below 0.90 requires human review' });
  }
});

const batchResponseSchema = z.object({ classifications: z.array(classificationSchema) });
export type Classification = z.infer<typeof classificationSchema>;

type ExerciseContext = {
  slug: string;
  name: unknown;
  name_vi: unknown;
  subtitle_vi: unknown;
  movement_pattern: unknown;
  exercise_type: unknown;
  primary_muscle: unknown;
  secondary_muscles: unknown;
  equipment: unknown;
  tags: unknown;
  instructions: unknown;
  setup: unknown;
  workout_role: unknown;
  reviewed_workout_metric: unknown;
};

type Options = {
  dryRun: boolean;
  limit?: number;
  resume: boolean;
  batchSize: number;
  rpm: number;
  runId: string;
};

type AttemptRecord = {
  batch: number;
  kind: 'primary' | 'transport_retry' | 'validation_rerun';
  attempt: number;
  started_at: string;
  status: number | 'network_error';
  elapsed_ms: number;
};

type Progress = {
  run_id: string;
  model: string;
  completed_batches: number[];
  classifications: Classification[];
  attempts: AttemptRecord[];
  started_at: string;
  updated_at: string;
};

const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['classifications'],
  properties: {
    classifications: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'slug', 'default_tracking_mode', 'allowed_tracking_modes', 'duration_style',
          'load_basis', 'confidence', 'requires_human_review', 'rationale', 'evidence_signals',
        ],
        properties: {
          slug: { type: 'string' },
          default_tracking_mode: { type: 'string', enum: [...TRACKING_MODES] },
          allowed_tracking_modes: {
            type: 'array', minItems: 1, uniqueItems: true,
            items: { type: 'string', enum: [...TRACKING_MODES] },
          },
          duration_style: { anyOf: [{ type: 'string', enum: ['active', 'hold'] }, { type: 'null' }] },
          load_basis: { type: 'string', enum: ['external_total', 'per_implement', 'assistance', 'none'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          requires_human_review: { type: 'boolean' },
          rationale: { type: 'string' },
          evidence_signals: { type: 'array', minItems: 1, items: { type: 'string' } },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `You classify how exercises should be measured in GymAI Coach. Return only the structured response.

The phase warmup, main, or cooldown and the workout role do not determine tracking mode. Decide from the exercise's actual movement, equipment, and full instructions.

Contract:
1. weight_reps: dynamic resistance work where external load and repetitions are naturally recorded.
2. reps: dynamic work counted by repetitions, commonly bodyweight or without meaningful external load.
3. duration: static holds, stretching, mobility, or active work measured primarily by time.
4. duration_distance: running, walking, cycling, rowing, elliptical, or locomotion where distance is useful together with time.
5. duration_style describes the DEFAULT mode only, never an optional allowed mode. If default_tracking_mode is reps or weight_reps, duration_style MUST be null even when duration appears in allowed_tracking_modes. If default_tracking_mode is duration or duration_distance, duration_style MUST be active or hold.
6. Dumbbell load is per_implement when the UI should record each implement. Barbell, cable, selectorized machine, plate-loaded machine, kettlebell held as one total load, and other total resistance use external_total. Assisted machines use assistance.
7. load_basis is none unless weight_reps is allowed, except assistance semantics still require weight_reps to be allowed.
8. Weighted bodyweight movements may allow reps and weight_reps, but default to the common execution.
9. Jump rope may allow duration and reps.
10. The current contract cannot fully express load plus distance for loaded carries. Choose the primary useful metric and set requires_human_review true.
11. Do not infer from one keyword when instructions, equipment, and movement pattern conflict.
12. Do not change workout role, exercise type, equipment, or exercise content.
13. allowed_tracking_modes must be nonempty and include the default.
14. Confidence must be 0 to 1. Set requires_human_review true when confidence is below 0.90, when the four modes are not a natural fit, or when evidence conflicts.
15. Existing reviewed mappings are calibration evidence. Respect them when present unless the supplied exercise context clearly contradicts them, in which case flag review.
16. allowed_tracking_modes lists genuinely distinct, natural ways a user may perform and log the exercise. Do not add reps merely because a weight_reps exercise contains repetitions. For a normal barbell, dumbbell, cable, plate-loaded, selectorized machine, or assisted-machine exercise, use weight_reps only unless there is a common bodyweight or unloaded variant under the same exercise identity.
17. weight_reps requires a meaningful numeric external load or assistance value. Resistance-band tension is usually not a numeric kg/lb load in this product, so ordinary band exercises default to reps with load_basis none. A clearly documented weighted implement such as a medicine ball or kettlebell can use weight_reps.
18. Do not add duration merely because any exercise could be performed for time. Add it only when timed execution is a common, natural prescription for that exact exercise.

Cross-field examples:
- default reps, allowed reps plus duration: duration_style is null.
- default weight_reps: duration_style is null.
- default duration for a plank: duration_style is hold.
- default duration for jump rope: duration_style is active.

Provide a concise rationale and concrete evidence signals from the supplied context for every exercise. Preserve every input slug exactly and return exactly one classification per input slug.`;

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function parsePositiveInteger(value: string, flag: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${flag} must be a positive integer`);
  return parsed;
}

export function parseOptions(argv: string[]): Options {
  const values = new Map<string, string>();
  const booleans = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) throw new Error(`Unknown argument: ${arg}`);
    const [flag, inline] = arg.split('=', 2);
    if (['--dry-run', '--resume'].includes(flag)) {
      booleans.add(flag);
      continue;
    }
    const value = inline ?? argv[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    values.set(flag, value);
  }
  const allowed = new Set(['--limit', '--batch-size', '--rpm', '--run-id']);
  for (const key of values.keys()) if (!allowed.has(key)) throw new Error(`Unknown flag: ${key}`);
  const batchSize = parsePositiveInteger(values.get('--batch-size') ?? '20', '--batch-size');
  const rpm = parsePositiveInteger(values.get('--rpm') ?? '12', '--rpm');
  if (rpm > 12) throw new Error('--rpm cannot exceed 12');
  const limit = values.has('--limit') ? parsePositiveInteger(values.get('--limit')!, '--limit') : undefined;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    dryRun: booleans.has('--dry-run'),
    resume: booleans.has('--resume'),
    batchSize,
    rpm,
    limit,
    runId: values.get('--run-id') ?? `wm-${timestamp}`,
  };
}

function atomicJson(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(temporaryPath, filePath);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function buildLocalCatalog(root: string) {
  const result = new Map<string, Record<string, unknown>>();
  for (const fileName of readdirSync(root).filter((name) => name.endsWith('.json')).sort()) {
    const parsed = asRecord(JSON.parse(readFileSync(path.join(root, fileName), 'utf8')));
    const slug = typeof parsed.slug === 'string' ? parsed.slug : path.basename(fileName, '.json');
    if (result.has(slug)) throw new Error(`Duplicate local slug: ${slug}`);
    result.set(slug, parsed);
  }
  return result;
}

function contextFor(slug: string, source: Record<string, unknown>, workoutRole: unknown): ExerciseContext {
  const reviewed = REVIEWED_WORKOUT_METRICS[slug];
  return {
    slug,
    name: source.name ?? null,
    name_vi: source.name_vi ?? null,
    subtitle_vi: source.subtitle_vi ?? null,
    movement_pattern: source.movement_pattern ?? null,
    exercise_type: source.exercise_type ?? null,
    primary_muscle: source.primary_muscle ?? null,
    secondary_muscles: source.secondary_muscles ?? [],
    equipment: source.equipment ?? null,
    tags: source.tags ?? [],
    instructions: source.instructions ?? [],
    setup: source.setup ?? null,
    workout_role: workoutRole ?? source.workout_role ?? null,
    reviewed_workout_metric: reviewed ? {
      default_tracking_mode: reviewed.defaultTrackingMode,
      allowed_tracking_modes: reviewed.allowedTrackingModes,
      duration_style: reviewed.defaultTrackingMode === 'duration' || reviewed.defaultTrackingMode === 'duration_distance'
        ? reviewed.durationStyle
        : null,
      load_basis: reviewed.loadBasis,
      source: reviewed.source,
    } : null,
  };
}

function validateContext(context: ExerciseContext) {
  const required = [
    'slug', 'name', 'name_vi', 'subtitle_vi', 'movement_pattern', 'exercise_type',
    'primary_muscle', 'secondary_muscles', 'equipment', 'tags', 'instructions', 'setup', 'workout_role',
  ] as const;
  const missing = required.filter((field) => context[field] === undefined);
  if (missing.length) throw new Error(`Context ${context.slug} missing fields: ${missing.join(', ')}`);
  if (!Array.isArray(context.instructions) || context.instructions.length === 0) {
    throw new Error(`Context ${context.slug} has no instructions`);
  }
}

async function readLiveCatalog(databaseUrl: string) {
  const sql = postgres(databaseUrl, { max: 1, idle_timeout: 5, connect_timeout: 15 });
  try {
    return await sql.begin(async (transaction) => {
      await transaction.unsafe('set transaction read only');
      const rows = await transaction<{ slug: string; workout_role: string | null }[]>`
        select slug, workout_role
        from public.exercises
        order by slug asc
      `;
      return rows.map((row) => ({ slug: row.slug, workout_role: row.workout_role }));
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export function validateBatch(raw: unknown, expectedSlugs: string[]) {
  const parsed = batchResponseSchema.parse(raw).classifications;
  const actual = parsed.map((item) => item.slug);
  const duplicates = actual.filter((slug, index) => actual.indexOf(slug) !== index);
  const expected = new Set(expectedSlugs);
  const actualSet = new Set(actual);
  const missing = expectedSlugs.filter((slug) => !actualSet.has(slug));
  const extra = actual.filter((slug) => !expected.has(slug));
  if (duplicates.length || missing.length || extra.length || actual.length !== expectedSlugs.length) {
    throw new Error(`Batch slug mismatch: missing=${missing.join(',')} extra=${extra.join(',')} duplicate=${duplicates.join(',')}`);
  }
  return parsed.sort((left, right) => left.slug.localeCompare(right.slug));
}

export function rollingRateViolations(timestamps: string[], rpm: number) {
  const starts = timestamps.map((value) => new Date(value).getTime()).sort((a, b) => a - b);
  const violations: Array<{ start: string; count: number }> = [];
  for (let index = 0; index < starts.length; index += 1) {
    let end = index;
    while (end < starts.length && starts[end] - starts[index] < 60_000) end += 1;
    if (end - index > rpm) violations.push({ start: new Date(starts[index]).toISOString(), count: end - index });
  }
  return violations;
}

class RateLimiter {
  private starts: number[] = [];
  private lastStart = 0;
  constructor(private readonly rpm: number, priorStarts: string[] = []) {
    const now = Date.now();
    this.starts = priorStarts
      .map((value) => new Date(value).getTime())
      .filter((started) => Number.isFinite(started) && now - started >= 0 && now - started < 60_000)
      .sort((left, right) => left - right);
    this.lastStart = this.starts.at(-1) ?? 0;
  }

  async wait() {
    while (true) {
      const now = Date.now();
      this.starts = this.starts.filter((started) => now - started >= 0 && now - started < 60_000);
      const gapWait = Math.max(0, MIN_ATTEMPT_GAP_MS - (now - this.lastStart));
      const windowWait = this.starts.length >= this.rpm ? Math.max(0, 60_001 - (now - this.starts[0])) : 0;
      const waitMs = Math.max(gapWait, windowWait);
      if (waitMs <= 0) {
        const started = Date.now();
        this.starts.push(started);
        this.lastStart = started;
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

function redact(message: string, secrets: string[]) {
  return secrets.reduce((output, secret) => secret ? output.split(secret).join('[REDACTED]') : output, message);
}

function responseText(payload: unknown) {
  const record = asRecord(payload);
  const candidates = Array.isArray(record.candidates) ? record.candidates : [];
  const first = asRecord(candidates[0]);
  const content = asRecord(first.content);
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const text = parts.map((part) => asRecord(part).text).find((value) => typeof value === 'string');
  if (!text) throw new Error('Gemini response has no text payload');
  return text as string;
}

function retryAfterMs(response: Response, retryIndex: number) {
  const header = response.headers.get('retry-after');
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  const exponential = Math.min(60_000, 2_000 * 2 ** retryIndex);
  return exponential + Math.floor(Math.random() * 750);
}

async function callGemini(args: {
  apiKey: string;
  contexts: ExerciseContext[];
  batchNumber: number;
  limiter: RateLimiter;
  attempts: AttemptRecord[];
  validationRerun: boolean;
  correction?: string;
  checkpoint: () => void;
}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify({
      exercises: args.contexts,
      correction_for_rerun: args.correction ?? null,
    }) }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 32_768,
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
    },
  };
  for (let retry = 0; retry <= RETRY_LIMIT; retry += 1) {
    await args.limiter.wait();
    const started = Date.now();
    const record: AttemptRecord = {
      batch: args.batchNumber,
      kind: args.validationRerun ? 'validation_rerun' : retry === 0 ? 'primary' : 'transport_retry',
      attempt: retry + 1,
      started_at: new Date(started).toISOString(),
      status: 'network_error',
      elapsed_ms: 0,
    };
    args.attempts.push(record);
    args.checkpoint();
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': args.apiKey },
        body: JSON.stringify(body),
      });
      record.status = response.status;
      record.elapsed_ms = Date.now() - started;
      args.checkpoint();
      if (response.ok) return { httpStatus: response.status, payload: await response.json() };
      const errorText = (await response.text()).slice(0, 1000);
      if (!RETRYABLE_STATUS.has(response.status) || retry === RETRY_LIMIT) {
        throw new Error(`Gemini HTTP ${response.status}: ${errorText}`);
      }
      await new Promise((resolve) => setTimeout(resolve, retryAfterMs(response, retry)));
    } catch (error) {
      record.elapsed_ms = Date.now() - started;
      args.checkpoint();
      if (error instanceof Error && error.message.startsWith('Gemini HTTP')) throw error;
      if (retry === RETRY_LIMIT) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2_000 * 2 ** retry + Math.floor(Math.random() * 750)));
    }
  }
  throw new Error('Gemini retry loop exhausted');
}

function deterministicReviewReasons(item: Classification, context: ExerciseContext) {
  const reasons: string[] = [];
  if (item.confidence < 0.9) reasons.push('confidence_below_0.90');
  if (item.requires_human_review) reasons.push('llm_requires_human_review');
  const joined = JSON.stringify({
    slug: context.slug, name: context.name, name_vi: context.name_vi,
    equipment: context.equipment, instructions: context.instructions,
  }).toLowerCase();
  if (/\b(carry|farmer'?s?|suitcase walk|loaded walk)\b/.test(joined)) reasons.push('loaded_carry_contract_gap');
  if (item.load_basis === 'assistance' && /\b(resistance band|equipment[^}]*band)\b/.test(joined) && !/machine/.test(joined)) {
    reasons.push('non_numeric_band_assistance');
  }
  if (item.default_tracking_mode === 'duration_distance' && !/(run|walk|crawl|bike|cycle|row|elliptical|treadmill|ergometer|swim|locomotion)/.test(joined)) {
    reasons.push('distance_mode_without_locomotion_signal');
  }
  if (item.load_basis !== 'none' && !item.allowed_tracking_modes.includes('weight_reps')) reasons.push('load_without_weight_mode');
  return [...new Set(reasons)];
}

function groupCounts(values: string[]) {
  return Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((candidate) => candidate === value).length]));
}

function summarize(classifications: Classification[], contexts: ExerciseContext[], attempts: AttemptRecord[], startedAt: string) {
  const contextBySlug = new Map(contexts.map((context) => [context.slug, context]));
  const review = classifications.flatMap((item) => {
    const reasons = deterministicReviewReasons(item, contextBySlug.get(item.slug)!);
    return reasons.length ? [{ ...item, review_reasons: reasons }] : [];
  });
  const confidences = classifications.map((item) => item.confidence);
  const attemptStarts = attempts.map((attempt) => attempt.started_at);
  return {
    total: classifications.length,
    default_mode_distribution: groupCounts(classifications.map((item) => item.default_tracking_mode)),
    allowed_modes_distribution: groupCounts(classifications.map((item) => [...item.allowed_tracking_modes].sort().join('+'))),
    load_basis_distribution: groupCounts(classifications.map((item) => item.load_basis)),
    confidence_bands: {
      '0.95-1.00': confidences.filter((value) => value >= 0.95).length,
      '0.90-0.949': confidences.filter((value) => value >= 0.9 && value < 0.95).length,
      'below_0.90': confidences.filter((value) => value < 0.9).length,
    },
    review_count: review.length,
    request_attempts: attempts.length,
    primary_requests: attempts.filter((attempt) => attempt.kind === 'primary').length,
    transport_retries: attempts.filter((attempt) => attempt.kind === 'transport_retry').length,
    validation_reruns: attempts.filter((attempt) => attempt.kind === 'validation_rerun').length,
    rate_violations: rollingRateViolations(attemptStarts, 12),
    min_attempt_gap_ms: attemptStarts.length < 2 ? null : Math.min(...attemptStarts.slice(1).map((value, index) => new Date(value).getTime() - new Date(attemptStarts[index]).getTime())),
    elapsed_seconds: Math.round((Date.now() - new Date(startedAt).getTime()) / 1000),
    review,
  };
}

async function main() {
  const cwd = process.cwd();
  loadEnvFile(path.join(cwd, '.env.local'));
  const options = parseOptions(process.argv.slice(2));
  const apiKey = process.env.GEMINI_API_KEY ?? '';
  const databaseUrl = process.env.DATABASE_URL ?? '';
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (!options.dryRun && !apiKey) throw new Error('GEMINI_API_KEY is required');
  const secrets = [apiKey, databaseUrl];
  const artifactRoot = path.join(cwd, 'artifacts', 'workout-metrics-classification', options.runId);
  const batchRoot = path.join(artifactRoot, 'batches');
  mkdirSync(batchRoot, { recursive: true });
  const logPath = path.join(artifactRoot, 'run.log');
  const log = (message: string) => {
    const safe = redact(message, secrets).replace(/\u2014/g, '-');
    writeFileSync(logPath, `${new Date().toISOString()} ${safe}\n`, { encoding: 'utf8', flag: 'a' });
    console.log(safe);
  };

  const liveRows = await readLiveCatalog(databaseUrl);
  const selectedRows = options.limit ? liveRows.slice(0, options.limit) : liveRows;
  const local = buildLocalCatalog(path.join(cwd, 'data', 'exercises'));
  const contexts = selectedRows.map((row) => {
    const source = local.get(row.slug);
    if (!source) throw new Error(`Live slug has no local canonical context: ${row.slug}`);
    const context = contextFor(row.slug, source, row.workout_role);
    validateContext(context);
    return context;
  });
  const batches = Array.from({ length: Math.ceil(contexts.length / options.batchSize) }, (_, index) => contexts.slice(index * options.batchSize, (index + 1) * options.batchSize));
  const now = new Date().toISOString();
  const progressPath = path.join(artifactRoot, 'progress.json');
  let progress: Progress = options.resume && existsSync(progressPath)
    ? JSON.parse(readFileSync(progressPath, 'utf8')) as Progress
    : { run_id: options.runId, model: MODEL, completed_batches: [], classifications: [], attempts: [], started_at: now, updated_at: now };
  if (progress.model !== MODEL) throw new Error(`Resume model mismatch: ${progress.model}`);
  const checkpoint = () => {
    progress.updated_at = new Date().toISOString();
    atomicJson(progressPath, progress);
  };

  atomicJson(path.join(artifactRoot, 'input-catalog.json'), {
    source: 'supabase public.exercises read-only joined to local canonical JSON',
    live_catalog_count: liveRows.length,
    selected_count: contexts.length,
    exercises: contexts,
  });
  atomicJson(path.join(artifactRoot, 'manifest.json'), {
    run_id: options.runId,
    created_at: now,
    model: MODEL,
    prompt_version: PROMPT_VERSION,
    batch_size: options.batchSize,
    requests_per_minute: options.rpm,
    minimum_attempt_gap_ms: MIN_ATTEMPT_GAP_MS,
    live_catalog_count: liveRows.length,
    selected_count: contexts.length,
    source_catalog_ref: 'Supabase public.exercises ordered by slug, read-only transaction',
    dry_run: options.dryRun,
    response_json_schema: RESPONSE_JSON_SCHEMA,
  });
  batches.forEach((batch, index) => atomicJson(path.join(batchRoot, `batch-${String(index + 1).padStart(3, '0')}-input.json`), {
    batch_number: index + 1,
    model: MODEL,
    prompt_version: PROMPT_VERSION,
    system_prompt: SYSTEM_PROMPT,
    exercises: batch,
  }));
  log(`Catalog live=${liveRows.length} selected=${contexts.length} batches=${batches.length} model=${MODEL}`);
  if (options.dryRun) {
    checkpoint();
    atomicJson(path.join(artifactRoot, 'summary.json'), { dry_run: true, selected_count: contexts.length, batch_count: batches.length });
    log('Dry run complete. No Gemini request and no Supabase mutation.');
    return;
  }

  const limiter = new RateLimiter(options.rpm, progress.attempts.map((attempt) => attempt.started_at));
  const completed = new Set(progress.completed_batches);
  const classifications = new Map(progress.classifications.map((item) => [item.slug, item]));
  for (let index = 0; index < batches.length; index += 1) {
    const batchNumber = index + 1;
    if (completed.has(batchNumber)) {
      log(`Batch ${batchNumber}/${batches.length} skipped from checkpoint`);
      continue;
    }
    const batch = batches[index];
    let accepted: Classification[] | null = null;
    let responseEvidence: unknown[] = [];
    let correction: string | undefined;
    for (let validationRun = 0; validationRun < 2 && !accepted; validationRun += 1) {
      const response = await callGemini({
        apiKey, contexts: batch, batchNumber, limiter, attempts: progress.attempts,
        validationRerun: validationRun === 1, correction, checkpoint,
      });
      const text = responseText(response.payload);
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch (error) { parsed = { parse_error: error instanceof Error ? error.message : String(error), raw_text: text }; }
      responseEvidence.push({ validation_run: validationRun + 1, http_status: response.httpStatus, structured_response: parsed });
      try {
        accepted = validateBatch(parsed, batch.map((item) => item.slug));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        correction = `The previous response failed validation. Correct every listed issue and return the full batch again. Validation error: ${message}`;
        log(`Batch ${batchNumber} validation run ${validationRun + 1} failed: ${message}`);
      }
    }
    atomicJson(path.join(batchRoot, `batch-${String(batchNumber).padStart(3, '0')}-response.json`), {
      batch_number: batchNumber, model: MODEL, attempts: responseEvidence, accepted,
    });
    if (!accepted) throw new Error(`Batch ${batchNumber} remained invalid after one rerun`);
    for (const item of accepted) classifications.set(item.slug, item);
    completed.add(batchNumber);
    progress.completed_batches = [...completed].sort((a, b) => a - b);
    progress.classifications = [...classifications.values()].sort((a, b) => a.slug.localeCompare(b.slug));
    checkpoint();
    log(`Batch ${batchNumber}/${batches.length} accepted, classified=${classifications.size}`);
  }

  const finalClassifications = validateBatch({ classifications: [...classifications.values()] }, contexts.map((context) => context.slug));
  const summary = summarize(finalClassifications, contexts, progress.attempts, progress.started_at);
  const reviewQueue = summary.review;
  const publicSummary = { ...summary, review: undefined };
  atomicJson(path.join(artifactRoot, 'summary.json'), publicSummary);
  atomicJson(path.join(artifactRoot, 'review-queue.json'), {
    generated_at: new Date().toISOString(), model: MODEL, count: reviewQueue.length, classifications: reviewQueue,
  });
  if (contexts.length === liveRows.length && !options.limit) {
    atomicJson(path.join(cwd, 'data', 'exercise-taxonomy', 'workout-metrics-llm-classification.json'), {
      schema_version: '1.0.0',
      generated_at: new Date().toISOString(),
      model: MODEL,
      batch_size: options.batchSize,
      requests_per_minute: options.rpm,
      live_catalog_count: liveRows.length,
      source_catalog_ref: `artifacts/workout-metrics-classification/${options.runId}/input-catalog.json`,
      prompt_version: PROMPT_VERSION,
      classifications: finalClassifications,
    });
  }
  log(`Complete total=${finalClassifications.length} review=${reviewQueue.length} attempts=${progress.attempts.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    const raw = error instanceof Error ? error.message : String(error);
    const safe = redact(raw, [process.env.GEMINI_API_KEY ?? '', process.env.DATABASE_URL ?? '']).replace(/\u2014/g, '-');
    console.error(`Classification failed: ${safe}`);
    process.exitCode = 1;
  });
}
