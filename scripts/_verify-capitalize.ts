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

function looksTitleCase(s: string): boolean {
  if (!s) return true;
  // split by whitespace + hyphen, keep separators
  const toks = s.split(/(\s+|-)/);
  for (const t of toks) {
    if (!t || /^(\s+|-)$/.test(t) || /^[\d\W_]+$/.test(t)) continue;
    const firstLetterIdx = t.search(/\p{L}/u);
    if (firstLetterIdx < 0) continue;
    const head = t.charAt(firstLetterIdx);
    const next1 = t.charAt(firstLetterIdx + 1) || '';
    const next2 = t.charAt(firstLetterIdx + 2) || '';
    const headUp = head === head.toUpperCase() && head !== head.toLowerCase();
    const n1Up = next1 && next1 === next1.toUpperCase() && next1 !== next1.toLowerCase();
    const n2Up = next2 && next2 === next2.toUpperCase() && next2 !== next2.toLowerCase();
    // acronym >=3 IN HOA liên tiếp → bỏ qua
    if (headUp && n1Up && n2Up) continue;
    if (!headUp) return false;
  }
  return true;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const c = createClient(url, key, { auth: { persistSession: false } });

  const PAGE = 1000;
  const all: { id: string; slug: string; name_vi: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await c.from('exercises')
      .select('id, slug, name_vi')
      .eq('type', 'system')
      .eq('status', 'published')
      .is('owner_user_id', null)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if ((data ?? []).length < PAGE) break;
  }

  const withVi = all.filter((r) => r.name_vi);
  const notTC = withVi.filter((r) => !looksTitleCase(r.name_vi!));

  console.log(JSON.stringify({
    total: all.length,
    with_name_vi: withVi.length,
    title_case_ok: withVi.length - notTC.length,
    not_title_case: notTC.length,
  }, null, 2));

  if (notTC.length > 0) {
    console.log('\n--- rows NOT Title Case ---');
    console.log(JSON.stringify(notTC.slice(0, 20), null, 2));
  }

  // Sample 8 random rows to show current state
  const sample = withVi.slice(40, 48);
  console.log('\n--- sample current state ---');
  console.log(JSON.stringify(sample, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
