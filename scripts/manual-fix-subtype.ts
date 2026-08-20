/**
 * MANUAL FIX LOW CONFIDENCE — GymAI Coach
 * ════════════════════════════════════════════════════════════════════════════════
 * Điều chỉnh 5 bài LLM classify sai logic (calf-raise → shrug, gripper → bicep curl).
 *
 * Usage: npx tsx scripts/manual-fix-subtype.ts
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CACHE_FILE = path.join(ROOT, 'data/equipment/.llm-machine-subtype-cache.json');

const FIXES: Record<string, { subtype: string; reasoning: string }> = {
  'smith-toe-raise': {
    subtype: 'smith-calf-raise',
    reasoning: 'Smith toe raise = calf raise exercise.',
  },
  'smith-standing-leg-calf-raise': {
    subtype: 'smith-calf-raise',
    reasoning: 'Smith standing calf raise.',
  },
  'smith-one-leg-floor-calf-raise': {
    subtype: 'smith-calf-raise',
    reasoning: 'Smith calf-raise một chân.',
  },
  'smith-reverse-calf-raises-0763': {
    subtype: 'smith-calf-raise',
    reasoning: 'Smith reverse calf raises.',
  },
  'smith-reverse-calf-raises-1394': {
    subtype: 'smith-calf-raise',
    reasoning: 'Smith reverse calf raises (variant).',
  },
  'smith-seated-one-leg-calf-raise': {
    subtype: 'smith-calf-raise',
    reasoning: 'Smith seated calf raise một chân.',
  },
};

async function main() {
  const raw = await fs.readFile(CACHE_FILE, 'utf-8');
  const cache = JSON.parse(raw) as Record<any, any>;

  let fixed = 0;
  for (const [slug, fix] of Object.entries(FIXES)) {
    if (cache[slug]) {
      const old = cache[slug].subtype;
      cache[slug] = {
        ...cache[slug],
        subtype: fix.subtype,
        confidence: 0.95,
        reasoning: fix.reasoning,
        source: 'manual',
      };
      console.log(`  ✓ ${slug}: ${old} → ${fix.subtype}`);
      fixed++;
    } else {
      console.log(`  ⚠ ${slug}: không có trong cache, bỏ qua`);
    }
  }

  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  console.log('');
  console.log(`Fixed: ${fixed}`);
  console.log(`Saved: ${CACHE_FILE}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});