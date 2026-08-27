import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workoutPage = readFileSync('src/app/(app)/workouts/new/page.tsx', 'utf8');
const workoutForm = readFileSync('src/app/(app)/workouts/new/new-workout-form.tsx', 'utf8');
const gymPage = readFileSync('src/app/(app)/gyms/new/page.tsx', 'utf8');
const gymForm = readFileSync('src/app/(app)/gyms/new/new-gym-form.tsx', 'utf8');

test('creating a gym from workout generation returns to the workout form and selects it', () => {
  assert.match(workoutForm, /href="\/gyms\/new\?returnTo=%2Fworkouts%2Fnew"/);
  assert.match(workoutPage, /searchParams: Promise<\{ gym\?: string \| string\[\] \}>/);
  assert.match(workoutForm, /initialGymId && gyms\.some/);
  assert.match(gymPage, /requestedReturnTo === '\/workouts\/new'/);
  assert.match(gymForm, /returnTo \? `\$\{returnTo\}\?gym=/);
});
