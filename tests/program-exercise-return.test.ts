import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const viewer = readFileSync('src/components/programs/program-days-viewer.tsx', 'utf8');
const programPage = readFileSync('src/app/(app)/programs/[id]/page.tsx', 'utf8');
const exercisePage = readFileSync('src/app/(app)/exercises/[slug]/page.tsx', 'utf8');

test('program exercise detail returns to the selected program day', () => {
  assert.match(viewer, /returnTo=\$\{encodeURIComponent\(`\/programs\/\$\{programId\}\?day=\$\{dayIdx\}#day-\$\{dayIdx \+ 1\}`\)\}/);
  assert.match(viewer, /initialDayIndex\?: number/);
  assert.match(programPage, /searchParams: Promise<\{ day\?: string \| string\[\] \}>/);
  assert.match(programPage, /initialDayIndex=\{Number\.isInteger\(parsedDay\) \? parsedDay : 0\}/);
  assert.match(exercisePage, /safeReturnPath/);
  assert.match(exercisePage, /Quay Lại Giáo Án/);
});
