/**
 * scripts/batch-llm-processor.ts
 * Process exercise batches using Gemini API
 * 
 * Takes exercises from exercise-batches.json and generates Vietnamese descriptions
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

// Paths
const BATCHES_PATH = path.join(__dirname, '..', 'data', 'exercise-batches.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'exercises');

// Gemini API config
const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY is required');
const GEMINI_MODEL = 'gemini-3.5-flash-lite';

// Exercise type matching the generator
interface ExerciseInput {
  slug: string;
  name: string;
  video_url: string;
  primary_muscle: string | null;
  secondary_muscles: string[] | null;
  equipment: string[];
  difficulty: string;
  movement_pattern: string;
  tags: string[];
}

interface Batch {
  batch_id: number;
  exercises: ExerciseInput[];
}

interface ExerciseOutput {
  slug: string;
  name: string;
  name_vi: string;
  subtitle_vi: string;
  video_url: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string[];
  difficulty: string;
  movement_pattern: string;
  tags: string[];
  goal_vi: string;
  instructions: string[];
  tips: string[];
  common_mistakes: string[];
  safety_vi: string;
  setup: {
    sets: string;
    reps: string;
    rir: string;
    rest_seconds: number;
    tempo: string;
  };
  media_metadata: {
    version: string;
    last_updated: string;
    source: string;
    language: string;
  };
}

function generatePrompt(exercises: ExerciseInput[]): string {
  const exercisesList = exercises.map((ex, idx) => `
${idx + 1}. ${ex.name} (${ex.slug})
   - Video: ${ex.video_url}
   - Primary muscle: ${ex.primary_muscle || 'Not specified'}
   - Equipment: ${ex.equipment.join(', ')}
   - Difficulty: ${ex.difficulty}
   - Movement pattern: ${ex.movement_pattern}
`).join('\n');

  return `Bạn là một huấn luyện viên thể hình chuyên nghiệp. Hãy tạo mô tả tiếng Việt cho ${exercises.length} bài tập gym.

VỚI MỖI BÀI TẬP, hãy trả lời theo định dạng JSON sau (CHỈ JSON, KHÔNG có text khác):

{
  "slug": "tên-slug",
  "name": "Tên tiếng Anh",
  "name_vi": "Tên tiếng Việt phù hợp và tự nhiên (KHÔNG chú thích tiếng Anh)",
  "subtitle_vi": "Mô tả ngắn 1-2 dòng về bài tập bằng tiếng Việt thuần túy",
  "goal_vi": "Mục tiêu của bài tập, giải thích ngắn gọn tại sao nên tập bài này (tiếng Việt thuần túy)",
  "instructions": [
    "Bước 1: Mô tả chi tiết bước thực hiện bằng tiếng Việt (không chú thích tiếng Anh)",
    "Bước 2: Mô tả chi tiết bước thực hiện bằng tiếng Việt (không chú thích tiếng Anh)",
    "Bước 3: Mô tả chi tiết bước thực hiện bằng tiếng Việt (không chú thích tiếng Anh)",
    "Bước 4: Mô tả chi tiết bước thực hiện bằng tiếng Việt (không chú thích tiếng Anh)"
  ],
  "tips": [
    "Mẹo 1 bằng tiếng Việt thuần túy",
    "Mẹo 2 bằng tiếng Việt thuần túy"
  ],
  "common_mistakes": [
    "Lỗi 1 bằng tiếng Việt thuần túy",
    "Lỗi 2 bằng tiếng Việt thuần túy"
  ],
  "safety_vi": "Cảnh báo an toàn bằng tiếng Việt thuần túy",
  "setup": {
    "sets": "3-4",
    "reps": "8-12",
    "rir": "2",
    "rest_seconds": 90,
    "tempo": "2-0-1-0"
  }
}

DANH SÁCH BÀI TẬP:
${exercisesList}

QUY TẮC QUAN TRỌNG:
1. TẤT CẢ các trường tiếng Việt (name_vi, subtitle_vi, goal_vi, instructions, tips, common_mistakes, safety_vi) phải là TIẾNG VIỆT THUẦN TÚY
2. KHÔNG được chú thích tiếng Anh trong ngoặc đơn, ngoặc kép, hay bất kỳ đâu
3. KHÔNG viết "vd.", "ví dụ", "VD:", "tức là", "còn gọi là" kèm tiếng Anh
4. Nếu cần dùng thuật ngữ kỹ thuật, hãy dịch hoặc giải thích bằng tiếng Việt
5. instructions phải chi tiết, có số bước cụ thể (4-5 bước)
6. Trả lời bằng MỘT JSON array chứa tất cả ${exercises.length} bài tập

Trả lời (CHỈ JSON):`;
}

async function callGemini(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
            resolve(text || '');
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function parseLLMResponse(response: string, exercises: ExerciseInput[]): ExerciseOutput[] {
  // Try to extract JSON from response
  let jsonStr = response.trim();
  
  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    const results: ExerciseOutput[] = Array.isArray(parsed) ? parsed : [parsed];
    
    return results.map((item, idx) => {
      const original = exercises[idx] || exercises[0];
      return {
        slug: item.slug || original.slug,
        name: item.name || original.name,
        name_vi: item.name_vi || original.name,
        subtitle_vi: item.subtitle_vi || '',
        video_url: original.video_url,
        primary_muscle: item.primary_muscle || original.primary_muscle || 'Khác',
        secondary_muscles: item.secondary_muscles || original.secondary_muscles || [],
        equipment: item.equipment || original.equipment,
        difficulty: item.difficulty || original.difficulty,
        movement_pattern: item.movement_pattern || original.movement_pattern,
        tags: item.tags || original.tags,
        goal_vi: item.goal_vi || '',
        instructions: item.instructions || [],
        tips: item.tips || [],
        common_mistakes: item.common_mistakes || [],
        safety_vi: item.safety_vi || '',
        setup: {
          sets: item.setup?.sets || '3-4',
          reps: item.setup?.reps || '8-12',
          rir: item.setup?.rir || '2',
          rest_seconds: item.setup?.rest_seconds || 90,
          tempo: item.setup?.tempo || '2-0-1-0',
        },
        media_metadata: {
          version: '1.0.0',
          last_updated: new Date().toISOString().split('T')[0],
          source: 'ExerciseLibrary.app + Gemini AI',
          language: 'vi',
        },
      };
    });
  } catch (e) {
    console.error('Failed to parse LLM response:', e);
    console.log('Raw response:', jsonStr.slice(0, 500));
    return [];
  }
}

function saveExercise(exercise: ExerciseOutput) {
  const filePath = path.join(OUTPUT_DIR, `${exercise.slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(exercise, null, 2));
}

async function processBatch(batch: Batch, totalBatches: number): Promise<ExerciseOutput[]> {
  console.log(`\nProcessing batch ${batch.batch_id}/${totalBatches} (${batch.exercises.length} exercises)...`);
  
  const prompt = generatePrompt(batch.exercises);
  console.log(`  Calling Gemini API (${GEMINI_MODEL})...`);
  
  try {
    const response = await callGemini(prompt);
    const exercises = parseLLMResponse(response, batch.exercises);
    
    if (exercises.length === 0) {
      console.log(`  ⚠️ Failed to parse response, skipping batch`);
      return [];
    }
    
    console.log(`  ✓ Generated ${exercises.length} exercises`);
    
    // Save each exercise
    exercises.forEach(ex => {
      saveExercise(ex);
      console.log(`    - ${ex.name_vi} (${ex.slug})`);
    });
    
    return exercises;
  } catch (e) {
    console.error(`  ✗ Error: ${e}`);
    return [];
  }
}

// Entry point
async function main() {
  console.log('=== GymAI Batch LLM Processor ===\n');
  
  if (!GEMINI_KEY) {
    console.error('Error: GEMINI_API_KEY not found in environment');
    console.log('Please set GEMINI_API_KEY in .env.local or environment');
    process.exit(1);
  }
  
  // Load batches
  console.log('Loading batches...');
  const batches: Batch[] = JSON.parse(fs.readFileSync(BATCHES_PATH, 'utf-8'));
  console.log(`Found ${batches.length} batches\n`);
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Process each batch
  const allResults: ExerciseOutput[] = [];
  
  for (const batch of batches) {
    const results = await processBatch(batch, batches.length);
    allResults.push(...results);
    
    // Rate limit: wait 2 seconds between batches
    if (batch.batch_id < batches.length) {
      console.log(`  Waiting 2s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total exercises generated: ${allResults.length}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  
  // Count by muscle group
  const byMuscle: { [key: string]: number } = {};
  allResults.forEach(ex => {
    const muscle = ex.primary_muscle;
    byMuscle[muscle] = (byMuscle[muscle] || 0) + 1;
  });
  
  console.log('\nBy muscle group:');
  Object.entries(byMuscle)
    .sort((a, b) => b[1] - a[1])
    .forEach(([muscle, count]) => {
      console.log(`  ${muscle}: ${count}`);
    });
  
  console.log('\n=== Done ===');
}

main().catch(console.error);
