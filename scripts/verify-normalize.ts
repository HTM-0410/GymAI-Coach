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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) { console.error('missing env', { url: !!url, key: !!key }); process.exit(2); }
  const c = createClient(url, key, { auth: { persistSession: false } });

  const fetchIds = async (q: any) => {
    const all: string[] = [];
    let from = 0, step = 1000;
    while (true) {
      const { data, error } = await q.range(from, from + step - 1);
      if (error) { console.error('range err', error); break; }
      if (!data || data.length === 0) break;
      all.push(...data.map((r: any) => r.id));
      if (data.length < step) break;
      from += step;
    }
    return all;
  };

  const totalIds = await fetchIds(c.from('exercises').select('id'));
  const normalizedIds = await fetchIds(c.from('exercises').select('id').not('llm_normalized_at', 'is', null));
  const searchIds = await fetchIds(c.from('exercises').select('id').not('search_text', 'is', null));
  const noisyIds = await fetchIds(c.from('exercises').select('id').or('search_text.is.null,llm_normalized_at.is.null'));

  console.log(JSON.stringify({
    total: totalIds.length,
    normalized: normalizedIds.length,
    withSearch: searchIds.length,
    still_noisy: noisyIds.length,
  }, null, 2));

  // Sample latest 3 normalized rows
  const { data: sample } = await c.from('exercises')
    .select('id, slug, name_vi, search_text, llm_normalized_at, llm_normalized_model')
    .not('llm_normalized_at', 'is', null)
    .order('llm_normalized_at', { ascending: false })
    .limit(3);
  console.log('--- latest 3 normalized ---');
  console.log(JSON.stringify(sample, null, 2));

  // Quick quality check on search_text content
  const { data: emptySearch } = await c.from('exercises')
    .select('id,slug,name_vi')
    .not('llm_normalized_at', 'is', null)
    .or('search_text.is.null,search_text.eq.""')
    .limit(5);
  console.log('--- normalized but search_text empty (should be small/0) ---');
  console.log(JSON.stringify(emptySearch, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });