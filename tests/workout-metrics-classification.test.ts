import assert from 'node:assert/strict';
import test from 'node:test';
import { MODEL, parseOptions, rollingRateViolations, validateBatch } from '../scripts/classify-workout-metrics';

const valid = (slug: string) => ({
  slug,
  default_tracking_mode: 'reps',
  allowed_tracking_modes: ['reps'],
  duration_style: null,
  load_basis: 'none',
  confidence: 0.95,
  requires_human_review: false,
  rationale: 'Dynamic bodyweight movement counted by repetitions.',
  evidence_signals: ['instructions describe repeated movement'],
});

test('locks the required model and safe defaults', () => {
  assert.equal(MODEL, 'gemini-3.5-flash-lite');
  const defaults = parseOptions([]);
  assert.deepEqual({ ...defaults, runId: '<generated>' }, {
    dryRun: false,
    resume: false,
    batchSize: 20,
    rpm: 12,
    limit: undefined,
    runId: '<generated>',
  });
  assert.throws(() => parseOptions(['--rpm', '13']), /cannot exceed 12/);
});

test('accepts an exact valid batch and sorts it', () => {
  const result = validateBatch({ classifications: [valid('b'), valid('a')] }, ['a', 'b']);
  assert.deepEqual(result.map((item) => item.slug), ['a', 'b']);
});

test('fails closed for missing, duplicate, or invented slugs', () => {
  assert.throws(() => validateBatch({ classifications: [valid('a')] }, ['a', 'b']), /missing=b/);
  assert.throws(() => validateBatch({ classifications: [valid('a'), valid('a')] }, ['a', 'b']), /duplicate=a/);
  assert.throws(() => validateBatch({ classifications: [valid('a'), valid('c')] }, ['a', 'b']), /extra=c/);
});

test('fails closed for contract invariant violations', () => {
  assert.throws(() => validateBatch({ classifications: [{ ...valid('a'), allowed_tracking_modes: ['duration'] }] }, ['a']));
  assert.throws(() => validateBatch({ classifications: [{ ...valid('a'), duration_style: 'active' }] }, ['a']));
  assert.throws(() => validateBatch({ classifications: [{ ...valid('a'), confidence: 0.8 }] }, ['a']));
});

test('detects rolling 60 second rate violations', () => {
  const start = Date.parse('2026-08-26T00:00:00.000Z');
  const safe = Array.from({ length: 12 }, (_, index) => new Date(start + index * 5_000).toISOString());
  const unsafe = [...safe, new Date(start + 59_999).toISOString()];
  assert.equal(rollingRateViolations(safe, 12).length, 0);
  assert.ok(rollingRateViolations(unsafe, 12).length > 0);
});
