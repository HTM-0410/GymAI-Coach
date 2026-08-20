/**
 * scripts/test-llm-single-batch.ts
 * Test LLM call for a single batch of 5 exercises
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

interface ExerciseInput {
  slug: string;
  name: string;
  video_url: string;
  primary_muscle: string | null;
  equipment: string[];
  difficulty: string;
  movement_pattern: string;
  tags: string[];
}

interface Batch {
  batch_id: number;
  exercises: ExerciseInput[];
}

function generatePrompt(exercises: ExerciseInput[]): string {
  const exercisesList = exercises.map((ex, idx) => `
${idx + 1}. ${ex.name} (${ex.slug})
   - Video: ${ex.video_url}
   - Primary muscle: ${ex.primary_muscle || 'Not specified'}
   - Equipment: ${ex.equipment.join(', ')}
   - Difficulty: ${ex.difficulty}
`).join('\n');

  return `Bạn là một huấn luyện viên thể hình chuyên nghiệp. Hãy tạo mô tả tiếng Việt cho ${exercises.length} bài tập gym.

VỚI MỖI BÀI TẬP, hãy trả lời theo định dạng JSON sau (CHỈ JSON array, KHÔNG có text khác):

[
  {
    "slug": "ten-slug",
    "name": "Tên tiếng Anh",
    "name_vi": "Tên tiếng Việt phù hợp và tự nhiên",
    "subtitle_vi": "Mô tả ngắn 1-2 dòng về bài tập",
    "goal_vi": "Mục tiêu của bài tập, giải thích ngắn gọn tại sao nên tập bài này",
    "instructions": ["Bước 1: ...", "Bước 2: ...", "Bước 3: ..."],
    "tips": ["Tip 1", "Tip 2"],
    "common_mistakes": ["Lỗi 1", "Lỗi 2"],
    "safety_vi": "Cảnh báo an toàn ngắn gọn",
    "setup": {
      "sets": "3-4",
      "reps": "8-12",
      "rir": "2",
      "rest_seconds": 90,
      "tempo": "2-0-1-0"
    }
  }
]

DANH SÁCH BÀI TẬP:
${exercisesList}

QUY TẮC:
1. Trả lời bằng MỘT JSON array chứa đúng ${exercises.length} bài tập
2. CHỈ JSON, KHÔNG có markdown code block
3. name_vi phải tự nhiên, phổ biến trong cộng đồng gym Việt Nam

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

function parseLLMResponse(response: string, exercises: ExerciseInput[]) {
  let jsonStr = response.trim();
  
  // Remove markdown code blocks
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
  else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    console.error('Failed to parse LLM response:', e);
    console.log('Raw response:', jsonStr.slice(0, 500));
    return [];
  }
}

function saveExercise(exercise: any, original: ExerciseInput) {
  const output = {
    slug: exercise.slug || original.slug,
    name: exercise.name || original.name,
    name_vi: exercise.name_vi || original.name,
    subtitle_vi: exercise.subtitle_vi || '',
    video_url: original.video_url,
    primary_muscle: exercise.primary_muscle || original.primary_muscle || 'Khác',
    secondary_muscles: exercise.secondary_muscles || [],
    equipment: exercise.equipment || original.equipment,
    difficulty: exercise.difficulty || original.difficulty,
    movement_pattern: exercise.movement_pattern || original.movement_pattern,
    tags: exercise.tags || original.tags,
    goal_vi: exercise.goal_vi || '',
    instructions: exercise.instructions || [],
    tips: exercise.tips || [],
    common_mistakes: exercise.common_mistakes || [],
    safety_vi: exercise.safety_vi || '',
    setup: {
      sets: exercise.setup?.sets || '3-4',
      reps: exercise.setup?.reps || '8-12',
      rir: exercise.setup?.rir || '2',
      rest_seconds: exercise.setup?.rest_seconds || 90,
      tempo: exercise.setup?.tempo || '2-0-1-0',
    },
    media_metadata: {
      version: '1.0.0',
      last_updated: new Date().toISOString().split('T')[0],
      source: 'ExerciseLibrary.app + Gemini AI',
      language: 'vi',
    },
  };

  const filePath = path.join(OUTPUT_DIR, `${output.slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  return output;
}

async function main() {
  console.log('=== Test LLM Single Batch ===\n');
  
  // Load first batch
  const batches: Batch[] = JSON.parse(fs.readFileSync(BATCHES_PATH, 'utf-8'));
  const batch = batches[0];
  
  console.log(`Processing batch ${batch.batch_id} (${batch.exercises.length} exercises)...`);
  console.log('Exercises:', batch.exercises.map(e => e.name).join(', '));
  
  const prompt = generatePrompt(batch.exercises);
  console.log('\nCalling Gemini API...');
  
  try {
    const response = await callGemini(prompt);
    console.log('\n=== LLM Response ===');
    console.log(response.slice(0, 1000) + '...');
    console.log('\n=== Parsing ===');
    
    const parsed = parseLLMResponse(response, batch.exercises);
    console.log(`Parsed ${parsed.length} exercises\n`);
    
    // Save each exercise
    parsed.forEach((ex: any, idx: number) => {
      const original = batch.exercises[idx];
      const saved = saveExercise(ex, original);
      console.log(`✓ ${saved.name_vi} (${saved.slug})`);
      console.log(`  - Instructions: ${saved.instructions?.length || 0} steps`);
      console.log(`  - Tips: ${saved.tips?.length || 0}`);
    });
    
    console.log('\n=== Done ===');
    console.log(`Saved to: ${OUTPUT_DIR}`);
  } catch (e) {
    console.error('Error:', e);
  }
}

main();
