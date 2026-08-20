/**
 * scripts/generate-exercises.ts
 * Generate exercise JSON files from ExerciseLibrary slug-map
 * 
 * Video CDN: https://pub-51593a4f184f42908b6377b56bf19486.r2.dev/male/{id}01.mp4
 */

import fs from 'fs';
import path from 'path';

// Paths
const SLUG_MAP_PATH = path.join(__dirname, '.exerciselibrary-slug-map.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'exercises');
const BATCH_OUTPUT_PATH = path.join(__dirname, '..', 'data', 'exercise-batches.json');

// Video CDN base URL
const VIDEO_CDN = 'https://pub-51593a4f184f42908b6377b56bf19486.r2.dev/male';

// Load slug map
interface SlugMap {
  [slug: string]: string;
}

interface Exercise {
  slug: string;
  name: string;
  name_vi: string | null;
  video_id: string;
  video_url: string;
  primary_muscle: string | null;
  secondary_muscles: string[] | null;
  equipment: string[] | null;
  difficulty: string | null;
  movement_pattern: string | null;
  tags: string[];
  // LLM-generated fields (to be filled)
  subtitle_vi: string | null;
  goal_vi: string | null;
  instructions: string[] | null;
  tips: string[] | null;
  common_mistakes: string[] | null;
  setup: {
    sets: string | null;
    reps: string | null;
    rir: string | null;
    rest_seconds: number | null;
    tempo: string | null;
  };
  safety_vi: string | null;
  media_metadata: {
    version: string;
    last_updated: string;
    source: string;
    language: string;
  };
}

function loadSlugMap(): SlugMap {
  const data = fs.readFileSync(SLUG_MAP_PATH, 'utf-8');
  return JSON.parse(data);
}

function formatVideoUrl(id: string): string {
  const paddedId = String(id).padStart(6, '0');
  return `${VIDEO_CDN}/${paddedId}01.mp4`;
}

function formatName(slug: string): string {
  // Convert slug to readable name
  // e.g., "barbell-bench-press" -> "Barbell Bench Press"
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function inferMuscleGroup(slug: string): { primary: string | null; equipment: string[] } {
  const slugLower = slug.toLowerCase();
  
  // Equipment detection
  const equipment: string[] = [];
  if (slugLower.includes('barbell')) equipment.push('Thanh đòn', 'Tạ đĩa');
  if (slugLower.includes('dumbbell') || slugLower.includes('db-')) equipment.push('Tạ đôi');
  if (slugLower.includes('cable')) equipment.push('Cable machine');
  if (slugLower.includes('machine') || slugLower.includes('lever-')) equipment.push('Máy tập');
  if (slugLower.includes('kettlebell') || slugLower.includes('kb-')) equipment.push('Kettlebell');
  if (slugLower.includes('band') || slugLower.includes('banded')) equipment.push('Dây kháng lực');
  if (slugLower.includes('bodyweight') || slugLower.includes('push-up') || slugLower.includes('pull-up') || slugLower.includes('dip')) equipment.push('Bodyweight');
  if (slugLower.includes('smith')) equipment.push('Smith machine');
  if (slugLower.includes('smith') || slugLower.includes('sled')) equipment.push('Sled');
  if (equipment.length === 0) equipment.push('Khác');
  
  // Muscle group detection
  let primary: string | null = null;
  
  if (slugLower.includes('chest') || slugLower.includes('bench') || slugLower.includes('pec') || slugLower.includes('fly')) {
    primary = 'Ngực';
  } else if (slugLower.includes('back') || slugLower.includes('row') || slugLower.includes('lat') || slugLower.includes('pull') || slugLower.includes('rear-delt')) {
    primary = 'Lưng';
  } else if (slugLower.includes('shoulder') || slugLower.includes('delt') || slugLower.includes('press') || slugLower.includes('raise') || slugLower.includes('ohp')) {
    primary = 'Vai';
  } else if (slugLower.includes('bicep') || slugLower.includes('curl') || slugLower.includes('hammer')) {
    primary = 'Tay trước (Biceps)';
  } else if (slugLower.includes('tricep') || slugLower.includes('pushdown') || slugLower.includes('extension') || slugLower.includes('skull')) {
    primary = 'Tay sau (Triceps)';
  } else if (slugLower.includes('squat') || slugLower.includes('quad') || slugLower.includes('leg-press') || slugLower.includes('leg-extension') || slugLower.includes('lunge') || slugLower.includes('bulgarian')) {
    primary = 'Chân trước (Quadriceps)';
  } else if (slugLower.includes('ham') || slugLower.includes('rdl') || slugLower.includes('leg-curl') || slugLower.includes('stiff-leg')) {
    primary = 'Đùi sau (Hamstrings)';
  } else if (slugLower.includes('glute') || slugLower.includes('hip') || slugLower.includes('thrust') || slugLower.includes('bridge')) {
    primary = 'Mông (Glutes)';
  } else if (slugLower.includes('calf') || slugLower.includes('calves')) {
    primary = 'Bắp chân (Calves)';
  } else if (slugLower.includes('abs') || slugLower.includes('abdominal') || slugLower.includes('crunch') || slugLower.includes('plank') || slugLower.includes('core')) {
    primary = 'Bụng (Core)';
  } else if (slugLower.includes('oblique') || slugLower.includes('russian-twist') || slugLower.includes('side-bend')) {
    primary = 'Bụng xiên (Obliques)';
  } else if (slugLower.includes('forearm') || slugLower.includes('wrist')) {
    primary = 'Cẳng tay';
  } else if (slugLower.includes('deadlift') || slugLower.includes('good-morning')) {
    primary = 'Lưng dưới';
  }
  
  return { primary, equipment };
}

function inferDifficulty(slug: string): string {
  const slugLower = slug.toLowerCase();
  if (slugLower.includes('advanced') || slugLower.includes('expert')) return 'advanced';
  if (slugLower.includes('single-leg') || slugLower.includes('single-arm') || slugLower.includes('one-leg') || slugLower.includes('one-arm')) return 'intermediate';
  if (slugLower.includes('assisted') || slugLower.includes('beginner') || slugLower.includes('basic')) return 'beginner';
  return 'intermediate';
}

function inferMovementPattern(slug: string): string {
  const slugLower = slug.toLowerCase();
  if (slugLower.includes('squat') || slugLower.includes('leg-press') || slugLower.includes('lunge')) return 'squat';
  if (slugLower.includes('hinge') || slugLower.includes('deadlift') || slugLower.includes('rdl') || slugLower.includes('good-morning')) return 'hinge';
  if (slugLower.includes('row') || slugLower.includes('pull') || slugLower.includes('curl')) return 'pull';
  if (slugLower.includes('press') || slugLower.includes('push') || slugLower.includes('fly')) return 'push';
  if (slugLower.includes('carry') || slugLower.includes('walk')) return 'carry';
  if (slugLower.includes('rotation') || slugLower.includes('twist')) return 'rotation';
  if (slugLower.includes('crunch') || slugLower.includes('plank') || slugLower.includes('ab')) return 'anti-extension';
  return 'isolation';
}

function generateTags(slug: string, primaryMuscle: string | null): string[] {
  const tags: string[] = [];
  const slugLower = slug.toLowerCase();
  
  // Movement pattern tags
  if (slugLower.includes('squat') || slugLower.includes('lunge')) tags.push('Squat', 'Đa khớp');
  if (slugLower.includes('hinge') || slugLower.includes('deadlift')) tags.push('Hinge', 'Đa khớp');
  if (slugLower.includes('row') || slugLower.includes('pull')) tags.push('Pull', 'Đa khớp');
  if (slugLower.includes('press') || slugLower.includes('push')) tags.push('Push', 'Đa khớp');
  if (slugLower.includes('isolation') || slugLower.includes('curl') || slugLower.includes('raise')) tags.push('Isolation', 'Đơn khớp');
  
  // Equipment tags
  if (slugLower.includes('barbell')) tags.push('Thanh đòn');
  if (slugLower.includes('dumbbell')) tags.push('Tạ đôi');
  if (slugLower.includes('cable')) tags.push('Cable');
  if (slugLower.includes('machine') || slugLower.includes('lever-')) tags.push('Máy tập');
  if (slugLower.includes('kettlebell')) tags.push('Kettlebell');
  if (slugLower.includes('bodyweight') || slugLower.includes('push-up') || slugLower.includes('pull-up')) tags.push('Bodyweight');
  if (slugLower.includes('smith')) tags.push('Smith machine');
  
  // Muscle group tags
  if (primaryMuscle) tags.push(primaryMuscle);
  
  // Difficulty tags
  if (slugLower.includes('assisted')) tags.push('Người mới');
  
  return [...new Set(tags)]; // Remove duplicates
}

function createExercise(slug: string, videoId: string): Exercise {
  const { primary, equipment } = inferMuscleGroup(slug);
  const name = formatName(slug);
  const difficulty = inferDifficulty(slug);
  const movementPattern = inferMovementPattern(slug);
  const tags = generateTags(slug, primary);
  
  return {
    slug,
    name,
    name_vi: null,
    video_id: videoId,
    video_url: formatVideoUrl(videoId),
    primary_muscle: primary,
    secondary_muscles: null,
    equipment,
    difficulty,
    movement_pattern: movementPattern,
    tags,
    subtitle_vi: null,
    goal_vi: null,
    instructions: null,
    tips: null,
    common_mistakes: null,
    setup: {
      sets: null,
      reps: null,
      rir: null,
      rest_seconds: null,
      tempo: null,
    },
    safety_vi: null,
    media_metadata: {
      version: '1.0.0',
      last_updated: new Date().toISOString().split('T')[0],
      source: 'ExerciseLibrary.app',
      language: 'vi',
    },
  };
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  console.log('=== GymAI Exercise Generator ===\n');
  
  // Load slug map
  console.log('Loading slug map...');
  const slugMap = loadSlugMap();
  const entries = Object.entries(slugMap);
  console.log(`Found ${entries.length} exercises in slug map\n`);
  
  // Generate exercises
  console.log('Generating exercise data...');
  const exercises: Exercise[] = entries.map(([slug, videoId]) => 
    createExercise(slug, videoId)
  );
  
  // Group by muscle for batch processing
  const muscleGroups: { [key: string]: Exercise[] } = {};
  exercises.forEach(ex => {
    const muscle = ex.primary_muscle || 'Khác';
    if (!muscleGroups[muscle]) muscleGroups[muscle] = [];
    muscleGroups[muscle].push(ex);
  });
  
  // Create batches of 5 for LLM processing
  const batchSize = 5;
  const allBatches: Exercise[][] = [];
  
  Object.entries(muscleGroups).forEach(([muscle, exs]) => {
    const chunks = chunkArray(exs, batchSize);
    chunks.forEach((chunk, idx) => {
      allBatches.push(chunk);
    });
  });
  
  // Save batches for LLM processing
  const batchesData = allBatches.map((batch, idx) => ({
    batch_id: idx + 1,
    exercises: batch.map(ex => ({
      slug: ex.slug,
      name: ex.name,
      name_vi: ex.name_vi,
      video_url: ex.video_url,
      primary_muscle: ex.primary_muscle,
      secondary_muscles: ex.secondary_muscles,
      equipment: ex.equipment,
      difficulty: ex.difficulty,
      movement_pattern: ex.movement_pattern,
      tags: ex.tags,
    })),
  }));
  
  // Save batches to file
  fs.writeFileSync(BATCH_OUTPUT_PATH, JSON.stringify(batchesData, null, 2));
  console.log(`\nCreated ${allBatches.length} batches (${batchSize} exercises each)`);
  console.log(`Saved to: ${BATCH_OUTPUT_PATH}`);
  
  // Summary by muscle group
  console.log('\n=== Exercise Summary by Muscle Group ===');
  Object.entries(muscleGroups)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([muscle, exs]) => {
      console.log(`  ${muscle}: ${exs.length} exercises`);
    });
  
  // Save first batch as sample for review
  if (allBatches.length > 0) {
    const samplePath = path.join(__dirname, '..', 'data', 'exercise-batch-sample.json');
    fs.writeFileSync(samplePath, JSON.stringify(allBatches[0], null, 2));
    console.log(`\nSample batch saved to: ${samplePath}`);
  }
  
  console.log('\n=== Done ===');
  console.log('Next step: Use LLM to generate Vietnamese descriptions for each batch');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
