// Admin tool: AI tạo content cho 1 exercise (description/instructions/tips/mistakes)

import { z } from 'zod';
import { callGemini } from './gemini';

export const ExerciseContentSchema = z.object({
  description: z.string(),
  instructions: z.array(z.string()).min(3).max(10),
  tips: z.array(z.string()).min(1).max(8),
  common_mistakes: z.array(z.string()).min(1).max(8),
  suggested_equipment: z.array(z.string()),
  suggested_primary_muscles: z.array(z.string()),
  suggested_secondary_muscles: z.array(z.string()).default([]),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  exercise_type: z.enum(['compound', 'isolation']),
  default_rest_seconds: z.number().int().min(30).max(300).default(120),
  default_rir: z.number().int().min(0).max(5).default(2),
});
export type ExerciseContent = z.infer<typeof ExerciseContentSchema>;

export async function generateExerciseContent(
  name: string, catalogHint?: { equipment?: string[]; muscles?: string[] }
): Promise<ExerciseContent> {
  const hint = catalogHint
    ? `\nContext: equipment phổ biến cho bài này: ${catalogHint.equipment?.join(', ') ?? '?'}; nhóm cơ thường liên quan: ${catalogHint.muscles?.join(', ') ?? '?'}`
    : '';

  const prompt = `Bạn là HLV thể hình. Tạo nội dung chi tiết cho bài tập: "${name}".${hint}

Trả về JSON (tiếng Việt):
{
  "description": "mô tả 1-2 câu",
  "instructions": ["bước 1", "bước 2", ...]   (5-8 bước),
  "tips": ["tip 1", ...] (3-5 tips),
  "common_mistakes": ["lỗi 1", ...] (3-5 lỗi),
  "suggested_equipment": ["equipment slug", ...] (vd ["barbell", "bench"]),
  "suggested_primary_muscles": ["chest"],
  "suggested_secondary_muscles": ["triceps", "shoulder_front"],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "exercise_type": "compound" | "isolation",
  "default_rest_seconds": 90-180,
  "default_rir": 1-3
}`;

  const raw = await callGemini({ prompt, jsonSchema: true, temperature: 0.4, maxOutputTokens: 1200 });
  return ExerciseContentSchema.parse(JSON.parse(raw));
}