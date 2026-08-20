import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

try {
  const txt = readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const c = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await c
    .from('exercises')
    .select('id,slug,name,name_vi')
    .eq('type', 'system')
    .eq('status', 'published')
    .is('owner_user_id', null)
    .not('name_vi', 'is', null)
    .order('name_vi', { ascending: true })
    .limit(40);
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
