import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)![1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)![1].trim();
const supabase = createClient(url, key);

// Helper to find exercise by keywords
async function findExerciseId(keywords: string[]): Promise<string> {
  for (const kw of keywords) {
    const { data } = await supabase
      .from('exercises')
      .select('id, name, slug')
      .or(`name.ilike.%${kw}%,slug.ilike.%${kw}%`)
      .limit(1);
    if (data && data.length > 0) {
      return data[0].id;
    }
  }
  // Fallback to first exercise
  const { data: fallback } = await supabase.from('exercises').select('id').limit(1);
  return fallback![0].id;
}

// Helper to find muscle by slug
async function getMuscleMap(): Promise<Record<string, string>> {
  const { data } = await supabase.from('muscles').select('id, slug, name_vi');
  const map: Record<string, string> = {};
  data?.forEach((m: any) => { map[m.slug] = m.id; });
  return map;
}

async function seed() {
  console.log('--- SEEDING PROGRAM DAY EXERCISES & TARGETS ---');
  const muscleMap = await getMuscleMap();
  console.log('Loaded muscles:', Object.keys(muscleMap));

  // Get all programs with their days
  const { data: programs, error: progErr } = await supabase
    .from('training_programs')
    .select('id, name, training_program_days(id, name, name_vi, order_index)')
    .order('created_at');

  if (progErr || !programs) {
    console.error('Error fetching programs:', progErr);
    return;
  }

  // Clear existing program_day_exercises and day targets to re-seed cleanly
  console.log('Clearing old day exercises and targets...');
  const dayIds = programs.flatMap(p => (p.training_program_days || []).map((d: any) => d.id));
  if (dayIds.length > 0) {
    await supabase.from('program_day_exercises').delete().in('program_day_id', dayIds);
    await supabase.from('training_day_targets').delete().in('program_day_id', dayIds);
  }

  // Pre-fetch common exercise IDs
  const exIds: Record<string, string> = {
    benchPress: await findExerciseId(['bench-press', 'barbell-bench-press', 'cable-incline-bench-press', 'db-press']),
    inclineDbPress: await findExerciseId(['incline-db-press', 'dumbbell-incline', 'incline-bench']),
    ohp: await findExerciseId(['overhead-press', 'shoulder-press', 'barbell-seated-overhead-press']),
    latRaise: await findExerciseId(['lateral-raise', 'band-front-lateral-raise', 'cable-seated-rear-lateral-raise']),
    tricepPushdown: await findExerciseId(['tricep-pushdown', 'assisted-triceps-dip', 'cable-incline-triceps-extension']),
    overheadTricepExt: await findExerciseId(['skullcrusher', 'triceps-extension', 'assisted-standing-triceps-extension']),
    deadlift: await findExerciseId(['deadlift', 'lever-deadlift', 'cable-deadlift']),
    barbellRow: await findExerciseId(['row', 'barbell-row', 'cable-seated-one-arm-alternate-row']),
    latPulldown: await findExerciseId(['lat-pulldown', 'cable-lat-pulldown-full-range-of-motion', 'reverse-grip-machine-lat-pulldown']),
    pullUp: await findExerciseId(['pull-up', 'assisted-standing-pull-up', 'assisted-parallel-close-grip-pull-up']),
    facePull: await findExerciseId(['face-pull', 'rear-lateral-raise', 'reverse-fly']),
    bicepCurl: await findExerciseId(['barbell-curl', 'bicep-curl', 'cable-lying-bicep-curl']),
    hammerCurl: await findExerciseId(['hammer-curl', 'preacher-hammer-curl', 'dumbbell-peacher-hammer-curl']),
    squat: await findExerciseId(['back-squat', 'barbell-squat', 'squat']),
    frontSquat: await findExerciseId(['front-squat', 'hack-squat', 'squat']),
    legPress: await findExerciseId(['leg-press', 'sled-45-degrees-one-leg-press']),
    rdl: await findExerciseId(['stiff-leg-deadlift', 'straight-back-stiff-leg-deadlift', 'deadlift']),
    legExtension: await findExerciseId(['leg-extension', 'lever-leg-extension', 'resistance-band-leg-extension']),
    legCurl: await findExerciseId(['leg-curl', 'lever-lying-leg-curl', 'lever-seated-leg-curl']),
    calfRaise: await findExerciseId(['calf-raise', 'lever-seated-squat-calf-raise-on-leg-press-machine', 'band-single-leg-reverse-calf-raise']),
    dip: await findExerciseId(['dip', 'assisted-wide-grip-chest-dip', 'assisted-triceps-dip']),
    fly: await findExerciseId(['cable-fly', 'dumbbell-one-arm-bench-fly', 'lever-seated-reverse-fly']),
    shrug: await findExerciseId(['shrug', 'dumbbell-shrug', 'barbell-shrug']),
    crunch: await findExerciseId(['crunch', 'negative-crunch', 'lever-seated-crunch']),
    plank: await findExerciseId(['plank', 'front-plank-with-twist', 'side-plank']),
    hangingLegRaise: await findExerciseId(['hanging-leg-raise', 'lying-leg-raise', 'leg-raise']),
    arnoldPress: await findExerciseId(['arnold-press', 'dumbbell-standing-overhead-press', 'shoulder-press']),
    preacherCurl: await findExerciseId(['preacher-curl', 'cable-one-arm-preacher-curl', 'dumbbell-peacher-hammer-curl']),
    pullover: await findExerciseId(['pullover', 'lat-pulldown', 'row'])
  };

  console.log('Mapped exercise IDs successfully.');

  for (const prog of programs) {
    const pName = prog.name;
    const days = (prog.training_program_days || []).sort((a: any, b: any) => a.order_index - b.order_index);
    console.log(`\nConfiguring Program: ${pName} (${days.length} days)`);

    for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
      const day = days[dayIdx];
      const dName = day.name.toLowerCase();
      let dayExercises: Array<{ exId: string; sets: number; minReps: number; maxReps: number; rir: number; rest: number }> = [];
      let dayTargets: Array<{ muscleSlug: string; role: string; sets: number }> = [];

      // ─── PPL ───
      if (pName.includes('Push Pull Legs') || pName.includes('PPL')) {
        if (dName.includes('push 1') || (dName.includes('push') && dayIdx === 0)) {
          dayTargets = [
            { muscleSlug: 'chest', role: 'primary', sets: 7 },
            { muscleSlug: 'shoulders', role: 'primary', sets: 6 },
            { muscleSlug: 'triceps', role: 'secondary', sets: 6 }
          ];
          dayExercises = [
            { exId: exIds.benchPress, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 150 },
            { exId: exIds.ohp, sets: 3, minReps: 6, maxReps: 8, rir: 2, rest: 120 },
            { exId: exIds.inclineDbPress, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.latRaise, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.tricepPushdown, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 }
          ];
        } else if (dName.includes('pull 1') || (dName.includes('pull') && dayIdx === 1)) {
          dayTargets = [
            { muscleSlug: 'back', role: 'primary', sets: 7 },
            { muscleSlug: 'lats', role: 'primary', sets: 6 },
            { muscleSlug: 'biceps', role: 'secondary', sets: 6 },
            { muscleSlug: 'rear_delts', role: 'secondary', sets: 3 }
          ];
          dayExercises = [
            { exId: exIds.deadlift, sets: 4, minReps: 5, maxReps: 5, rir: 2, rest: 180 },
            { exId: exIds.latPulldown, sets: 3, minReps: 8, maxReps: 10, rir: 2, rest: 90 },
            { exId: exIds.barbellRow, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.facePull, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.bicepCurl, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 }
          ];
        } else if (dName.includes('legs 1') || (dName.includes('legs') && dayIdx === 2)) {
          dayTargets = [
            { muscleSlug: 'quads', role: 'primary', sets: 7 },
            { muscleSlug: 'hamstrings', role: 'primary', sets: 6 },
            { muscleSlug: 'glutes', role: 'primary', sets: 6 },
            { muscleSlug: 'calves', role: 'secondary', sets: 4 }
          ];
          dayExercises = [
            { exId: exIds.squat, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 180 },
            { exId: exIds.rdl, sets: 3, minReps: 8, maxReps: 10, rir: 2, rest: 120 },
            { exId: exIds.legPress, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 90 },
            { exId: exIds.legExtension, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.calfRaise, sets: 4, minReps: 12, maxReps: 15, rir: 1, rest: 60 }
          ];
        } else if (dName.includes('push 2') || (dName.includes('push') && dayIdx === 3)) {
          dayTargets = [
            { muscleSlug: 'chest', role: 'primary', sets: 7 },
            { muscleSlug: 'shoulders', role: 'primary', sets: 6 },
            { muscleSlug: 'triceps', role: 'secondary', sets: 6 }
          ];
          dayExercises = [
            { exId: exIds.inclineDbPress, sets: 4, minReps: 8, maxReps: 10, rir: 2, rest: 120 },
            { exId: exIds.dip, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.fly, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.latRaise, sets: 4, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.overheadTricepExt, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 }
          ];
        } else if (dName.includes('pull 2') || (dName.includes('pull') && dayIdx === 4)) {
          dayTargets = [
            { muscleSlug: 'back', role: 'primary', sets: 7 },
            { muscleSlug: 'lats', role: 'primary', sets: 6 },
            { muscleSlug: 'biceps', role: 'secondary', sets: 6 }
          ];
          dayExercises = [
            { exId: exIds.pullUp, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 120 },
            { exId: exIds.barbellRow, sets: 3, minReps: 8, maxReps: 10, rir: 2, rest: 90 },
            { exId: exIds.latPulldown, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 90 },
            { exId: exIds.hammerCurl, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 },
            { exId: exIds.shrug, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 }
          ];
        } else {
          dayTargets = [
            { muscleSlug: 'quads', role: 'primary', sets: 6 },
            { muscleSlug: 'hamstrings', role: 'primary', sets: 6 },
            { muscleSlug: 'calves', role: 'secondary', sets: 4 },
            { muscleSlug: 'core', role: 'secondary', sets: 3 }
          ];
          dayExercises = [
            { exId: exIds.frontSquat, sets: 4, minReps: 8, maxReps: 10, rir: 2, rest: 150 },
            { exId: exIds.legCurl, sets: 4, minReps: 10, maxReps: 12, rir: 1, rest: 90 },
            { exId: exIds.legExtension, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.calfRaise, sets: 4, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.hangingLegRaise, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 }
          ];
        }
      }

      // ─── UPPER / LOWER ───
      else if (pName.includes('Upper Lower') || pName.includes('Upper / Lower')) {
        if (dName.includes('upper 1') || dName.includes('upper a') || (dName.includes('upper') && dayIdx === 0)) {
          dayTargets = [
            { muscleSlug: 'chest', role: 'primary', sets: 7 },
            { muscleSlug: 'back', role: 'primary', sets: 7 },
            { muscleSlug: 'shoulders', role: 'secondary', sets: 6 },
            { muscleSlug: 'biceps', role: 'secondary', sets: 3 },
            { muscleSlug: 'triceps', role: 'secondary', sets: 3 }
          ];
          dayExercises = [
            { exId: exIds.benchPress, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 150 },
            { exId: exIds.barbellRow, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 120 },
            { exId: exIds.ohp, sets: 3, minReps: 8, maxReps: 10, rir: 2, rest: 90 },
            { exId: exIds.latPulldown, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.bicepCurl, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 },
            { exId: exIds.tricepPushdown, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 }
          ];
        } else if (dName.includes('lower 1') || dName.includes('lower a') || (dName.includes('lower') && dayIdx === 1)) {
          dayTargets = [
            { muscleSlug: 'quads', role: 'primary', sets: 7 },
            { muscleSlug: 'hamstrings', role: 'primary', sets: 6 },
            { muscleSlug: 'glutes', role: 'primary', sets: 6 },
            { muscleSlug: 'calves', role: 'secondary', sets: 4 },
            { muscleSlug: 'core', role: 'secondary', sets: 3 }
          ];
          dayExercises = [
            { exId: exIds.squat, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 180 },
            { exId: exIds.rdl, sets: 3, minReps: 8, maxReps: 10, rir: 2, rest: 120 },
            { exId: exIds.legPress, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 90 },
            { exId: exIds.legCurl, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 },
            { exId: exIds.calfRaise, sets: 4, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.plank, sets: 3, minReps: 45, maxReps: 60, rir: 1, rest: 60 }
          ];
        } else if (dName.includes('upper 2') || dName.includes('upper b') || (dName.includes('upper') && dayIdx === 2)) {
          dayTargets = [
            { muscleSlug: 'chest', role: 'primary', sets: 6 },
            { muscleSlug: 'lats', role: 'primary', sets: 6 },
            { muscleSlug: 'side_delts', role: 'primary', sets: 4 },
            { muscleSlug: 'biceps', role: 'secondary', sets: 3 },
            { muscleSlug: 'triceps', role: 'secondary', sets: 3 }
          ];
          dayExercises = [
            { exId: exIds.inclineDbPress, sets: 4, minReps: 8, maxReps: 10, rir: 2, rest: 120 },
            { exId: exIds.pullUp, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.latRaise, sets: 4, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.fly, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.hammerCurl, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 },
            { exId: exIds.overheadTricepExt, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 }
          ];
        } else {
          dayTargets = [
            { muscleSlug: 'quads', role: 'primary', sets: 6 },
            { muscleSlug: 'hamstrings', role: 'primary', sets: 6 },
            { muscleSlug: 'glutes', role: 'primary', sets: 6 },
            { muscleSlug: 'calves', role: 'secondary', sets: 3 }
          ];
          dayExercises = [
            { exId: exIds.deadlift, sets: 3, minReps: 6, maxReps: 8, rir: 2, rest: 150 },
            { exId: exIds.frontSquat, sets: 3, minReps: 8, maxReps: 10, rir: 2, rest: 120 },
            { exId: exIds.legExtension, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.legCurl, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.calfRaise, sets: 3, minReps: 15, maxReps: 20, rir: 1, rest: 60 }
          ];
        }
      }

      // ─── FULL BODY ───
      else if (pName.includes('Full Body')) {
        if (dayIdx === 0) {
          dayTargets = [
            { muscleSlug: 'quads', role: 'primary', sets: 4 },
            { muscleSlug: 'chest', role: 'primary', sets: 4 },
            { muscleSlug: 'back', role: 'primary', sets: 4 },
            { muscleSlug: 'shoulders', role: 'secondary', sets: 3 }
          ];
          dayExercises = [
            { exId: exIds.squat, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 180 },
            { exId: exIds.benchPress, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 120 },
            { exId: exIds.latPulldown, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.latRaise, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.calfRaise, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.plank, sets: 3, minReps: 45, maxReps: 60, rir: 1, rest: 60 }
          ];
        } else if (dayIdx === 1) {
          dayTargets = [
            { muscleSlug: 'hamstrings', role: 'primary', sets: 4 },
            { muscleSlug: 'shoulders', role: 'primary', sets: 4 },
            { muscleSlug: 'back', role: 'primary', sets: 4 },
            { muscleSlug: 'biceps', role: 'secondary', sets: 3 }
          ];
          dayExercises = [
            { exId: exIds.deadlift, sets: 3, minReps: 5, maxReps: 5, rir: 2, rest: 180 },
            { exId: exIds.ohp, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 120 },
            { exId: exIds.barbellRow, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.inclineDbPress, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.bicepCurl, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 }
          ];
        } else {
          dayTargets = [
            { muscleSlug: 'quads', role: 'primary', sets: 4 },
            { muscleSlug: 'chest', role: 'primary', sets: 3 },
            { muscleSlug: 'lats', role: 'primary', sets: 3 },
            { muscleSlug: 'triceps', role: 'secondary', sets: 3 }
          ];
          dayExercises = [
            { exId: exIds.legPress, sets: 4, minReps: 8, maxReps: 10, rir: 2, rest: 120 },
            { exId: exIds.pullUp, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.dip, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.legCurl, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 },
            { exId: exIds.facePull, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 }
          ];
        }
      }

      // ─── BRO SPLIT ───
      else if (pName.includes('Bro Split')) {
        if (dName.includes('chest')) {
          dayTargets = [{ muscleSlug: 'chest', role: 'primary', sets: 14 }, { muscleSlug: 'triceps', role: 'secondary', sets: 4 }];
          dayExercises = [
            { exId: exIds.benchPress, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 150 },
            { exId: exIds.inclineDbPress, sets: 4, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.dip, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.fly, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 }
          ];
        } else if (dName.includes('back')) {
          dayTargets = [{ muscleSlug: 'back', role: 'primary', sets: 14 }, { muscleSlug: 'biceps', role: 'secondary', sets: 4 }];
          dayExercises = [
            { exId: exIds.deadlift, sets: 4, minReps: 5, maxReps: 5, rir: 2, rest: 180 },
            { exId: exIds.pullUp, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.barbellRow, sets: 4, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.latPulldown, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 }
          ];
        } else if (dName.includes('shoulders')) {
          dayTargets = [{ muscleSlug: 'shoulders', role: 'primary', sets: 14 }, { muscleSlug: 'rear_delts', role: 'primary', sets: 4 }];
          dayExercises = [
            { exId: exIds.ohp, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 120 },
            { exId: exIds.arnoldPress, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.latRaise, sets: 4, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.facePull, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 }
          ];
        } else if (dName.includes('arms')) {
          dayTargets = [{ muscleSlug: 'biceps', role: 'primary', sets: 9 }, { muscleSlug: 'triceps', role: 'primary', sets: 9 }];
          dayExercises = [
            { exId: exIds.bicepCurl, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 60 },
            { exId: exIds.skullcrusher, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 60 },
            { exId: exIds.hammerCurl, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 },
            { exId: exIds.tricepPushdown, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 }
          ];
        } else {
          dayTargets = [
            { muscleSlug: 'quads', role: 'primary', sets: 8 },
            { muscleSlug: 'hamstrings', role: 'primary', sets: 6 },
            { muscleSlug: 'calves', role: 'secondary', sets: 4 }
          ];
          dayExercises = [
            { exId: exIds.squat, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 180 },
            { exId: exIds.legPress, sets: 4, minReps: 10, maxReps: 12, rir: 1, rest: 90 },
            { exId: exIds.legExtension, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.legCurl, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.calfRaise, sets: 4, minReps: 12, maxReps: 15, rir: 1, rest: 60 }
          ];
        }
      }

      // ─── 5x5 STRENGTH ───
      else if (pName.includes('5x5') || pName.includes('5×5')) {
        if (dName.includes('workout a')) {
          dayTargets = [{ muscleSlug: 'quads', role: 'primary', sets: 5 }, { muscleSlug: 'chest', role: 'primary', sets: 5 }, { muscleSlug: 'back', role: 'primary', sets: 5 }];
          dayExercises = [
            { exId: exIds.squat, sets: 5, minReps: 5, maxReps: 5, rir: 2, rest: 180 },
            { exId: exIds.benchPress, sets: 5, minReps: 5, maxReps: 5, rir: 2, rest: 180 },
            { exId: exIds.barbellRow, sets: 5, minReps: 5, maxReps: 5, rir: 2, rest: 150 }
          ];
        } else {
          dayTargets = [{ muscleSlug: 'quads', role: 'primary', sets: 5 }, { muscleSlug: 'shoulders', role: 'primary', sets: 5 }, { muscleSlug: 'hamstrings', role: 'primary', sets: 5 }];
          dayExercises = [
            { exId: exIds.squat, sets: 5, minReps: 5, maxReps: 5, rir: 2, rest: 180 },
            { exId: exIds.ohp, sets: 5, minReps: 5, maxReps: 5, rir: 2, rest: 180 },
            { exId: exIds.deadlift, sets: 1, minReps: 5, maxReps: 5, rir: 2, rest: 180 }
          ];
        }
      }

      // ─── ARNOLD / PHAT / OTHER ───
      else {
        if (dName.includes('chest') || dName.includes('upper') || dName.includes('push')) {
          dayTargets = [{ muscleSlug: 'chest', role: 'primary', sets: 7 }, { muscleSlug: 'shoulders', role: 'secondary', sets: 4 }];
          dayExercises = [
            { exId: exIds.benchPress, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 120 },
            { exId: exIds.inclineDbPress, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.latRaise, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.tricepPushdown, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 }
          ];
        } else if (dName.includes('back') || dName.includes('pull')) {
          dayTargets = [{ muscleSlug: 'back', role: 'primary', sets: 7 }, { muscleSlug: 'biceps', role: 'secondary', sets: 4 }];
          dayExercises = [
            { exId: exIds.barbellRow, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 120 },
            { exId: exIds.latPulldown, sets: 3, minReps: 8, maxReps: 10, rir: 1, rest: 90 },
            { exId: exIds.facePull, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 },
            { exId: exIds.bicepCurl, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 }
          ];
        } else {
          dayTargets = [{ muscleSlug: 'quads', role: 'primary', sets: 7 }, { muscleSlug: 'hamstrings', role: 'primary', sets: 6 }, { muscleSlug: 'calves', role: 'secondary', sets: 4 }];
          dayExercises = [
            { exId: exIds.squat, sets: 4, minReps: 6, maxReps: 8, rir: 2, rest: 180 },
            { exId: exIds.legPress, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 90 },
            { exId: exIds.legCurl, sets: 3, minReps: 10, maxReps: 12, rir: 1, rest: 60 },
            { exId: exIds.calfRaise, sets: 3, minReps: 12, maxReps: 15, rir: 1, rest: 60 }
          ];
        }
      }

      // Insert Day Exercises
      for (let eIdx = 0; eIdx < dayExercises.length; eIdx++) {
        const item = dayExercises[eIdx];
        await supabase.from('program_day_exercises').insert({
          program_day_id: day.id,
          exercise_id: item.exId,
          order_index: eIdx,
          target_sets: item.sets,
          target_rep_min: item.minReps,
          target_rep_max: item.maxReps,
          target_rir: item.rir,
          rest_seconds: item.rest
        });
      }

      // Insert Day Targets
      for (const t of dayTargets) {
        const mId = muscleMap[t.muscleSlug] || Object.values(muscleMap)[0];
        if (mId) {
          await supabase.from('training_day_targets').insert({
            program_day_id: day.id,
            muscle_id: mId,
            role: t.role,
            target_sets: t.sets
          });
        }
      }

      console.log(`  - Configured day: ${day.name} (${dayExercises.length} exercises, ${dayTargets.length} targets)`);
    }
  }

  console.log('\n--- SEEDING COMPLETED SUCCESSFULLY! ---');
}

seed().catch(console.error);
