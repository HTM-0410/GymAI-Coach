/**
 * LIST 22 AMBIGUOUS ENTRIES — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Liệt kê 22 entries hiện đang ghi "weighted" hoặc "assisted" mà resolver không match.
 * Đề xuất mapping cho từng entry dựa trên slug + name.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EXERCISES_DIR = path.join(ROOT, 'data/exercises');

interface Exercise {
  slug: string;
  name: string;
  name_vi: string;
  primary_muscle: string;
  equipment: string[];
}

async function main() {
  const files = (await fs.readdir(EXERCISES_DIR)).filter(
    (f) => f.endsWith('.json') && !f.endsWith('.sample.json'),
  );

  const weighted: Exercise[] = [];
  const assisted: Exercise[] = [];

  for (const file of files) {
    const raw = await fs.readFile(path.join(EXERCISES_DIR, file), 'utf-8');
    const ex = JSON.parse(raw) as Exercise;
    const eq = ex.equipment ?? [];

    if (eq.includes('weighted')) weighted.push(ex);
    if (eq.includes('assisted')) assisted.push(ex);
  }

  console.log('═'.repeat(70));
  console.log('  22 ENTRIES CÒN LẠI — CẦN MANUAL MAPPING');
  console.log('═'.repeat(70));
  console.log('');

  console.log('─ 1. "weighted" (18 bài) ──────────────────────────────────────');
  console.log('  Gợi ý mapping dựa trên slug pattern:');
  console.log('    weight-belt:    weighted sit-up, weighted crunch, weighted side-bend,');
  console.log('                    weighted plank variations');
  console.log('    weight-vest:    weighted pull-up, weighted chin-up, weighted dip,');
  console.log('                    weighted push-up, weighted squat, weighted calf');
  console.log('    weight-plate:   weighted front raise, weighted round arm,');
  console.log('                    weighted overhead crunch');
  console.log('    ankle-weight:   weighted lying leg curl, weighted leg lift,');
  console.log('                    weighted donkey calf raise');
  console.log('    dumbbell:       weighted cossack squat, weighted lunge with swing');
  console.log('    kettlebell:     weighted kneeling step with swing');
  console.log('    medicine-ball:  weighted russian twist');
  console.log('    bodyweight:     otis-up (weighted sit-up, không dụng cụ)');
  console.log('');

  for (const ex of weighted) {
    const suggestion = suggestWeighted(ex);
    console.log(`  • ${ex.slug.padEnd(45)} → ${suggestion}`);
  }
  console.log('');

  console.log('─ 2. "assisted" (4 bài) ──────────────────────────────────────');
  console.log('  Gợi ý: pull-up assisted machine hoặc partner-assisted = bodyweight');
  console.log('');

  for (const ex of assisted) {
    const suggestion = suggestAssisted(ex);
    console.log(`  • ${ex.slug.padEnd(45)} → ${suggestion}`);
  }
  console.log('');
}

function suggestWeighted(ex: Exercise): string {
  const slug = ex.slug.toLowerCase();
  const name = ex.name.toLowerCase();
  const nameVi = ex.name_vi.toLowerCase();

  // Bodyweight category (no equipment besides body)
  if (slug.includes('otis-up')) return 'bodyweight (Otis-up chỉ dùng cơ thể)';

  // Medicine ball
  if (slug.includes('russian-twist') || name.includes('russian twist')) {
    return 'medicine-ball';
  }

  // Kettlebell
  if (slug.includes('kneeling-step-with-swing') || slug.includes('lunge-with-swing')) {
    return 'kettlebell';
  }

  // Dumbbell
  if (slug.includes('cossack') || slug.includes('hold-and-rotate')) {
    return 'dumbbell';
  }

  // Weight plate (held)
  if (slug.includes('front-raise') || slug.includes('round-arm') || slug.includes('overhead-crunch')) {
    return 'weight-plate';
  }

  // Ankle weight (legs)
  if (
    slug.includes('leg-curl') ||
    slug.includes('leg-lift') ||
    slug.includes('donkey-calf-raise') ||
    slug.includes('straight-leg') ||
    slug.includes('lying-leg')
  ) {
    return 'ankle-weight';
  }

  // Weight belt (core/ab work)
  if (
    slug.includes('crunch') ||
    slug.includes('sit-up') ||
    slug.includes('plank') ||
    slug.includes('side-bend') ||
    slug.includes('russian-twist')
  ) {
    return 'weight-belt';
  }

  // Weight vest (bodyweight exercises)
  if (
    slug.includes('pull-up') ||
    slug.includes('chin-up') ||
    slug.includes('dip') ||
    slug.includes('push-up') ||
    slug.includes('squat') ||
    slug.includes('lung') ||
    slug.includes('calf-raise') ||
    slug.includes('muscle-up') ||
    slug.includes('hyperextension')
  ) {
    return 'weight-vest';
  }

  return '? (cần xem chi tiết)';
}

function suggestAssisted(ex: Exercise): string {
  const slug = ex.slug.toLowerCase();
  const name = ex.name.toLowerCase();

  // Pull-up / chin-up assisted
  if (
    slug.includes('pull-up') ||
    slug.includes('chin-up') ||
    name.includes('pull up') ||
    name.includes('pullup')
  ) {
    return 'assisted-pull-up-machine';
  }

  // Default: bodyweight (partner-assisted)
  return 'bodyweight (partner-assisted)';
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});