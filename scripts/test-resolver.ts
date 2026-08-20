/**
 * TEST EQUIPMENT RESOLVER — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Test resolver với toàn bộ unknown equipment strings phát hiện được.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveEquipment, coverageReport, getCanonical } from '../data/equipment/equipment-resolver';

const ROOT = process.cwd();
const EXERCISES_DIR = path.join(ROOT, 'data/exercises');

async function main() {
  // 1. Gather ALL unique equipment strings từ exercises
  const files = (await fs.readdir(EXERCISES_DIR)).filter(
    (f) => f.endsWith('.json') && !f.endsWith('.sample.json'),
  );
  const allEquipment = new Set<string>();
  const allBySlug = new Map<string, Set<string>>();  // file slug → equipment
  for (const file of files) {
    const raw = await fs.readFile(path.join(EXERCISES_DIR, file), 'utf-8');
    const ex = JSON.parse(raw);
    const items = (ex.equipment as string[]) ?? [];
    allBySlug.set(ex.slug, new Set(items));
    for (const item of items) allEquipment.add(item);
  }

  console.log('═'.repeat(70));
  console.log('  EQUIPMENT RESOLVER TEST');
  console.log('═'.repeat(70));
  console.log(`Total unique equipment strings: ${allEquipment.size}`);
  console.log('');

  // 2. Coverage report
  const inputs = [...allEquipment];
  const report = coverageReport(inputs);
  console.log('─ Coverage ─────────────────────────────────────────────────────');
  console.log(`  Resolved:    ${report.resolved} (${((report.resolved / inputs.length) * 100).toFixed(1)}%)`);
  console.log(`  Unresolved:  ${report.unresolved.length} (${((report.unresolved.length / inputs.length) * 100).toFixed(1)}%)`);
  console.log('');
  console.log('─ By Match Type ───────────────────────────────────────────────');
  console.log(`  exact name:    ${report.byMatchedBy.name}`);
  console.log(`  alias_vi:      ${report.byMatchedBy.alias_vi}`);
  console.log(`  alias_en:      ${report.byMatchedBy.alias_en}`);
  console.log(`  fuzzy:         ${report.byMatchedBy.fuzzy}`);
  console.log('');

  // 3. Show unresolved → cần bổ sung alias
  if (report.unresolved.length > 0) {
    const grouped = new Map<string, number>();
    for (const u of report.unresolved) {
      grouped.set(u, (grouped.get(u) ?? 0) + 1);
    }
    console.log('─ Unresolved (cần thêm alias vào catalog) ─────────────────────');
    for (const [eq, count] of [...grouped.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ✗ "${eq}"  (${count} bài)`);
    }
    console.log('');
  }

  // 4. Sample 10 resolutions
  console.log('─ Sample Resolutions (first 15 inputs) ───────────────────────');
  const samples = [...allEquipment].slice(0, 15);
  for (const input of samples) {
    const r = resolveEquipment(input);
    if (r) {
      const canon = getCanonical(r.slug);
      console.log(`  "${input}"`);
      console.log(`     → slug:    ${r.slug}`);
      console.log(`     → en:      ${canon?.en}`);
      console.log(`     → vi:      ${canon?.vi}`);
      console.log(`     → via:     ${r.matchedBy} (conf ${r.confidence.toFixed(2)})`);
    } else {
      console.log(`  "${input}"  → ✗ NOT RESOLVED`);
    }
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});