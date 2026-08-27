import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  getSetDraftStorageKey,
  parseSetDraftCache,
  serializeSetDraftCache,
} from '../src/lib/workouts/set-draft-cache';

test('set draft cache restores unfinished logger input by set id', () => {
  const now = 1_700_000_000_000;
  const raw = serializeSetDraftCache(
    { weight: 32.5, reps: 9, effort: 'hard' },
    now,
  );

  assert.equal(getSetDraftStorageKey('set-123'), 'gym-ai:workout-set-draft:set-123');
  assert.deepEqual(parseSetDraftCache(raw, now), {
    version: 1,
    weight: 32.5,
    reps: 9,
    effort: 'hard',
    updatedAt: now,
  });
});

test('set draft cache rejects malformed, stale and future data', () => {
  const now = 1_700_000_000_000;
  const valid = serializeSetDraftCache({ weight: 20, reps: 8, effort: 'appropriate' }, now);
  assert.equal(parseSetDraftCache('{bad json', now), null);
  assert.equal(parseSetDraftCache(valid, now + 8 * 24 * 60 * 60 * 1000), null);
  assert.equal(parseSetDraftCache(valid, now - 61_000), null);
  assert.equal(parseSetDraftCache(JSON.stringify({ version: 1, weight: -1, reps: 8, effort: 'easy', updatedAt: now }), now), null);
});

test('current set logger wires cache restore and persistence', () => {
  const source = readFileSync('src/app/(app)/workouts/[id]/components/current-set-logger.tsx', 'utf8');
  assert.match(source, /window\.localStorage\.getItem\(storageKey\)/);
  assert.match(source, /window\.localStorage\.setItem\(storageKey, serializeSetDraftCache/);
  assert.match(source, /getSetDraftStorageKey\(activeSet\.id\)/);
});
