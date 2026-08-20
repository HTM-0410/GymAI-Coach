import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const [k, ...rest] = line.split('=');
  if (k && rest.length) env[k.trim()] = rest.join('=').trim();
}

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL']!, env['SUPABASE_SERVICE_ROLE_KEY']!);

// Machine exercises only - bench is integrated in the machine design
const SLUGS: string[] = [
  // Cable machines
  "cable-bar-lateral-pulldown","cable-bench-press","cable-concentration-curl",
  "cable-decline-fly","cable-decline-one-arm-press","cable-decline-press",
  "cable-decline-seated-wide-grip-row","cable-incline-bench-press","cable-incline-bench-row",
  "cable-incline-fly","cable-incline-pushdown","cable-incline-triceps-extension",
  "cable-kneeling-triceps-extension","cable-lateral-pulldown-with-rope-attachment",
  "cable-lateral-pulldown-with-v-bar","cable-low-seated-row","cable-lying-bicep-curl",
  "cable-lying-close-grip-curl","cable-lying-extension-pullover-with-rope-attachment",
  "cable-lying-fly","cable-one-arm-decline-chest-fly","cable-one-arm-incline-press",
  "cable-pulldown","cable-pulldown-bicep-curl","cable-pulldown-pro-lat-bar",
  "cable-rear-delt-row-stirrups","cable-rear-pulldown",
  "cable-reverse-grip-straight-back-seated-high-row","cable-reverse-wrist-curl",
  "cable-rope-crossover-seated-row","cable-rope-elevated-seated-row",
  "cable-rope-extension-incline-bench-row","cable-rope-incline-tricep-extension",
  "cable-rope-seated-row","cable-seated-chest-press","cable-seated-crunch",
  "cable-seated-curl","cable-seated-high-row-v-bar","cable-seated-one-arm-alternate-row",
  "cable-seated-one-arm-concentration-curl","cable-seated-overhead-curl",
  "cable-seated-rear-lateral-raise","cable-seated-row","cable-seated-twist",
  "cable-seated-wide-grip-row","cable-standing-calf-raise",
  "cable-straight-back-seated-row","cable-supine-reverse-fly",
  "cable-two-arm-curl-on-incline-bench","cable-underhand-pulldown",
  "cable-upper-row","cable-wide-grip-rear-pulldown-behind-neck","cable-wrist-curl",
  "cable-assisted-inverse-leg-curl",
  // Smith machines
  "smith-machine-decline-close-grip-bench-press","smith-machine-incline-tricep-extension",
  "smith-machine-reverse-decline-close-grip-bench-press",
  "smith-reverse-grip-press","smith-seated-one-leg-calf-raise",
  "smith-seated-shoulder-press","smith-seated-wrist-curl",
  "smith-shoulder-press","smith-single-leg-split-squat",
  // Lever machines
  "lever-back-extension","lever-hip-extension-v-2",
  "lever-horizontal-one-leg-press","lever-kneeling-leg-curl","lever-kneeling-twist",
  // Lat pulldown machines
  "reverse-grip-machine-lat-pulldown","twin-handle-parallel-grip-lat-pulldown",
  // Sissy squat machine
  "sissy-squat",
];

const unique = [...new Set(SLUGS)];
console.log(`Removing bench from ${unique.length} exercises...`);

const benchTags = ['Ghế tập phẳng','Ghế tập nghiêng','Ghế tập nghiêng dưới',
  'Ghế tập bụng','Ghế preacher','Ghế hyperextension'];

(async () => {
  let ok = 0, skip = 0, fail = 0;
  for (const slug of unique) {
    const { data, error: fetchErr } = await supabase
      .from('exercises')
      .select('equipment_vi')
      .eq('slug', slug)
      .eq('type', 'system')
      .single();

    if (fetchErr || !data) {
      console.log(`  SKIP ${slug}: not found`);
      continue;
    }

    const current = data.equipment_vi ?? [];
    const hasBench = benchTags.some(t => current.includes(t));
    if (!hasBench) {
      console.log(`  OK-SKIP ${slug}: no bench tag`);
      skip++;
      continue;
    }

    const updated = current.filter(t => !benchTags.includes(t));
    const { error } = await supabase
      .from('exercises')
      .update({ equipment_vi: updated })
      .eq('slug', slug)
      .eq('type', 'system');

    if (error) {
      console.log(`  FAIL ${slug}: ${error.message}`);
      fail++;
    } else {
      ok++;
    }
  }

  console.log(`\nDone. ${ok} removed, ${skip} had no bench, ${fail} failed.`);
})();
