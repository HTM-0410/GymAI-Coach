import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPerceivedEffort,
  perceivedEffortFromRir,
  readLegacyPerceivedEffort,
  resolvePerceivedEffort,
  stripLegacyPerceivedEffortNote,
} from '../src/lib/workouts/perceived-effort';

test('accepts only the four supported perceived effort values', () => {
  assert.equal(isPerceivedEffort('too_hard'), true);
  assert.equal(isPerceivedEffort('hard'), true);
  assert.equal(isPerceivedEffort('appropriate'), true);
  assert.equal(isPerceivedEffort('easy'), true);
  assert.equal(isPerceivedEffort('very_hard'), false);
  assert.equal(isPerceivedEffort(null), false);
});

test('maps RIR to perceived effort using the V1 boundaries', () => {
  assert.equal(perceivedEffortFromRir(-1), 'too_hard');
  assert.equal(perceivedEffortFromRir(0), 'too_hard');
  assert.equal(perceivedEffortFromRir(1), 'hard');
  assert.equal(perceivedEffortFromRir(2), 'appropriate');
  assert.equal(perceivedEffortFromRir(3), 'appropriate');
  assert.equal(perceivedEffortFromRir(4), 'easy');
  assert.equal(perceivedEffortFromRir(8), 'easy');
});

test('reads only an exact valid legacy marker', () => {
  assert.equal(readLegacyPerceivedEffort('effort:hard'), 'hard');
  assert.equal(readLegacyPerceivedEffort(' effort:easy '), 'easy');
  assert.equal(readLegacyPerceivedEffort('effort:very_hard'), null);
  assert.equal(readLegacyPerceivedEffort('effort:hard additional note'), null);
  assert.equal(readLegacyPerceivedEffort('bonus'), null);
});

test('resolves effort by column, legacy note, RIR, then fallback', () => {
  assert.deepEqual(
    resolvePerceivedEffort({ perceivedEffort: 'easy', note: 'effort:hard', rir: 0 }),
    { value: 'easy', source: 'column' },
  );
  assert.deepEqual(
    resolvePerceivedEffort({ perceivedEffort: null, note: 'effort:hard', rir: 4 }),
    { value: 'hard', source: 'legacy_note' },
  );
  assert.deepEqual(
    resolvePerceivedEffort({ perceivedEffort: null, note: null, rir: 0 }),
    { value: 'too_hard', source: 'rir' },
  );
  assert.deepEqual(
    resolvePerceivedEffort({ perceivedEffort: 'invalid', note: null, rir: null }),
    { value: 'appropriate', source: 'fallback' },
  );
});

test('removes a legacy effort-only note but preserves real notes', () => {
  assert.equal(stripLegacyPerceivedEffortNote('effort:appropriate'), null);
  assert.equal(stripLegacyPerceivedEffortNote('bonus'), 'bonus');
  assert.equal(stripLegacyPerceivedEffortNote(null), null);
});
