import { createClient } from '@supabase/supabase-js';

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: ex, error } = await sb.from('exercises').select('id, slug').eq('slug', 'barbell-bench-press').maybeSingle();
  if (error) { console.error('Find error:', error); process.exit(1); }
  if (!ex) { console.error('Exercise not found'); process.exit(1); }
  console.log('Found:', ex.id);

  await sb.from('exercise_media').delete().eq('exercise_id', ex.id);
  const { error: insErr } = await sb.from('exercise_media').insert([
    { exercise_id: ex.id, media_type: 'image', url: '/exercises/demo/bench-press-main.jpg', source: 'manual', sort_order: 0 },
    { exercise_id: ex.id, media_type: 'image', url: '/exercises/demo/bench-press-side.jpg', source: 'manual', sort_order: 1 },
    { exercise_id: ex.id, media_type: 'image', url: '/exercises/demo/bench-press-top.jpg', source: 'manual', sort_order: 2 },
  ]);
  if (insErr) { console.error('Insert error:', insErr); process.exit(1); }
  console.log('Inserted 3 demo images');
}

main().catch(console.error);
