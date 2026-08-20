/**
 * scripts/validate-exercises.ts
 * Validate exercise JSON files and check video URLs
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

const EXERCISES_DIR = path.join(__dirname, '..', 'data', 'exercises');

interface Exercise {
  slug: string;
  name: string;
  name_vi: string | null;
  video_url: string;
  primary_muscle: string | null;
  equipment: string[] | null;
  difficulty: string | null;
  goal_vi: string | null;
  instructions: string[] | null;
  tips: string[] | null;
  common_mistakes: string[] | null;
  safety_vi: string | null;
  setup: {
    sets: string | null;
    reps: string | null;
    rir: string | null;
    rest_seconds: number | null;
    tempo: string | null;
  };
}

function validateExercise(ex: any, filePath: string): string[] {
  const errors: string[] = [];
  
  if (!ex.slug) errors.push('Missing slug');
  if (!ex.name) errors.push('Missing name');
  if (!ex.video_url) errors.push('Missing video_url');
  if (!ex.primary_muscle) errors.push('Missing primary_muscle');
  if (!ex.goal_vi) errors.push('Missing goal_vi');
  if (!Array.isArray(ex.instructions) || ex.instructions.length < 3) {
    errors.push(`Invalid instructions: ${ex.instructions?.length || 0} steps`);
  }
  if (!Array.isArray(ex.tips) || ex.tips.length < 1) {
    errors.push(`Invalid tips: ${ex.tips?.length || 0}`);
  }
  if (!ex.safety_vi) errors.push('Missing safety_vi');
  if (!ex.setup) errors.push('Missing setup');
  
  return errors;
}

async function checkVideoUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'HEAD'
      };
      
      const req = https.request(options, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.end();
    } catch {
      resolve(false);
    }
  });
}

async function main() {
  console.log('=== Exercise Validation ===\n');
  
  const files = fs.readdirSync(EXERCISES_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} exercise files\n`);
  
  const stats = {
    total: files.length,
    valid: 0,
    missingNameVi: 0,
    missingGoal: 0,
    missingInstructions: 0,
    missingTips: 0,
    missingSafety: 0,
    videoChecked: 0,
    videoWorking: 0,
  };
  
  const sample: Exercise[] = [];
  
  // Validate first 20 files in detail
  const filesToCheck = Math.min(20, files.length);
  console.log(`Validating ${filesToCheck} sample files...\n`);
  
  for (let i = 0; i < filesToCheck; i++) {
    const file = files[i];
    const filePath = path.join(EXERCISES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    try {
      const ex = JSON.parse(content);
      const errors = validateExercise(ex, filePath);
      
      if (errors.length === 0) {
        stats.valid++;
      }
      
      if (!ex.name_vi) stats.missingNameVi++;
      if (!ex.goal_vi) stats.missingGoal++;
      if (!ex.instructions || ex.instructions.length < 3) stats.missingInstructions++;
      if (!ex.tips || ex.tips.length < 1) stats.missingTips++;
      if (!ex.safety_vi) stats.missingSafety++;
      
      if (i < 5) {
        sample.push(ex);
      }
    } catch (e) {
      console.log(`✗ ${file}: Invalid JSON`);
    }
  }
  
  console.log('\n=== Stats ===');
  console.log(`Total files: ${stats.total}`);
  console.log(`Valid (sample): ${stats.valid}/${filesToCheck}`);
  console.log(`Missing name_vi: ${stats.missingNameVi}/${filesToCheck}`);
  console.log(`Missing goal_vi: ${stats.missingGoal}/${filesToCheck}`);
  console.log(`Missing instructions: ${stats.missingInstructions}/${filesToCheck}`);
  console.log(`Missing tips: ${stats.missingTips}/${filesToCheck}`);
  console.log(`Missing safety_vi: ${stats.missingSafety}/${filesToCheck}`);
  
  // Show sample
  console.log('\n=== Sample Exercises ===');
  sample.forEach((ex, idx) => {
    console.log(`\n${idx + 1}. ${ex.name_vi || ex.name}`);
    console.log(`   Primary: ${ex.primary_muscle}`);
    console.log(`   Goal: ${ex.goal_vi?.slice(0, 80)}...`);
    console.log(`   Instructions: ${ex.instructions?.length || 0} steps`);
    console.log(`   Tips: ${ex.tips?.length || 0}`);
    console.log(`   Safety: ${ex.safety_vi?.slice(0, 60)}...`);
  });
  
  console.log('\n=== Done ===');
}

main();
