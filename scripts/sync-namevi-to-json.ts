/**
 * SYNC name_vi → JSON
 * Đồng bộ name_vi đã rename trên DB về lại file JSON trong data/exercises/.
 * Chạy 1 lần sau khi đổi tên trên DB để JSON là source-of-truth mới.
 *
 * Idempotent: re-run OK.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

try {
  const txt = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DATA_DIR = join(process.cwd(), 'data', 'exercises');
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase env');
  process.exit(1);
}

async function main() {
  const supa = createSupabase(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  // Fetch all system exercises (name_vi + slug)
  const { data: rows, error } = await supa
    .from('exercises')
    .select('slug, name_vi, content_json')
    .eq('type', 'system')
    .is('owner_user_id', null);

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  for (const row of rows ?? []) {
    const filePath = join(DATA_DIR, `${row.slug}.json`);
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      skipped++;
      continue; // JSON không có trên disk (vd do tạo thủ công trên DB)
    }

    const json = JSON.parse(raw);
    if (json.name_vi === row.name_vi) continue; // đã đồng bộ

    json.name_vi = row.name_vi;
    // Cập nhật content_json.name_vi nếu có
    if (json.content_json && typeof json.content_json === 'object') {
      json.content_json.name_vi = row.name_vi;
    }
    // Cập nhật media_metadata.last_updated cho biết sync mới
    if (json.media_metadata) {
      json.media_metadata.last_updated = new Date().toISOString().slice(0, 10);
    }

    if (DRY_RUN) {
      console.log(`[dry-run] ${row.slug}: ${row.name_vi}`);
    } else {
      await fs.writeFile(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
      console.log(`✓ ${row.slug}: ${row.name_vi}`);
    }
    updated++;
  }

  console.log(`\n${DRY_RUN ? '[DRY-RUN]' : ''} Updated: ${updated} files | Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});