import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Next build directory is isolated only when NEXT_DIST_DIR is explicitly set', () => {
  const config = readFileSync('next.config.mjs', 'utf8');
  assert.match(config, /distDir:\s*process\.env\.NEXT_DIST_DIR\s*\|\|\s*['"]\.next['"]/);
  assert.equal((config.match(/\bdistDir\s*:/g) ?? []).length, 1);
});
