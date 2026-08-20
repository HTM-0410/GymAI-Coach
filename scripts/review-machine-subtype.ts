/**
 * REVIEW MACHINE SUBTYPE CACHE — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Review kết quả LLM classify trước khi apply.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CACHE_FILE = path.join(ROOT, 'data/equipment/.llm-machine-subtype-cache.json');

interface SubtypeCacheEntry {
  slug: string;
  subtype: string;
  confidence: number;
  reasoning: string;
  source: string;
}

async function main() {
  const raw = await fs.readFile(CACHE_FILE, 'utf-8');
  const cache = JSON.parse(raw) as Record<string, SubtypeCacheEntry>;

  const entries = Object.values(cache);

  console.log('═'.repeat(70));
  console.log('  MACHINE SUBTYPE CACHE REVIEW');
  console.log('═'.repeat(70));
  console.log(`Total entries: ${entries.length}`);
  console.log('');

  // Confidence distribution
  const high = entries.filter((e) => e.confidence >= 0.9).length;
  const mid = entries.filter((e) => e.confidence >= 0.7 && e.confidence < 0.9).length;
  const low = entries.filter((e) => e.confidence < 0.7).length;
  console.log('─ Confidence ────────────────────────────────────────────────');
  console.log(`  ≥ 0.9 (high):    ${high}`);
  console.log(`  0.7-0.9 (mid):   ${mid}`);
  console.log(`  < 0.7 (low):     ${low}`);
  console.log('');

  // Sample low-confidence entries for manual review
  const lowConf = entries.filter((e) => e.confidence < 0.7).sort((a, b) => a.confidence - b.confidence);
  if (lowConf.length > 0) {
    console.log('─ Low Confidence (cần review manual) ──────────────────────────');
    for (const e of lowConf) {
      console.log(`  ⚠ ${e.slug}: ${e.subtype}  (conf ${e.confidence.toFixed(2)})`);
      console.log(`     ${e.reasoning}`);
    }
    console.log('');
  }

  // Spot-check một số entries điển hình
  console.log('─ Spot Check (10 bài tiêu biểu) ─────────────────────────────');
  const spot = ['lever-bicep-curl', 'lever-seated-row', 'lever-shoulder-press', 'lever-pulldown', 'lever-calf-raise', 'lever-triceps-extension', 'lever-seated-dip', 'lever-hip-abduction', 'lever-shrug', 'lever-pullover'];
  for (const slug of spot) {
    const e = cache[slug];
    if (e) {
      console.log(`  ${slug}`);
      console.log(`     → ${e.subtype}  (conf ${e.confidence.toFixed(2)})`);
      console.log(`     ${e.reasoning}`);
    } else {
      console.log(`  ${slug}: không có trong cache`);
    }
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});