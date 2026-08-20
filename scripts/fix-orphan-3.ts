/**
 * FIX ORPHAN DUAL ENTRIES — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Fix 3 file JSON có dual entry "Weight Belt" mà catalog chỉ resolve về "dip-belt"
 * vì cùng name_vi "Đai đeo tạ".
 *
 * Lý do: catalog có 2 entries:
 *   - dip-belt    (Đai đeo tạ) — đai da/vải quấn hông
 *   - weight-belt (Đai đeo tạ) — alias khác cho cùng concept
 *
 * 3 file hiện tại dùng cho crunch/plank/side-bend (core workout) → dùng dip-belt OK.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EXERCISES_DIR = path.join(ROOT, 'data/exercises');

const TARGETS = [
  'weighted-crunch',
  'weighted-front-plank',
  'weighted-side-bend-on-stability-ball',
];

async function main() {
  for (const slug of TARGETS) {
    const filePath = path.join(EXERCISES_DIR, `${slug}.json`);
    const raw = await fs.readFile(filePath, 'utf-8');
    const ex = JSON.parse(raw);

    ex.equipment = [{ vi: 'Đai đeo tạ', en: 'Dip Belt' }];
    await fs.writeFile(filePath, JSON.stringify(ex, null, 2) + '\n', 'utf-8');
    console.log(`✓ ${slug}: Weight Belt → Dip Belt`);
  }
  console.log('');
  console.log('3 files updated.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});