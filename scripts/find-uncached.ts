import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// load env
try {
  const txt = readFileSync('.env.local', 'utf-8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const cached: Record<string, unknown> = JSON.parse(
  readFileSync('data/exercises/.llm-normalize-cache.json', 'utf-8'),
);
const cachedSlugs = new Set(Object.keys(cached));

(async () => {
  const { data: rows, error } = await supabase
    .from('exercises')
    .select('slug,id')
    .order('id', { ascending: true })
    .range(960, 1323);

  if (error) { console.error(error); process.exit(1); }
  const uncached = (rows ?? []).filter((r: any) => !cachedSlugs.has(r.slug));
  console.log('total range:', rows?.length, 'uncached:', uncached.length);
  console.log('first 5 uncached:', uncached.slice(0, 5).map((r: any) => r.slug));
})();