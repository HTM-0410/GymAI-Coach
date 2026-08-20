import { callGemini } from './gemini';
import { WorkoutPlanSchema, type WorkoutPlan } from './schema';
import { buildContext, candidateExercises } from './context';
import {
  availableDumbbellWeights,
  formatDumbbellInventory,
  nearestDumbbellWeight,
} from '@/lib/dumbbell-inventory';

type Args = {
  userId: string;
  profile: any;
  programDayId: string;
  gymId: string | null;
  durationMinutes: number;
};

export async function generateWorkoutPlan(args: Args): Promise<WorkoutPlan> {
  const c = await buildContext(args);
  const candidates = await candidateExercises(args, c);

  const targetMuscles = ((c.programDay as any)?.training_day_targets ?? [])
    .map((t: any) => `${t.muscles?.name_vi}(${t.role}=${t.target_sets}set)`).join(', ');

  const recentStr = (c.recentSets as any[]).slice(0, 10).map((s) =>
    `${s.workout_exercises?.exercises?.slug}:${s.weight}x${s.reps}@${s.rir ?? '?'}RIR`).join('; ');

  const candidateList = candidates.map((e: any) =>
    `- ${e.slug} (${e.name_vi}, ${e.difficulty}, ${e.exercise_type}; thiết bị: ${(e.equipment_slugs ?? []).join(', ') || 'không dụng cụ'})`
  ).join('\n');

  const prompt = `Bạn là AI personal trainer. Tạo 1 buổi tập cho user với thông tin:

USER: ${args.profile.display_name}
Kinh nghiệm: ${args.profile.experience_level}
Mục tiêu: ${args.profile.goal}
Thời gian: ${args.durationMinutes} phút
Gym equipment: ${c.gymEquipment.join(', ') || 'unrestricted'}
Kho tạ đơn: ${formatDumbbellInventory(c.dumbbellInventory)}

HÔM NAY: ${(c.programDay as any)?.name} - ${(c.programDay as any)?.training_programs?.name}
Nhóm cơ target: ${targetMuscles}

BUỔI GẦN ĐÂY: ${recentStr || 'chưa có'}

CANDIDATE EXERCISES (chỉ chọn từ list này):
${candidateList}

YÊU CẦU:
- Chọn 4-7 bài phù hợp với nhóm cơ + equipment
- Tổng sets phù hợp thời gian (4-6 phút/set)
- Target reps phù hợp mục tiêu (${args.profile.goal})
- RIR đề xuất (1-3)
- Rest seconds (60-180s compound, 60-90s isolation)
- Với bài dùng dumbbell: target_weight là kg của MỖI QUẢ và chỉ được lấy từ kho tạ đơn bên trên. Mức chỉ có 1 quả chỉ phù hợp bài tập luân phiên từng bên. Nếu kho chưa khai báo hoặc chưa có lịch sử phù hợp, trả target_weight = null
- Với bài không dùng dumbbell: target_weight = null
- Mỗi bài kèm 1 câu lý do ngắn (ai_reason)

Trả về JSON schema:
{
  "exercises": [
    { "exercise_slug": "...", "target_sets": N, "target_rep_min": N, "target_rep_max": N, "target_weight": N hoặc null, "target_rir": N, "rest_seconds": N, "ai_reason": "..." }
  ]
}`;

  const raw = await callGemini({ prompt, jsonSchema: true, temperature: 0.5, maxOutputTokens: 1500 });
  const parsed = WorkoutPlanSchema.parse(JSON.parse(raw));
  const weights = availableDumbbellWeights(c.dumbbellInventory);
  const candidateMap = new Map(candidates.map((candidate: any) => [candidate.slug, candidate]));
  const recentWeightMap = new Map<string, number>();
  (c.recentSets as any[]).forEach((set) => {
    const slug = set.workout_exercises?.exercises?.slug;
    const value = Number(set.weight);
    if (slug && value > 0 && !recentWeightMap.has(slug)) recentWeightMap.set(slug, value);
  });

  return {
    exercises: parsed.exercises.map((exercise) => {
      const candidate: any = candidateMap.get(exercise.exercise_slug);
      const usesDumbbell = candidate?.equipment_slugs?.includes('dumbbell');
      if (!usesDumbbell || weights.length === 0) return { ...exercise, target_weight: null };

      const desired = exercise.target_weight ?? recentWeightMap.get(exercise.exercise_slug);
      return {
        ...exercise,
        target_weight: desired ? nearestDumbbellWeight(desired, weights) : null,
      };
    }),
  };
}
