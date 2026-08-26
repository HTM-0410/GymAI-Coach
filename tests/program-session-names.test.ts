import assert from 'node:assert/strict';
import test from 'node:test';
import { getSessionName, getShortSessionName, stripSessionPrefix } from '../src/lib/programs/utils';

test('stripSessionPrefix handles Vietnamese and English dash/em-dash/colon prefixes', () => {
  assert.equal(stripSessionPrefix('Buổi 1 \u2014 Ngực & Tay sau'), 'Ngực & Tay sau');
  assert.equal(stripSessionPrefix('Buổi 1 \u2013 Lưng & Tay trước'), 'Lưng & Tay trước');
  assert.equal(stripSessionPrefix('Buổi 1 - Đẩy (Push)'), 'Đẩy (Push)');
  assert.equal(stripSessionPrefix('Buổi 1: Chân & Bụng'), 'Chân & Bụng');
  assert.equal(stripSessionPrefix('Buổi tập 2 - Vai & Tay'), 'Vai & Tay');
  assert.equal(stripSessionPrefix('Day 1 \u2014 Upper Body Power'), 'Upper Body Power');
  assert.equal(stripSessionPrefix('Day 1 - Push'), 'Push');
  assert.equal(stripSessionPrefix('Day 1: Chest & Triceps'), 'Chest & Triceps');
  assert.equal(stripSessionPrefix('Workout A - Squat, Bench, Row'), 'Squat, Bench, Row');
  assert.equal(stripSessionPrefix('Buổi A \u2014 Ngực, Vai, Tay Sau'), 'Ngực, Vai, Tay Sau');
});

test('getSessionName returns clean session title when localized has session prefix', () => {
  assert.equal(
    getSessionName('Buổi 1 \u2014 Ngực & Tay sau', 'Day 1 \u2014 Chest & Triceps'),
    'Ngực & Tay sau',
  );
  assert.equal(
    getSessionName('Buổi 2 \u2014 Lưng, Cầu vai & Tay trước', 'Day 2 \u2014 Back, Traps & Biceps'),
    'Lưng, Cầu vai & Tay trước',
  );
  assert.equal(
    getSessionName('Buổi 3 \u2014 Chân & Bụng', 'Day 3 \u2014 Legs & Abs'),
    'Chân & Bụng',
  );
});

test('getSessionName falls back to cleaned fallbackName when localized is generic Buổi 1', () => {
  assert.equal(
    getSessionName('Buổi 1', 'Day 1 \u2014 Upper Body'),
    'Upper Body',
  );
  assert.equal(
    getSessionName(null, 'Day 1 - Push Focus'),
    'Push Focus',
  );
  assert.equal(
    getSessionName('Buổi 1', 'Day 1'),
    'Buổi 1',
  );
});

test('getShortSessionName strips parenthesized notes', () => {
  assert.equal(
    getShortSessionName('Buổi 1 - Đẩy (Push Focus)', 'Day 1 - Push Focus'),
    'Đẩy',
  );
  assert.equal(
    getShortSessionName('Buổi 1 \u2014 Ngực & Tay sau (Heavy)', 'Day 1 \u2014 Chest (Heavy)'),
    'Ngực & Tay sau',
  );
});
